async function readJsonBody(req, maxBytes = 65536) {
    const chunks = [];
    let totalBytes = 0;

    for await (const chunk of req) {
        const normalizedChunk = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        totalBytes += normalizedChunk.length;

        if (totalBytes > maxBytes) {
            const error = new Error('Request body too large');
            error.statusCode = 413;
            throw error;
        }

        chunks.push(normalizedChunk);
    }

    const body = Buffer.concat(chunks).toString('utf8').trim();

    if (!body) {
        return {};
    }

    try {
        return JSON.parse(body);
    } catch (error) {
        const parseError = new Error('Invalid JSON request body');
        parseError.statusCode = 400;
        throw parseError;
    }
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

function applyCors(req, res, allowedOrigins) {
    const origin = req.headers.origin;

    if (allowedOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = {
    applyCors,
    readJsonBody,
    sendJson,
};
