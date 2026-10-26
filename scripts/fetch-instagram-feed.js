const fs = require('node:fs');
const path = require('node:path');

const API_VERSION = 'v26.0';
const FEED_LIMIT = 50;
const DISPLAY_LIMIT = 6;
const MEDIA_HOST_SUFFIXES = ['.cdninstagram.com', '.fbcdn.net'];

function isAllowedMediaUrl(value) {
    if (typeof value !== 'string') return false;

    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && MEDIA_HOST_SUFFIXES.some(suffix => url.hostname.endsWith(suffix));
    } catch {
        return false;
    }
}

function isInstagramPermalink(value) {
    if (typeof value !== 'string') return false;

    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && (url.hostname === 'instagram.com' || url.hostname.endsWith('.instagram.com'));
    } catch {
        return false;
    }
}

async function getJson(url, accessToken, fetchImpl) {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set('access_token', accessToken);

    const response = await fetchImpl(requestUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
        let details = '';
        try {
            const payload = await response.json();
            const apiError = payload?.error;
            if (apiError && typeof apiError === 'object') {
                const code = Number.isInteger(apiError.code) ? `, code ${apiError.code}` : '';
                const message = typeof apiError.message === 'string'
                    ? apiError.message.replaceAll(accessToken, '[redacted]').slice(0, 400)
                    : '';
                details = `${code}${message ? `: ${message}` : ''}`;
            }
        } catch (error) {
            if (!(error instanceof SyntaxError)) throw error;
        }
        throw new Error(`Instagram API request failed (HTTP ${response.status}${details}). Check the token, permissions, and account setup.`);
    }

    const payload = await response.json();
    if (payload.error) {
        throw new Error(`Instagram API returned an error (code ${payload.error.code || 'unknown'}). Check the token and permissions.`);
    }
    return payload;
}

async function updateFeed({
    accessToken = process.env.IG_ACCESS_TOKEN,
    outputPath = path.join(__dirname, '..', 'data', 'instagram-feed.json'),
    fetchImpl = fetch,
} = {}) {
    if (!accessToken || !accessToken.trim()) {
        throw new Error('Missing required IG_ACCESS_TOKEN environment variable.');
    }

    const baseUrl = `https://graph.instagram.com/${API_VERSION}`;
    const account = await getJson(`${baseUrl}/me?fields=user_id,username`, accessToken, fetchImpl);
    const accountId = account.user_id || account.data?.[0]?.user_id;
    const username = account.username;

    if (!accountId || typeof accountId !== 'string' || !/^\d+$/.test(accountId)) {
        throw new Error('Instagram API did not return a valid professional account ID.');
    }

    const mediaUrl = new URL(`${baseUrl}/${encodeURIComponent(accountId)}/media`);
    mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,timestamp,children{media_type,media_url}');
    mediaUrl.searchParams.set('limit', String(FEED_LIMIT));
    const media = await getJson(mediaUrl, accessToken, fetchImpl);

    if (!Array.isArray(media.data)) {
        throw new Error('Instagram API returned an invalid media list.');
    }

    const posts = media.data
        .filter(post => post && (post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM'))
        .map(post => {
            const firstCarouselImage = post.children?.data?.find(child =>
                child.media_type === 'IMAGE' && isAllowedMediaUrl(child.media_url));
            return { ...post, imageUrl: firstCarouselImage?.media_url || post.media_url };
        })
        .filter(post => isAllowedMediaUrl(post.imageUrl) && isInstagramPermalink(post.permalink))
        .slice(0, DISPLAY_LIMIT)
        .map(post => ({
            id: String(post.id),
            mediaUrl: post.imageUrl,
            permalink: post.permalink,
            caption: typeof post.caption === 'string' ? post.caption.slice(0, 2200) : '',
            timestamp: typeof post.timestamp === 'string' ? post.timestamp : '',
        }));

    const feed = {
        username: typeof username === 'string' ? username : '',
        posts,
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(feed, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 });
    fs.renameSync(temporaryPath, outputPath);

    return feed;
}

if (require.main === module) {
    updateFeed()
        .then(feed => console.log(`Instagram feed updated: ${feed.posts.length} photo(s).`))
        .catch(error => {
            console.error(error.message);
            process.exitCode = 1;
        });
}

module.exports = { isAllowedMediaUrl, isInstagramPermalink, updateFeed };
