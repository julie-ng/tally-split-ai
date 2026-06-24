---
name: azure-blob-storage
description: Azure Blob Storage integration — SAS tokens, direct client uploads, and the security model. Use when working on file uploads, blob storage, SAS tokens, or filename handling.
---

# Azure Blob Storage

Entry points: `server/api/tokens/{upload,read}.post.js` (SAS token generation), `server/api/blobs/new.post.js` (registers a blob), `server/utils/azure-storage.utils.js` (`azureStorageUtils`). Full sequence diagrams: `docs/blob-storage-architecture.md`.

## Architecture: direct client uploads

Files **never pass through the Nuxt server**. Client requests a SAS URL from `/api/tokens/upload`, uploads straight to Azure, then commits the block list. Reads use the same pattern via `/api/tokens/read`. The storage account key stays server-side and is never exposed.

## Security model (the part that's easy to get wrong)

- All blobs are **private**; SAS tokens are scoped to a single file with a short TTL.
- Every token request checks the requesting `userId` matches the blob path's userId.
- A mismatch returns **404, not 403** — never leak whether the blob exists.

## Blob paths & filenames

- Blob path is `{userId}/{id}/{azureFilename}` via `azureUtils.buildBlobPath()` (`shared/utils/azure.utils.js`). `id` is a random per-upload string from `#shared/utils/generate-id.js` — there is **no `hashId`** (an older deterministic scheme was removed).
- Filenames carry human pre-curation (`(41.95)` = EUR total, `YYYY-MM-DD` = date) and use `()`/`#`, which Azure dislikes — sanitize via `createAzureFilename()` / `createThumbnailFilename()` (`shared/utils/filename.utils.js`) before upload.
