variable "resource_group_name" {
  type        = string
  description = "Name of Azure resource group containing the storage account."
}

variable "storage_account_name" {
  type = string
  description = "Name of Azure storage account with the datasets"
  default ="storageaccount"
}

variable "container_name" {
  type = string
  description = "Name of Azure Blob Storage Container with the datasets"
  default = "container"
}

variable "datasets" {
  type = list(object({
    folder = string
    tags   = map(string)
  }))
  description = "One entry per dataset folder. See datasets.auto.tfvars for details."
}

variable "user_one_last_4_cc" {
  type        = string
  default     = ""
  # sensitive   = true # only ever run locally on my machine.
  description = "Real last-4 card digits substituted for the USER1_CC placeholder in datasets.auto.tfvars. Set in a gitignored file."
}
