# Resource Group

output "resource_group" {
  value = {
    id   = azurerm_resource_group.project.id
    name = azurerm_resource_group.project.name
    tags = azurerm_resource_group.project.tags
  }
}

# Storage Account

output "storage_account" {
  value = {
    id             = azurerm_storage_account.blobs.id
    name           = azurerm_storage_account.blobs.name
    tags           = azurerm_storage_account.blobs.tags
    container_name = azurerm_storage_container.receipts.name
  }
}

# GPT-4o (Annotations)

output "azure_openai" {
  value = {
    id   = azurerm_cognitive_account.openai.id
    name = azurerm_cognitive_account.openai.name
    tags = azurerm_cognitive_account.openai.tags
  }
}

output "azure_gpt_4o" {
  value = {
    id                   = azurerm_cognitive_deployment.gpt4o.id
    name                 = azurerm_cognitive_deployment.gpt4o.name
    model                = azurerm_cognitive_deployment.gpt4o.model
    cognitive_account_id = azurerm_cognitive_deployment.gpt4o.cognitive_account_id
  }
}

# Azure Document Intelligence (OCR)

output "document_intelligence" {
  value = {
    id       = azurerm_cognitive_account.doc_intelligence.id
    name     = azurerm_cognitive_account.doc_intelligence.name
    endpoint = azurerm_cognitive_account.doc_intelligence.endpoint
    tags     = azurerm_cognitive_account.doc_intelligence.tags
  }
}

# Account Keys (sensitive = true)

output "azure_storage_account_key" {
  value     = azurerm_storage_account.blobs.primary_access_key
  sensitive = true
}

output "azure_openai_key" {
  value     = azurerm_cognitive_account.openai.primary_access_key
  sensitive = true
}

output "doc_intelligence_key" {
  value     = azurerm_cognitive_account.doc_intelligence.primary_access_key
  sensitive = true
}

# Endpoints

output "document_intelligence_endpoint" {
  value = azurerm_cognitive_account.doc_intelligence.endpoint
}

# Manual construction of endpoint not in Azure API or Docs

output "azure_gpt_4o_annotations_url" {
  value = "https://${azurerm_cognitive_account.openai.custom_subdomain_name}.openai.azure.com/openai/deployments/${var.openai_deployment_name}/chat/completions?api-version=${var.openai_api_version}"
}
