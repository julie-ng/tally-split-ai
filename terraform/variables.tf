variable "location" {
  type        = string
  description = "Azure region for all resources."
}

variable "environment" {
  type        = string
  description = "Environment name also used in resource names and tags."
}

variable "project_name" {
  type        = string
  description = "Project name used as a prefix for resources."
}

variable "storage_container_name" {
  type        = string
  description = "Blob container for receipt uploads."
}

variable "openai_sku" {
  type        = string
  description = "SKU for Azure OpenAI Cognitive Services."
}

variable "openai_model_name" {
  type        = string
  description = "OpenAI Model Name for annotations."
}

variable "openai_model_version" {
  type        = string
  description = "OpenAI Model version for annotations."
}

variable "openai_gpt4o_capacity" {
  type        = number
  description = "TPM capacity (in thousands) for the gpt-4o deployment."
}

variable "openai_region" {
  type        = string
  description = "Region for Azure OpenAI Cognitive Services. As of May 2026 only available in following European regions: swedencentral, uksouth, westeurope, northeurope, francecentral, germanywestcentral, switzerlandnorth, italynorth, spaincentral, norwayeast, polandcentral"
}

variable "azure_doc_intelligence_model" {
  type        = string
  description = "Model name, e.g. FormRecognizer for Document Intelligence Cognitive Services."
}

variable "azure_doc_intelligence_sku" {
  type        = string
  description = "SKU for Document Intelligence Cognitive Services."
}

variable "default_tags" {
  type        = map(string)
  description = "Common baseline tags for Azure resources."
}

variable "tags" {
  type        = map(string)
  description = "Map for environment specific config"
}
