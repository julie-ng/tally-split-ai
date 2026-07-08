environment            = "local"
project_name           = "tally-split"
location               = "northeurope"
storage_container_name = "receipts"

azure_doc_intelligence_model = "FormRecognizer"
azure_doc_intelligence_sku   = "S0"
tags                         = {}

default_tags = {
  iac = "terraform"
}
