# Docs (for humans)

Julie written for human understanding.

---

## Frontend Architecture

- [frontend-architecture.md](./frontend-architecture.md)  
  Component and Pinia store roles in the upload flow, with sequence diagram

#### References

- [unjs > H3 > Runtime type checking](https://unjs.io/blog/2023-08-15-h3-towards-the-edge-of-the-web#runtime-type-safe-request-utils)
- [Mastering Nuxt: Server Middleware is an Anti-Pattern in Nuxt](https://masteringnuxt.com/blog/server-middleware-is-an-anti-pattern-in-nuxt)

---

## Azure Blob Storage

- [blob-storage-architecture.md](./blob-storage-architecture.md)  
  Why files upload directly to Azure, security model, SAS token flow, and cloud sequence diagram

- [azure-blob-storage.md](./azure-apis.md)  
  Azure Blob Storage REST API reference: PUT Block, PUT Block List, and required request headers

#### References

- [Blob Service API Versions](https://learn.microsoft.com/en-us/rest/api/storageservices/versioning-for-the-azure-storage-services)  
- [Blob Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api)

---

## Azure Document Intelligence

#### References

- [Documentation: Receipt Model](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/receipt?view=doc-intel-4.0.0)
  - [Receipt Model Schema](https://github.com/Azure-Samples/document-intelligence-code-samples/blob/main/schema/2024-11-30-ga/receipt.md)
- [API Reference: Document Models - Analyze Document](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/analyze-document?view=rest-aiservices-v4.0%20(2024-11-30)&tabs=HTTP)
