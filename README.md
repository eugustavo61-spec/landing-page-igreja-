# IADED

Site estático da IADED, publicado no GitHub Pages. A seção do Instagram é atualizada por um GitHub Actions agendado, usando a API oficial da Meta.

## Integração automática do Instagram

O site não acessa o Instagram diretamente pelo navegador. Um workflow executado no GitHub busca as publicações e atualiza `data/instagram-feed.json`; essa lista contém somente dados públicos das fotos. A credencial fica em um GitHub Actions Secret e nunca é enviada ao visitante do site.

### 1. Confira a conta

A conta `@iadedoficial` precisa ser profissional (Empresa ou Criador) e você precisa ter permissão para autorizar o acesso.

### 2. Configure um aplicativo da Meta

1. Acesse o [Meta for Developers](https://developers.facebook.com/apps/) e crie um aplicativo do tipo **Business**.
2. Adicione/configure a **Instagram API with Instagram Login** para a conta profissional da IADED.
3. Autorize o acesso de leitura às publicações com a permissão `instagram_business_basic`.
4. Gere um token de acesso de longa duração no painel da Meta. Para uma conta que você administra, o acesso padrão normalmente é suficiente; a Meta pode pedir revisão do aplicativo dependendo da configuração.

Consulte a documentação oficial: [Instagram API with Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/) e [como começar e obter o token](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started).

### 3. Guarde o token no GitHub, nunca no código

No repositório, abra **Settings → Secrets and variables → Actions → New repository secret** e crie:

- **Name:** `IG_ACCESS_TOKEN`
- **Secret:** o token gerado no painel da Meta

Não cole o token no site, em `script.js`, no JSON, em um arquivo `.env`, em commits, issues ou mensagens. Não é necessário informar o token ao assistente.

Depois, em **Settings → Actions → General → Workflow permissions**, habilite **Read and write permissions**. Isso permite ao workflow atualizar apenas o arquivo do feed no branch padrão. Mantenha a origem do GitHub Pages apontada para a raiz (`/`) desse branch. Se o Pages estiver configurado para publicar por outro workflow ou outra pasta, ajuste a publicação para incluir `data/instagram-feed.json`.

### 4. Teste e acompanhe

1. Abra **Actions → Update Instagram photo feed → Run workflow**.
2. Confira se a execução terminou com sucesso e se `data/instagram-feed.json` foi atualizado.
3. Aguarde a publicação do GitHub Pages e confira a seção **Galeria** no site.

Depois, o workflow consulta a API aproximadamente uma vez por hora. A execução pode atrasar conforme a fila do GitHub Actions. São exibidas até seis publicações recentes de foto ou carrossel; vídeos e Reels não são mostrados. A página continua exibindo o link para o perfil caso o feed não esteja disponível.

### Segurança e manutenção

- O segredo só é disponibilizado ao job de atualização; o navegador recebe apenas URLs, legendas e links públicos das publicações.
- O workflow usa apenas a permissão `contents: write`, não registra o token nem imprime o corpo de erros da API.
- Tokens de longa duração da Meta expiram (normalmente em cerca de 60 dias). Renove o token no painel da Meta e substitua o valor do segredo `IG_ACCESS_TOKEN` antes do vencimento. Se a execução falhar, verifique **Actions** e confira token, permissão `instagram_business_basic` e autorização da conta.
- O conteúdo do feed é público porque o próprio site é público. O workflow só seleciona URLs HTTPS dos domínios de mídia da Meta e links de publicações do Instagram.
