const path = require('path');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
};

function resolveStaticPath(publicRoot, requestUrl) {
    const [pathname] = (requestUrl || '/').split('?');
    const requestPath = pathname === '/' ? '/index.html' : pathname;
    const candidatePath = path.resolve(publicRoot, `.${requestPath}`);
    const normalizedPublicRoot = `${path.resolve(publicRoot)}${path.sep}`;

    if (candidatePath !== path.resolve(publicRoot, 'index.html') && !candidatePath.startsWith(normalizedPublicRoot)) {
        return null;
    }

    return candidatePath;
}

function getMimeType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return MIME_TYPES[extension] || 'application/octet-stream';
}

module.exports = {
    getMimeType,
    resolveStaticPath,
};
