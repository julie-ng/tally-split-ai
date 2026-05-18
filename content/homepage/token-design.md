---
title: Designing granular HMAC Tokens
intro: |
  Custom HMAC tokens are overengineered for a personal app. The enterprise architect in me, however, enjoys security modelling and breaking my own designs.
outtro: |
  I'm excited by AI but also mindful that our security models need to adapt - and even small applications should provide guardrails, to protect user data from unintended actions.
components:  
  - example: 'f6bce3f0-566d-…'
    caption: Workflow Run UUID
  
  - example: '2026-05-13T16:24:03.915Z'
    caption: ISO 8601 Timestamp
  
  - example: 'receipt:{receiptId}'
    caption: Resource Type & ID

  - example: 'split:write,upload:read…'
    caption: Scoped Permissions
---
