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
    const mobileLinks = menu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.add('hidden');
        });
    });

});

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
