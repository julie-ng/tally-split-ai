---
name: azure-blob-storage
description: Azure Blob Storage integration — SAS tokens, direct client uploads, filename conventions, blob tags, and security model. Use when working on file uploads, blob storage, SAS token generation, or filename handling.
---

# Azure Blob Storage

## Architecture: Direct Client Uploads

Files **never pass through the Nuxt server**. The flow is:

1. Client requests a SAS upload URL from `/api/tokens/upload`
2. Server validates `userId` and generates a time-limited, write-only SAS token
3. Client uploads directly to Azure using the SAS URL
4. Client commits the block list to finalize the upload

Read access follows the same pattern via `/api/tokens/read`.

## Security

- All blobs are **private** — not publicly accessible
- SAS tokens are scoped to a single file with a very short time window
- Every token request checks that the requesting `userId` matches the blob path's userId
- Mismatch returns 404 (even if the blob exists) — never leaks existence

## Filename Design

| Type | Pattern |
|:--|:--|
| Original | `{userId}/{sanitized-filename}.{ext}` |
| Thumbnail | `{userId}/{sanitized-filename}-thumbnail.{ext}` |

- Each filename gets a `hashId` derived from filename + timestamp (no collision concern at POC scale)
- Max thumbnail: 100px wide, ~20-30KB
- Azure container is configured via env var only — never hardcoded in app logic

## Filename Sanitization

Because filenames use `()` and `#` for human pre-curation, they must be sanitized before upload to Azure (Azure Blob Storage is finicky with these characters). See `server/utils/hash-upload-name.js`.

Human pre-curation encoding in filenames:
- `(41.95)` — total amount in EUR
- `#tip` — tag (indicates actual total may differ from printed)
- `YYYY-MM-DD` — date

## Azure Blob Tags

Tags are stored as Azure Blob index tags (key-value pairs). They come back from the Azure API as a **JSON string** and need to be parsed for use in the app. When saving back, serialize with `JSON.stringify()`.

## Key Files

| File | Purpose |
|:--|:--|
| `server/utils/azure-storage.utils.js` | Azure storage client config (`useAzureStorageConfig()`) |
| `server/utils/hash-upload-name.js` | Filename hashing/sanitization |
| `server/api/tokens/upload.post.js` | Generate upload SAS token |
| `server/api/tokens/read.post.js` | Generate read SAS token |
| `server/api/blobs/index.get.js` | List blobs |
| `server/api/blobs/new.post.js` | Register new blob |
| `docs/blob-storage-architecture.md` | Security model and upload sequence diagrams |

## References

- [Blob Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api)
  - [Put Blob](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob?tabs=microsoft-entra-id)
  - [Put Block](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block?tabs=microsoft-entra-id)
  - [Put Block List](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block-list?tabs=microsoft-entra-id)
  - [Request Headers](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob?tabs=microsoft-entra-id#request-headers-all-blob-types)
- [Create a service SAS](https://learn.microsoft.com/en-us/rest/api/storageservices/create-service-sas) — params, permissions, how SAS generation works
- [API Versions](https://learn.microsoft.com/en-us/rest/api/storageservices/versioning-for-the-azure-storage-services)
- [Understanding block blobs, append blobs, and page blobs](https://learn.microsoft.com/en-us/rest/api/storageservices/understanding-block-blobs--append-blobs--and-page-blobs)
