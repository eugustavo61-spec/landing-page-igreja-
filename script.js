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

});

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
