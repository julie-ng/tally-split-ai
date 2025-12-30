# Architecture

Note: "chunks" (generic) and "blocks" (Azure specific) are used interchangeably.

## Frontend Architecture

- SAS URLs/tokens always fetched from backend for security purposes, i.e. account access keys are never exposed to frontend
- **Frontend** (page or component): splits file(s) into chunks
- **Chunk Component**: might be empty UI, but tracks block upload progress
- **Pinia Store**: used to share data across Nuxt components and pages

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Nuxt Server
    participant Pinia
    User->>Frontend: Drop files
    Frontend->>+Nuxt Server: New file upload request
    Nuxt Server-->>Nuxt Server: Generate upload SAS URL
    Nuxt Server-->>-Frontend: Return file name and Azure SAS URL
    create participant Chunks Component(s)    
    Frontend->>Chunks Component(s): Split file into chunks
    Frontend->>+Pinia: Store file metadata, incl. chunk IDs
    Chunks Component(s)->>Chunks Component(s): Upload chunk to Azure SAS URL
    destroy Chunks Component(s)
    Chunks Component(s)->>Pinia: [@emit] upload status
    Pinia-->>-Frontend: Listen to chunks
    Note over Frontend, Pinia: After all chunks uploaded
    Frontend->>Frontend: Commit Azure Blob Block List
    Frontend->>+Pinia: Update file status to 'uploaded'
    User->>+Frontend: Show image
    Frontend->>+Nuxt Server: New file read URL
    Nuxt Server-->>Nuxt Server: Generate read-only SAS URL
    Nuxt Server-->>-Frontend: Return read-only file URL
    Frontend-->>-User: Preview Image
```

## Cloud Architecture

### Security Features

- Files never touch our web servers.
- Blobs are default private, i.e. inaccessible.
- SAS tokens generated on demand for action specific (e.g. upload vs read) and temporary access, e.g. a few minutes.

> [!IMPORTANT]
> Although Azure recommends _against_ using service SAS tokens, it is not appropriate in this use case. In our Software as a Service (SaaS) scenario:
> - [Workload Identities](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview) do not apply because end-user uploads _directly_ to Azure for performance and resiliency advantages. 
> - [User delegation SAS](https://learn.microsoft.com/en-us/rest/api/storageservices/create-user-delegation-sas) do not apply because our SaaS application owns identity and access management domain and does _not_ use Entra ID as an identity provider. Additionally User SAS tokens also _cannot_ be revoked, a security disadvantage we want to avoid.
> 
> Therefore, **the architecture below is the _most secure_ cloud architecture for _this_ SaaS scenario**.

### Why upload directly to Azure?

* **Performance** - Avoid additional hops and latency when funnelling through app backend
* **Resilience** - Leverage Azure's built-in features to handle (retry-able) blocks and committing back into single blob file

```mermaid
sequenceDiagram
    autonumber
    participant Azure
    actor User
    participant Frontend
    participant Backend
    User->>+Frontend: Drag and drop file
    Frontend->>+Backend: Request Azure upload URL
    Backend-->>Backend: Generate URL with read/write SAS token
    Backend-->>-Frontend: Return Azure upload URL
    Frontend-->>-User: Return Azure upload URL
    note over User, Azure: Upload directly to Azure
    rect rgb(248, 249, 250)
        par Upload
            User->>+Azure: [PUT] Block 1
            Azure-->>-User: 201 Created
            User->>+Azure: [PUT] Block …N
            Azure-->>-User: 201 Created
        end
    end
    note over User, Azure: After all blocks are uploaded
    rect rgb(248, 249, 250)
        critical Commit Upload
            User->>+Azure: [PUT] Block List
            Azure->>Azure: Combine N blocks into 1 blob file
            Azure-->>-User: 201 Created
        end
    end
    User->>+Frontend: Notify upload completion
    Frontend->>+Backend: Get image URL
    Backend->>Backend: Generate new read-only SAS token
    Backend-->>-Frontend: image URL with token
    Frontend-->>-User: Show image preview
```

### Example Azure URLs

#### [PUT Block](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block?tabs=microsoft-entra-id) 

- URL: `https://myaccount.blob.core.windows.net/mycontainer/myblob?comp=block&blockid=id` 
- Query Params:
  - `comp=block`
  - `blockid={id}`
  - `sv={token}`
#### [PUT Block List](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block-list?tabs=microsoft-entra-id)

- URL: `https://myaccount.blob.core.windows.net/mycontainer/myblob?comp=blocklist`
  - Query Params:
  - `comp=blocklist` 
- Sample Request:

  ```
  Request Syntax:  
  PUT https://myaccount.blob.core.windows.net/mycontainer/myblob?comp=blocklist HTTP/1.1  
    
  Request Headers:  
  x-ms-date: Wed, 31 Aug 2011 00:17:43 GMT  
  x-ms-version: 2011-08-18  
  Content-Type: text/plain; charset=UTF-8  
  Authorization: SharedKey myaccount:DJ5QZSVONZ64vAhnN/wxcU+Pt5HQSLAiLITlAU76Lx8=  
  Content-Length: 133  
    
  Request Body:  
  <?xml version="1.0" encoding="utf-8"?>  
  <BlockList>  
    <Latest>AAAAAA==</Latest>  
    <Latest>AQAAAA==</Latest>  
    <Latest>AZAAAA==</Latest>  
  </BlockList>  
  ```

### PUT Blob Requests

Per [request headers docs](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob?tabs=microsoft-entra-id#request-headers-all-blob-types), these are the minimum headers we are setting:

| Header | Value |
|:--|:--|
| `Content-Type` | ?? Insomnia used `image/png`. Default is `application/octet-stream` |
| `Date` | [ISO-8601 Format](https://learn.microsoft.com/en-us/rest/api/storageservices/formatting-datetime-values), e.g. `YYYY-MM-DD` | 
| `Content-MD5` | Optional. But we should send it too. |
| `x-ms-version` | Azure Storage API version e.g. `2025-11-05` |
| `x-blob-type` | `BlockBlob` |
| `x-ms-tags` | query-string encoded tags on blob. |

Not required (for our scenario):

- `Authorization` - because token already in URLs
- `Content-Length` - not required for block blobs

---

## References

#### General

- [Mozilla: 201 Status Code - Created](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/201)
- [Azure Docs: Understanding block blobs, append blobs, and page blobs](https://learn.microsoft.com/en-us/rest/api/storageservices/understanding-block-blobs--append-blobs--and-page-blobs)
- [Storage: Create a service SAS](https://learn.microsoft.com/en-us/rest/api/storageservices/create-service-sas) incl. params and permissions tables and how SAS generation works

#### Azure Blob Storage APIs

- Blob Service
  - [API Versions](https://learn.microsoft.com/en-us/rest/api/storageservices/versioning-for-the-azure-storage-services)
  - [Formatting Datetime Values](https://learn.microsoft.com/en-us/rest/api/storageservices/formatting-datetime-values)
  - [Service SaaS Permissions](https://learn.microsoft.com/en-us/rest/api/storageservices/create-service-sas#specify-permissions)

- [REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api)
  - [Request Headers](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob?tabs=microsoft-entra-id#request-headers-all-blob-types)
  - [Put Blob](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob?tabs=microsoft-entra-id)
  - [Put Block](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block?tabs=microsoft-entra-id)
  - [Put Block List](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block-list?tabs=microsoft-entra-id) to commit the blocks
