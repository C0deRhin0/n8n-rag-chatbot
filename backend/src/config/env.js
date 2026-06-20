const os = require('os');

const DEFAULT_WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/your-webhook-id/chat';

function getPositiveInteger(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.floor(parsed);
}

function getAllowedOrigins() {
    const rawOrigins = process.env.ALLOWED_ORIGINS || '*';
    return rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function redactWebhookUrl(webhookUrl) {
    try {
        const parsed = new URL(webhookUrl);
        return `${parsed.origin}/***`;
    } catch (error) {
        return '[invalid webhook url]';
    }
}

function validateConfig(config) {
    const isProduction = process.env.NODE_ENV === 'production';
    const usesPlaceholderWebhook = config.n8nWebhookUrl === DEFAULT_WEBHOOK_URL;
    const webhookProtocol = (() => {
        try {
            return new URL(config.n8nWebhookUrl).protocol;
        } catch (error) {
            return null;
        }
    })();

    if (isProduction && usesPlaceholderWebhook) {
        throw new Error('N8N_WEBHOOK_URL must be configured in production');
    }

    if (isProduction && webhookProtocol !== 'https:') {
        throw new Error('N8N_WEBHOOK_URL must use HTTPS in production');
    }

    if (isProduction && config.allowedOrigins.includes('*')) {
        throw new Error('ALLOWED_ORIGINS must be explicitly configured in production');
    }
}

function getLocalIp() {
    const networkInterfaces = os.networkInterfaces();

    for (const interfaceName of Object.keys(networkInterfaces)) {
        for (const network of networkInterfaces[interfaceName] || []) {
            if (network.family === 'IPv4' && !network.internal) {
                return network.address;
            }
        }
    }

    return 'your-device-ip';
}

function getServerConfig() {
    const config = {
        host: process.env.HOST || '0.0.0.0',
        port: getPositiveInteger(process.env.PORT, 3000),
        n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || DEFAULT_WEBHOOK_URL,
        localIp: getLocalIp(),
        allowedOrigins: getAllowedOrigins(),
        maxRequestBodyBytes: getPositiveInteger(process.env.MAX_REQUEST_BODY_BYTES, 65536),
        maxProxyResponseBytes: getPositiveInteger(process.env.MAX_PROXY_RESPONSE_BYTES, 1048576),
        proxyTimeoutMs: getPositiveInteger(process.env.PROXY_TIMEOUT_MS, 15000),
        rateLimitWindowMs: getPositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60000),
        rateLimitMaxRequests: getPositiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 30),
    };

    validateConfig(config);
    return config;
}

module.exports = {
    DEFAULT_WEBHOOK_URL,
    getServerConfig,
    redactWebhookUrl,
};
