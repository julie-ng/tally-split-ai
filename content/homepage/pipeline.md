---
workflow:
- title: Upload
  # stack: Azure Blob Storage
  icon: i-lucide-cloud-upload
  description: |
    Drag and drop UI uploads directly to Azure Blob storage, without funneling files through app for better performance and user experience.
  image:
    src: /images/landing/upload-sequence-preview.png
    alt: Upload Image Sequence Diagram
  # preview: |
  #   Something else goes here
    
- title: Extract Text (OCR)
  stack: Azure Document Intelligence
  icon: i-lucide-scan-eye
  description: |
    A worker sends a read-only URL for Azure Document Intelligence to directly fetch and analyze the image. Azure to Azure traffic remains on the Microsoft backbone, preserving performance.

    The Azure `prebuilt-receipt` model extracts line items, price, total, date, vendor, etc.
  image:
    src: /images/landing/pipeline-1-ocr-adjusted.png
    alt: Azure OCR Result
  # preview: |        
  #   Document Intelligence also returns bounding boxes, which are rendered for easier human review of AI analysis.
  
- title: Detect Handwritten Annotations
  stack: gpt-4o
  icon: i-lucide-line-squiggle
  description: |
    Instead of training a custom model, OCR results and blob image are sent to `gpt-4o` to process according to my conventions:
    - Handwritten initials &rarr; indentify payer.
    - Handwritten numbers &rarr; receipt total including cash tip.
    - Strikethroughs &rarr; remove line item from receipt total.
    - Circles &rarr; include these line items OR this is the user determined total.
  image:
    src: /images/landing/pipeline-2-handwritten-annotations-adjusted.jpg
    alt: Handwritten annotations
  preview: |
    Example: Strikethroughs removes the line item from the receipt total. Initials indicate who paid.
    
    [See all conventions &rarr;](https://github.com/julie-ng/tally-split-ai/blob/main/trigger/instructions/analyze-annotations.md){target="_blank"}
    
- title: Normalize Contents
  stack: gpt-4o-mini 
  icon: i-lucide-languages
  description: |
    Azure Document Intelligence results can vary depending on receipt type and photo quality if the receipt is faded or slightly crumpled. The cheaper `gpt4o-mini` is used to resolve these issues and normalize fields, as well as consolidate franchised stores into umbrella parent company name. 
  preview: |
    ```
    Generate a concise title in English in the format: "<merchant name> - <category>" where <category> summarizes what was purchased (e.g., "Groceries", "Dinner", "Office Supplies").

    For the merchant name, use the everyday colloquial name — NOT the legal entity name, for example:    
    - "Rewe Markt GmbH" → "Rewe"
    - "dm-drogerie markt GmbH + Co. KG" → "dm"
    ```
    [Read system prompt &rarr;](https://github.com/julie-ng/tally-split-ai/blob/main/trigger/instructions/normalize-receipt.md){target="_blank"}

- title: Create Split and Assign Payer
  stack: gpt-4o
  icon: i-lucide-user-round-search
  description: |
    Another worker decides on the split amount and assigns the payer based on OCR and annotation analyses. Users can optionally provide custom instructions to LLM to identify payers. 

    In this way, users have 100% control on the trade-off between privacy and automagic.
  preview: |
    ```text        
    Handwritten initials take precedent. But if none are found, this information can be used to identify payer: 
    - Alice tends to pay with EC or Girocard. 
    - Bob tends to pay with "Visa Debit" or Mastercard ending in 1234.
    ```
    [Read system prompt &rarr;](https://github.com/julie-ng/tally-split-ai/blob/main/trigger/instructions/adjust-split.md){target="_blank"}
---

### Architecture

# Multi-layer LLM pipeline

Decision: Orchestrator - mostly synchronous (link to Google paper)
Craftsmanship: divide up the tasks. Automate up to 99%. Give human clear signal and ability to override.
