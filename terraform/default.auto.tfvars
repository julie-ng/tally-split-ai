environment                  = "local"
project_name                 = "tally-split"
location                     = "northeurope"
storage_container_name       = "receipts"
openai_sku                   = "S0"
openai_model_name            = "gpt-4o"
openai_model_version         = "2025-01-01-preview"
openai_gpt4o_capacity        = 10
azure_doc_intelligence_model = "FormRecognizer"
azure_doc_intelligence_sku   = "S0"
tags                         = {}

default_tags = {
  iac = "terraform"
}
