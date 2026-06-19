const { createApp } = require('./src/app');
const { getServerConfig, redactWebhookUrl } = require('./src/config/env');

const config = getServerConfig();
const server = createApp(config);

console.log('→ n8n Webhook URL:', redactWebhookUrl(config.n8nWebhookUrl));

server.listen(config.port, config.host, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 CHATBOT SERVER RUNNING                              ║
║   ---------------------------------                      ║
║                                                          ║
║   Local:   http://localhost:${config.port}                         ║
║   Network: http://${config.localIp}:${config.port}                       ║
║   Chat API: http://${config.localIp}:${config.port}/api/chat              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
});
