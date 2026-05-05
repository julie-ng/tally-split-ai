variable "environment_suffix" {
  type        = string
  description = "Environment suffix used in resource names (e.g. 'prod', 'dev')."
}

variable "location" {
  type        = string
  description = "Azure region for all resources."
  default     = "northeurope"
}

variable "project_name" {
  type        = string
  description = "Project name used as a prefix for resources."
  default     = "tally-split"
}

variable "storage_account_name" {
  type        = string
  description = "Globally unique Storage Account name (3-24 lowercase alphanumeric)."
}

variable "storage_container_name" {
  type        = string
  description = "Blob container for receipt uploads."
  default     = "receipts"
}

variable "openai_account_name" {
  type        = string
  description = "Azure OpenAI Cognitive Services account name."
}

variable "openai_gpt4o_capacity" {
  type        = number
  description = "TPM capacity (in thousands) for the gpt-4o deployment."
  default     = 10
}

variable "doc_intelligence_account_name" {
  type        = string
  description = "Document Intelligence (FormRecognizer) Cognitive Services account name."
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all resources."
  default     = {}
}
