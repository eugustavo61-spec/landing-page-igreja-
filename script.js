// script.js

document.addEventListener('DOMContentLoaded', () => {

    // Links compartilhados com #horarios devem abrir a página no início.
    if (window.location.hash === '#horarios') {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        window.scrollTo(0, 0);
    }
    
    // Controle do Menu Mobile
    const btnMenu = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if(btnMenu && menu) {
        btnMenu.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    }

    // Fechar menu mobile ao clicar em um link
    if (menu) {
        const mobileLinks = menu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.add('hidden');
            });
        });
    }

    carregarFotosInstagram();
    carregarAgenda();

});

function normalizarCabecalho(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function parseAgendaDate(value) {
    const text = value.trim();
    let year;
    let month;
    let day;
    let match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

    if (match) {
        day = Number(match[1]);
        month = Number(match[2]);
        year = Number(match[3]);
    } else {
        match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        year = Number(match[1]);
        month = Number(match[2]);
        day = Number(match[3]);
    }

    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    date.setHours(0, 0, 0, 0);
    return date;
}

function carregarEventosAgenda(rows) {
    if (rows.length < 1) throw new Error('A planilha está vazia.');

    const headers = rows[0].map(value => normalizarCabecalho(String(value ?? '')));
    const requiredHeaders = ['data', 'horario', 'atividade', 'dirigente', 'ministrante'];
    const columns = Object.fromEntries(requiredHeaders.map(header => [header, headers.indexOf(header)]));
    const missingHeaders = requiredHeaders.filter(header => columns[header] === -1);
    if (missingHeaders.length) {
        throw new Error(`Colunas ausentes na planilha: ${missingHeaders.join(', ')}.`);
    }

    let invalidDateRows = 0;
    const events = rows.slice(1).map(row => {
        const date = parseAgendaDate(String(row[columns.data] ?? ''));
        const event = {
            date,
            time: String(row[columns.horario] ?? '').trim(),
            activity: String(row[columns.atividade] ?? '').trim(),
            leader: String(row[columns.dirigente] ?? '').trim(),
            minister: String(row[columns.ministrante] ?? '').trim()
        };
        if (!date && event.activity) invalidDateRows += 1;
        return event;
    }).filter(event => event.date && event.activity);

    if (invalidDateRows) {
        console.warn(`${invalidDateRows} linha(s) da agenda foram ignoradas por terem data inválida.`);
    }
    return events.sort((first, second) => first.date - second.date || first.time.localeCompare(second.time));
}

async function buscarDadosAgenda() {
    const config = window.AGENDA_CONFIG;
    if (!config || !config.apiKey) {
        throw new Error('Configure a chave restrita da Google Sheets API em agenda-config.js.');
    }

    const apiBase = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}`;
    const query = new URLSearchParams({ key: config.apiKey, _: Date.now().toString() });
    const metadataResponse = await fetch(
        `${apiBase}?fields=${encodeURIComponent('sheets(properties(sheetId,title))')}&${query}`,
        { cache: 'no-store' }
    );
    if (!metadataResponse.ok) {
        throw new Error(`Não foi possível consultar a planilha (HTTP ${metadataResponse.status}).`);
    }

    const metadata = await metadataResponse.json();
    const sheet = metadata.sheets?.find(item => item.properties?.sheetId === config.sheetId);
    if (!sheet) throw new Error(`A aba de ID ${config.sheetId} não foi encontrada na planilha.`);

    const range = `${sheet.properties.title}!A:E`;
    const valuesQuery = new URLSearchParams({
        key: config.apiKey,
        valueRenderOption: 'FORMATTED_VALUE',
        majorDimension: 'ROWS',
        _: Date.now().toString()
    });
    const valuesResponse = await fetch(
        `${apiBase}/values/${encodeURIComponent(range)}?${valuesQuery}`,
        { cache: 'no-store' }
    );
    if (!valuesResponse.ok) {
        throw new Error(`Não foi possível ler os eventos da planilha (HTTP ${valuesResponse.status}).`);
    }

    const payload = await valuesResponse.json();
    if (!Array.isArray(payload.values)) throw new Error('A API retornou dados inválidos para a agenda.');
    return payload.values;
}

function inicioDaSemana(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    return start;
}

function formatarDataAgenda(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
}

async function carregarAgenda() {
    const status = document.getElementById('agenda-status');
    const weekLabel = document.getElementById('agenda-week-label');
    const eventsContainer = document.getElementById('agenda-events-container');
    const eventsBody = document.getElementById('agenda-events');
    const toggleEventsButton = document.getElementById('agenda-toggle-events');
    const previousButton = document.getElementById('agenda-previous-week');
    const nextButton = document.getElementById('agenda-next-week');
    if (!status || !weekLabel || !eventsContainer || !eventsBody || !toggleEventsButton || !previousButton || !nextButton) return;

    let weekStart = inicioDaSemana(new Date());
    let events = [];
    let showAllEvents = false;
    const visibleEventLimit = 4;

    function renderizarSemana() {
        showAllEvents = false;
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekLabel.textContent = `${formatarDataAgenda(weekStart)} a ${formatarDataAgenda(weekEnd)}`;

        const weeklyEvents = events.filter(event => event.date >= weekStart && event.date <= weekEnd);
        eventsBody.replaceChildren();

        if (weeklyEvents.length === 0) {
            eventsContainer.classList.add('hidden');
            status.textContent = 'Não há atividades cadastradas para esta semana.';
            status.classList.remove('hidden');
            return;
        }

        weeklyEvents.forEach((event, index) => {
            const eventCard = document.createElement('article');
            eventCard.className = 'flex flex-col gap-3 rounded-xl border border-cream-600 bg-cream-500 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6';
            eventCard.classList.toggle('hidden', index >= visibleEventLimit);

            const details = document.createElement('div');
            details.className = 'min-w-0';

            const date = document.createElement('p');
            date.className = 'mb-1 text-xs font-medium text-blue-800';
            date.textContent = formatarDataAgenda(event.date);
            details.append(date);

            const activity = document.createElement('h4');
            activity.className = 'font-semibold text-blue-900';
            activity.textContent = event.activity;
            details.append(activity);

            const people = [event.leader && `Dirigente: ${event.leader}`, event.minister && `Ministrante: ${event.minister}`]
                .filter(Boolean);
            if (people.length) {
                const assignments = document.createElement('p');
                assignments.className = 'mt-1 text-sm leading-relaxed text-gray-700';
                assignments.textContent = people.join(' · ');
                details.append(assignments);
            }

            eventCard.append(details);
            if (event.time) {
                const time = document.createElement('p');
                time.className = 'w-fit shrink-0 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white';
                time.textContent = event.time;
                eventCard.append(time);
            }
            eventsBody.append(eventCard);
        });

        toggleEventsButton.classList.toggle('hidden', weeklyEvents.length <= visibleEventLimit);
        toggleEventsButton.textContent = `Ver mais (${weeklyEvents.length - visibleEventLimit})`;
        toggleEventsButton.setAttribute('aria-expanded', 'false');
        status.classList.add('hidden');
        eventsContainer.classList.remove('hidden');
    }

    toggleEventsButton.addEventListener('click', () => {
        showAllEvents = !showAllEvents;
        Array.from(eventsBody.children).forEach((eventCard, index) => {
            eventCard.classList.toggle('hidden', !showAllEvents && index >= visibleEventLimit);
        });
        toggleEventsButton.textContent = showAllEvents ? 'Ver menos' : `Ver mais (${eventsBody.children.length - visibleEventLimit})`;
        toggleEventsButton.setAttribute('aria-expanded', String(showAllEvents));
    });

    previousButton.addEventListener('click', () => {
        weekStart.setDate(weekStart.getDate() - 7);
        renderizarSemana();
    });
    nextButton.addEventListener('click', () => {
        weekStart.setDate(weekStart.getDate() + 7);
        renderizarSemana();
    });

    try {
        const values = await buscarDadosAgenda();
        events = carregarEventosAgenda(values);
        renderizarSemana();
    } catch (error) {
        console.error('Não foi possível carregar a agenda da planilha.', error);
        status.textContent = error.message.includes('Configure a chave')
            ? 'A agenda está aguardando a configuração da API do Google Sheets.'
            : 'Não foi possível carregar a agenda. Verifique a configuração da planilha e tente novamente.';
        status.classList.remove('hidden');
        eventsContainer.classList.add('hidden');
    }
}

function isInstagramMediaUrl(value) {
    if (typeof value !== 'string') return false;

    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && (url.hostname.endsWith('.cdninstagram.com') || url.hostname.endsWith('.fbcdn.net'));
    } catch {
        return false;
    }
}

function isInstagramPostUrl(value) {
    if (typeof value !== 'string') return false;

    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && (url.hostname === 'instagram.com' || url.hostname.endsWith('.instagram.com'));
    } catch {
        return false;
    }
}

async function carregarFotosInstagram() {
    const status = document.getElementById('instagram-feed-status');
    const carousel = document.getElementById('instagram-carousel');
    const image = document.getElementById('instagram-slide-image');
    const slideLink = document.getElementById('instagram-slide-link');
    const dots = document.getElementById('instagram-carousel-dots');
    const previousButton = document.getElementById('instagram-previous');
    const nextButton = document.getElementById('instagram-next');
    if (!status || !carousel || !image || !slideLink || !dots || !previousButton || !nextButton) return;

    try {
        const response = await fetch('data/instagram-feed.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Resposta HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!Array.isArray(payload.posts)) {
            throw new Error('Formato do feed inválido');
        }

        const posts = payload.posts
            .filter(post => post && isInstagramMediaUrl(post.mediaUrl) && isInstagramPostUrl(post.permalink))
            .slice(0, 6);

        if (posts.length === 0) {
            status.textContent = 'As fotos recentes aparecerão aqui. Siga nosso Instagram para acompanhar a IADED.';
            return;
        }

        let currentIndex = 0;
        let autoplayTimer;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const dotButtons = posts.map((_, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'h-3 w-3 rounded-full bg-gray-300 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800';
            button.setAttribute('aria-label', `Mostrar foto ${index + 1} de ${posts.length}`);
            button.addEventListener('click', () => {
                showSlide(index);
                startAutoplay();
            });
            dots.append(button);
            return button;
        });

        function showSlide(index) {
            currentIndex = (index + posts.length) % posts.length;
            const post = posts[currentIndex];
            slideLink.href = post.permalink;
            image.src = post.mediaUrl;
            image.alt = typeof post.caption === 'string' && post.caption.trim()
                ? post.caption.trim().slice(0, 160)
                : 'Foto recente da IADED no Instagram';
            dotButtons.forEach((button, dotIndex) => {
                button.classList.toggle('bg-blue-800', dotIndex === currentIndex);
                button.classList.toggle('bg-gray-300', dotIndex !== currentIndex);
                button.setAttribute('aria-current', dotIndex === currentIndex ? 'true' : 'false');
            });
        }

        function stopAutoplay() {
            window.clearInterval(autoplayTimer);
            autoplayTimer = undefined;
        }

        function startAutoplay() {
            stopAutoplay();
            const userInteracting = carousel.matches(':hover') || carousel.contains(document.activeElement);
            if (posts.length > 1 && !reducedMotion && !document.hidden && !userInteracting) {
                autoplayTimer = window.setInterval(() => showSlide(currentIndex + 1), 5000);
            }
        }

        previousButton.addEventListener('click', () => {
            showSlide(currentIndex - 1);
            startAutoplay();
        });
        nextButton.addEventListener('click', () => {
            showSlide(currentIndex + 1);
            startAutoplay();
        });
        carousel.addEventListener('pointerenter', stopAutoplay);
        carousel.addEventListener('pointerleave', startAutoplay);
        carousel.addEventListener('focusin', stopAutoplay);
        carousel.addEventListener('focusout', event => {
            if (!carousel.contains(event.relatedTarget)) startAutoplay();
        });
        document.addEventListener('visibilitychange', startAutoplay);

        if (posts.length < 2) {
            previousButton.classList.add('hidden');
            nextButton.classList.add('hidden');
            dots.classList.add('hidden');
        }

        showSlide(0);
        carousel.classList.remove('hidden');
        status.textContent = 'Fotos recentes do Instagram';
        startAutoplay();
    } catch (error) {
        console.error('Não foi possível carregar o feed do Instagram.', error);
        status.textContent = 'Não foi possível carregar as fotos agora. Acesse nosso Instagram pelo botão ao lado.';
    }
}

// Função para Copiar a Chave PIX
function copiarPix() {
    const chavePix = document.getElementById('chave-pix').innerText;
    
    navigator.clipboard.writeText(chavePix).then(() => {
        const msg = document.getElementById('msg-copia');
        msg.classList.remove('hidden');
        
        // Esconder a mensagem depois de 3 segundos
        setTimeout(() => {
            msg.classList.add('hidden');
        }, 3000);
    }).catch(err => {
        console.error("Falha ao copiar texto: ", err);
        alert("Não foi possível copiar a chave. Selecione o texto manualmente.");
    });
}
// Galeria da construção
function abrirGaleria() {
    document.getElementById('galeria-obra').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function fecharGaleria() {
    document.getElementById('galeria-obra').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

function abrirFoto(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').classList.remove('hidden');
}

function fecharFoto() {
    document.getElementById('lightbox').classList.add('hidden');
}

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const lightbox = document.getElementById('lightbox');
    if (!lightbox.classList.contains('hidden')) {
        fecharFoto();
    } else {
        fecharGaleria();
    }
});
