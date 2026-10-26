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
    const feed = document.getElementById('instagram-feed');
    const status = document.getElementById('instagram-feed-status');
    if (!feed || !status) return;

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

        const cards = posts.map(post => {
            const link = document.createElement('a');
            link.href = post.permalink;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'group block aspect-square overflow-hidden rounded-lg bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800';
            link.setAttribute('aria-label', 'Ver publicação no Instagram');

            const image = document.createElement('img');
            image.src = post.mediaUrl;
            image.alt = typeof post.caption === 'string' && post.caption.trim()
                ? post.caption.trim().slice(0, 160)
                : 'Foto recente da IADED no Instagram';
            image.loading = 'lazy';
            image.decoding = 'async';
            image.referrerPolicy = 'no-referrer';
            image.className = 'h-full w-full object-cover transition duration-300 group-hover:scale-105';
            link.append(image);
            return link;
        });

        feed.replaceChildren(...cards);
        status.textContent = 'Fotos recentes do Instagram';
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
