output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "storage_account_key" {
  value     = azurerm_storage_account.main.primary_access_key
  sensitive = true
}

output "storage_container_name" {
  value = azurerm_storage_container.receipts.name
}

output "openai_endpoint" {
  value = azurerm_cognitive_account.openai.endpoint
}

output "openai_key" {
  value     = azurerm_cognitive_account.openai.primary_access_key
  sensitive = true
}

output "openai_gpt4o_deployment_name" {
  value = azurerm_cognitive_deployment.gpt4o.name
}

output "doc_intelligence_endpoint" {
  value = azurerm_cognitive_account.doc_intelligence.endpoint
}

output "doc_intelligence_key" {
  value     = azurerm_cognitive_account.doc_intelligence.primary_access_key
  sensitive = true
}
