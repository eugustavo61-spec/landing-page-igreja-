// script.js

document.addEventListener('DOMContentLoaded', () => {
    
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
// Configuração futura para a API do Instagram
// Exemplo de como você poderia usar o fetch() futuramente:
/*
async function carregarInstagramFeed() {
    try {
        const response = await fetch('SUA_URL_DA_API_AQUI');
        const data = await response.json();
        // Lógica para injetar imagens na div #instagram-feed-container
    } catch (error) {
        console.error("Erro ao carregar o feed: ", error);
    }
}
*/
