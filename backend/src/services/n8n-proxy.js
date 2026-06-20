const http = require('http');
const https = require('https');

function createN8nPayload(requestBody) {
    return {
        chatInput: requestBody.message,
        sessionId: requestBody.sessionId || `session_${Date.now()}`,
        message: requestBody.message,
    };
}

function createPayloadTooLargeError() {
    const error = new Error('n8n response exceeded the configured size limit');
    error.statusCode = 502;
    return error;
}

function createTimeoutError() {
    const error = new Error('n8n request timed out');
    error.statusCode = 504;
    return error;
}

function requestN8n(webhookUrl, body, { timeoutMs, maxResponseBytes }) {
    return new Promise((resolve, reject) => {
        const targetUrl = new URL(webhookUrl);
        const client = targetUrl.protocol === 'http:' ? http : https;
        const payload = JSON.stringify(body);

        const request = client.request(
            {
                hostname: targetUrl.hostname,
                port: targetUrl.port || (targetUrl.protocol === 'http:' ? 80 : 443),
                path: `${targetUrl.pathname}${targetUrl.search}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
            },
            (response) => {
                let data = '';
                let responseBytes = 0;

                response.on('data', (chunk) => {
                    responseBytes += chunk.length;

                    if (responseBytes > maxResponseBytes) {
                        response.destroy(createPayloadTooLargeError());
                        return;
                    }

                    data += chunk;
                });

                response.on('end', () => {
                    resolve({
                        status: response.statusCode || 500,
                        data,
                    });
                });

                response.on('error', reject);
            },
        );

        request.setTimeout(timeoutMs, () => {
            request.destroy(createTimeoutError());
        });

        request.on('error', reject);
        request.write(payload);
        request.end();
    });
}

async function proxyChatToN8n(webhookUrl, requestBody, proxyConfig) {
    const payload = createN8nPayload(requestBody);
    return requestN8n(webhookUrl, payload, proxyConfig);
}

module.exports = {
    proxyChatToN8n,
};
