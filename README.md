# n8n RAG Chatbot

A small production-ready chatbot stack built around n8n workflows, Qdrant retrieval, OpenAI embeddings, and a lightweight Node.js proxy/UI host.

## Architecture

```text
.
├── backend/
│   ├── server.js                # Runtime entrypoint
│   └── src/
│       ├── app.js               # HTTP routing and static file serving
│       ├── config/              # Runtime config and project paths
│       ├── services/            # n8n proxy integration
│       └── utils/               # HTTP and static-serving helpers
├── frontend/
│   └── public/
│       └── index.html           # Chat widget UI
├── workflows/
│   └── n8n/
│       ├── FAQs_Chatbot.json    # Main chatbot workflow
│       └── faq_http_tool.json   # FAQ search helper workflow
├── scripts/
│   └── upload_faqs_fixed.py     # Qdrant FAQ ingestion script
├── docs/
│   └── architecture.md          # Boundary and layout notes
├── package.json
└── README.md
```

## Prerequisites

- Node.js 18+
- Python 3.8+ for the ingestion script
- OpenAI API key
- Qdrant instance
- n8n instance with imported workflows

## Setup

### 1. Configure environment variables

```bash
export OPENAI_API_KEY="your-openai-key"
export QDRANT_URL="https://your-qdrant-instance.com"
export QDRANT_API_KEY="your-qdrant-api-key"
export N8N_WEBHOOK_URL="https://your-n8n-instance.com/webhook/your-webhook-id/chat"
```

### 2. Upload FAQs to Qdrant

```bash
python scripts/upload_faqs_fixed.py
```

### 3. Start the app

```bash
npm start
```

The app will serve the UI from `http://localhost:3000` and proxy chat traffic to `/api/chat`.

## n8n Workflow Setup

1. Import `workflows/n8n/FAQs_Chatbot.json` into n8n.
2. Import `workflows/n8n/faq_http_tool.json` if you use the helper workflow.
3. Configure your OpenAI and Qdrant credentials in n8n.
4. Copy the final n8n webhook URL into `N8N_WEBHOOK_URL`.

## Configuration

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for embeddings |
| `QDRANT_URL` | Qdrant instance URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `N8N_WEBHOOK_URL` | n8n chatbot webhook URL |
| `ALLOWED_ORIGINS` | Comma-separated allowed browser origins, defaults to `*` |
| `HOST` | Bind host for the Node server |
| `PORT` | Server port, defaults to `3000` |
| `MAX_REQUEST_BODY_BYTES` | Max accepted request size, defaults to `65536` |
| `MAX_PROXY_RESPONSE_BYTES` | Max proxy response size, defaults to `1048576` |
| `PROXY_TIMEOUT_MS` | Outbound n8n timeout, defaults to `15000` |
| `RATE_LIMIT_WINDOW_MS` | Per-IP rate-limit window, defaults to `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Per-IP requests allowed per window, defaults to `30` |

The FAQ ingestion script and the primary workflow both use the Qdrant collection name `faq-collection`.

> `workflows/n8n/faq_http_tool.json` still requires you to replace the Qdrant host and API key placeholders after import.

## License

ISC
