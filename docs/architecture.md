# Architecture Notes

## Runtime boundaries

- `backend/` owns HTTP transport, static asset serving, and proxying to n8n.
- `frontend/public/` contains the browser UI and continues to call `/api/chat`.
- `workflows/n8n/` stores importable workflow artifacts.
- `scripts/` contains operational tooling such as FAQ ingestion.

## Pathing decisions

- Static assets are resolved from `frontend/public` through `backend/src/config/paths.js`.
- The API route remains `/api/chat` to preserve frontend behavior.
- The Python ingestion script path changed to `scripts/upload_faqs_fixed.py`; docs were updated accordingly.
- FAQ ingestion and workflow retrieval are aligned on the `faq-collection` Qdrant collection.

## Enterprise-oriented improvements

- Backend runtime logic is split into config, services, and utility layers.
- Static file resolution is centralized and guarded against path traversal.
- Proxy requests now enforce body-size limits, request validation, timeouts, and response-size caps.
- Operational assets and workflow files are separated from runtime code.
