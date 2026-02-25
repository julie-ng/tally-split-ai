# Azure APIs Reference

## Azure Blob Storage API Reference

- **Blob Service**
  - [API Versions](https://learn.microsoft.com/en-us/rest/api/storageservices/versioning-for-the-azure-storage-services)
  - [Formatting Datetime Values](https://learn.microsoft.com/en-us/rest/api/storageservices/formatting-datetime-values)
  - [Service SaaS Permissions](https://learn.microsoft.com/en-us/rest/api/storageservices/create-service-sas#specify-permissions)
- [Blob Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api)
  - [Request Headers](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob?tabs=microsoft-entra-id#request-headers-all-blob-types)
  - [Put Blob](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob?tabs=microsoft-entra-id)
  - [Put Block](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block?tabs=microsoft-entra-id)
  - [Put Block List](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block-list?tabs=microsoft-entra-id) to commit the blocks

### PUT Block

[Docs](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block?tabs=microsoft-entra-id)

- URL: `https://myaccount.blob.core.windows.net/mycontainer/myblob?comp=block&blockid=id`
- Query Params:
  - `comp=block`
  - `blockid={id}`
  - `sv={token}`

### PUT Block List

[Docs](https://learn.microsoft.com/en-us/rest/api/storageservices/put-block-list?tabs=microsoft-entra-id)

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

### PUT Blob Request Headers

Per [request headers docs](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob?tabs=microsoft-entra-id#request-headers-all-blob-types), these are the minimum headers we are setting:

| Header | Value |
|:--|:--|
| `Content-Type` | ?? Insomnia used `image/png`. Default is `application/octet-stream` |
| `Date` | [ISO-8601 Format](https://learn.microsoft.com/en-us/rest/api/storageservices/formatting-datetime-values), e.g. `YYYY-MM-DD` |
| `Content-MD5` | Optional. But we should send it too. |
| `x-blob-type` | `BlockBlob` |
| `x-ms-tags` | query-string encoded tags on blob. |

Not required (for our scenario):

- `Authorization` - because token already in URLs
- `Content-Length` - not required for block blobs
- `x-ms-version` - not required, because we are not doing authorized request.
