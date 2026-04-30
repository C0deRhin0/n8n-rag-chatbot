# n8n RAG Chatbot

A chatbot with RAG (Retrieval-Augmented Generation) functionality built with n8n, Qdrant vector database, and OpenAI embeddings.

## Overview

This project provides a complete chatbot solution that:
- Uses n8n for workflow automation
- Leverages Qdrant for vector similarity search
- Uses OpenAI embeddings for semantic search
- Provides a web interface for customer support

## Project Structure

```
n8n-rag-chatbot/
├── index.html              # Chatbot web interface
├── server.js               # Node.js proxy server
├── package.json            # Project dependencies
├── FAQs_Chatbot.json       # n8n workflow (main chatbot)
├── faq_http_tool.json      # n8n HTTP tool for FAQ search
├── upload_faqs_fixed.py    # Script to upload FAQs to Qdrant
├── scratch/                # Utility scripts for debugging
└── plans/                  # React app prototype (optional)
```

## Prerequisites

- Node.js 18+
- Python 3.8+ (for upload script)
- OpenAI API key
- Qdrant instance (cloud or local)

## Setup

### 1. Install Node dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
export OPENAI_API_KEY="your-openai-key"
export QDRANT_URL="https://your-qdrant-instance.com"
export QDRANT_API_KEY="your-qdrant-api-key"
export N8N_WEBHOOK_URL="https://your-n8n-instance.com/webhook/your-webhook-id/chat"
```

### 3. Upload FAQs to Qdrant

```bash
python upload_faqs_fixed.py
```

### 4. Start the web server

```bash
npm start
```

The server will run at `http://localhost:3000`

## n8n Workflow Setup

1. Import `FAQs_Chatbot.json` into your n8n instance
2. Configure your OpenAI credentials in n8n
3. Set up the Qdrant connection
4. Copy the webhook URL and update `N8N_WEBHOOK_URL` in your environment

## Configuration

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `QDRANT_URL` | Qdrant instance URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `N8N_WEBHOOK_URL` | n8n chatbot webhook URL |
| `PORT` | Server port (default: 3000) |

## License

ISC