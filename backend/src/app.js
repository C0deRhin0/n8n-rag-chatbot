const fs = require('fs');
const http = require('http');

const { publicRoot } = require('./config/paths');
const { applyCors, readJsonBody, sendJson } = require('./utils/http');
const { createRateLimiter } = require('./utils/rate-limit');
const { getMimeType, resolveStaticPath } = require('./utils/static');
const { proxyChatToN8n } = require('./services/n8n-proxy');

function logRequest(req) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
}

function validateChatRequest(body) {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        const error = new Error('Request body must be a JSON object');
        error.statusCode = 400;
        throw error;
    }

    if (typeof body.message !== 'string' || !body.message.trim()) {
        const error = new Error('message is required');
        error.statusCode = 422;
        throw error;
    }

    if (body.message.length > 2000) {
        const error = new Error('message is too long');
        error.statusCode = 413;
        throw error;
    }

    if (body.sessionId && (typeof body.sessionId !== 'string' || body.sessionId.length > 200)) {
        const error = new Error('sessionId must be a string up to 200 characters');
        error.statusCode = 422;
        throw error;
    }
}

function getRequestKey(req) {
    return req.socket.remoteAddress || 'unknown';
}

function createApp({
    n8nWebhookUrl,
    allowedOrigins,
    maxRequestBodyBytes,
    maxProxyResponseBytes,
    proxyTimeoutMs,
    rateLimitWindowMs,
    rateLimitMaxRequests,
}) {
    const isRateLimited = createRateLimiter({
        windowMs: rateLimitWindowMs,
        maxRequests: rateLimitMaxRequests,
    });

    return http.createServer(async (req, res) => {
        logRequest(req);
        applyCors(req, res, allowedOrigins);

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.url === '/api/chat' && req.method === 'POST') {
            if (isRateLimited(getRequestKey(req))) {
                sendJson(res, 429, {
                    error: 'Too many requests',
                    output: 'Too many requests. Please wait a moment and try again.',
                });
                return;
            }

            try {
                const requestBody = await readJsonBody(req, maxRequestBodyBytes);
                validateChatRequest(requestBody);
                console.log('→ Proxying chat message to n8n');

                const response = await proxyChatToN8n(n8nWebhookUrl, requestBody, {
                    timeoutMs: proxyTimeoutMs,
                    maxResponseBytes: maxProxyResponseBytes,
                });

                if (response.status >= 400) {
                    console.error('Proxy error: n8n returned status', response.status);
                    sendJson(res, 502, {
                        error: 'Chat proxy failed',
                        output: 'Sorry, an error occurred. Please try again.',
                    });
                    return;
                }

                res.writeHead(response.status, {
                    'Content-Type': 'application/json',
                });
                res.end(response.data);
            } catch (error) {
                console.error('Proxy error:', error.message);
                const statusCode = error.statusCode || 500;
                const clientErrorMessage = statusCode >= 500 ? 'Chat proxy failed' : error.message;

                sendJson(res, statusCode, {
                    error: clientErrorMessage,
                    output: 'Sorry, an error occurred. Please try again.',
                });
            }
            return;
        }

        const filePath = resolveStaticPath(publicRoot, req.url || '/');

        if (!filePath) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
        }

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1><p>The file you requested does not exist.</p>', 'utf-8');
                    return;
                }

                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${error.code}`);
                return;
            }

            res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
            res.end(content, 'utf-8');
        });
    });
}

module.exports = {
    createApp,
};
