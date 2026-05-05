environment            = "local"
project_name           = "tally-split"
location               = "northeurope"
storage_container_name = "receipts"
openai_sku             = "S0"
openai_model_name      = "gpt-4o"
openai_model_version   = "2024-11-20" # gpt-4o
openai_gpt4o_capacity  = 10
openai_region          = "swedencentral" # highest capacity

azure_doc_intelligence_model = "FormRecognizer"
azure_doc_intelligence_sku   = "S0"
tags                         = {}

default_tags = {
  iac = "terraform"
}
