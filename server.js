const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;
const LOCAL_IP = require('os').networkInterfaces();

// Get the local IP address
function getLocalIP() {
    for (const name of Object.keys(LOCAL_IP)) {
        for (const net of LOCAL_IP[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'your-device-ip';
}

// n8n webhook proxy - configure via environment variable
// Set N8N_WEBHOOK_URL to your n8n webhook URL
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://your-n8n-instance.com/webhook/your-webhook-id/chat';

console.log('→ n8n Webhook URL:', N8N_WEBHOOK_URL);

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
    '.wasm': 'application/wasm'
};

// Helper to make HTTPS requests
function makeRequest(url, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        console.log('→ Proxying to:', url);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('← n8n responded:', res.statusCode);
                resolve({ status: res.statusCode, data: data });
            });
        });

        req.on('error', (err) => {
            console.error('Proxy request error:', err.message);
            reject(err);
        });

        req.write(JSON.stringify(body));
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);

    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Proxy chat requests to n8n
    if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body);
                console.log('→ Message:', parsed.message);

                // Ensure compatibility with n8n AI Chat nodes which expect 'chatInput' and 'sessionId'
                const n8nBody = {
                    ...parsed,
                    chatInput: parsed.message,
                    sessionId: parsed.sessionId || 'session_' + Date.now()
                };

                // Call n8n webhook
                const response = await makeRequest(N8N_WEBHOOK_URL, n8nBody);

                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(response.data);
            } catch (error) {
                console.error('Proxy error:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message, output: 'Sorry, an error occurred. Please try again.' }));
            }
        });
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const extname = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1><p>The file you requested does not exist.</p>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const serverIP = getLocalIP();

server.listen(PORT, HOST, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                      ║
║   🚀 CHATBOT SERVER RUNNING                            ║
║   ---------------------------------                  ║
║                                                      ║
║   Local:   http://localhost:${PORT}                    ║
║   Network: http://${serverIP}:${PORT}                  ║
║   Chat API: http://${serverIP}:${PORT}/api/chat        ║
║                                                      ║
╚══════════════════════════════════════════════════════════╝
    `);
});