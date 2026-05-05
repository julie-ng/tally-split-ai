locals {
  name         = var.project_name
  name_compact = lower(replace(local.name, "-", ""))
  default_tags = {
    project = var.project_name
    env     = var.environment
  }
  openai_account_name    = "${local.name}-openai-${var.environment}"
  doc_intel_account_name = "${local.name}-doc-intel-${var.environment}"
  tags                   = merge(local.default_tags, var.default_tags)
}

resource "azurerm_resource_group" "project" {
  name     = "${local.name}-rg"
  location = var.location
  tags     = local.tags
}

resource "azurerm_storage_account" "blobs" {
  name                     = local.name_compact
  resource_group_name      = azurerm_resource_group.project.name
  location                 = azurerm_resource_group.project.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  blob_properties {
    cors_rule {
      allowed_origins    = ["*"]
      allowed_methods    = ["GET", "PUT", "POST", "OPTIONS", "HEAD"]
      allowed_headers    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }

  tags = local.tags
}

resource "azurerm_storage_container" "receipts" {
  name                  = var.storage_container_name
  storage_account_id    = azurerm_storage_account.blobs.id
  container_access_type = "private"
}

resource "azurerm_cognitive_account" "openai" {
  name                  = local.openai_account_name
  location              = var.openai_region
  resource_group_name   = azurerm_resource_group.project.name
  kind                  = "OpenAI"
  sku_name              = var.openai_sku
  custom_subdomain_name = local.openai_account_name

  tags = local.tags
}

resource "azurerm_cognitive_deployment" "gpt4o" {
  name                 = "gpt-4o"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = var.openai_model_name
    version = var.openai_model_version
  }

  sku {
    name     = "GlobalStandard"
    capacity = var.openai_gpt4o_capacity
  }
}

resource "azurerm_cognitive_account" "doc_intelligence" {
  name                  = local.doc_intel_account_name
  location              = azurerm_resource_group.project.location
  resource_group_name   = azurerm_resource_group.project.name
  kind                  = var.azure_doc_intelligence_model
  sku_name              = var.azure_doc_intelligence_sku
  custom_subdomain_name = local.doc_intel_account_name

  tags = local.tags
}
