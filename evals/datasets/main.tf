data "azurerm_storage_account" "datasets" {
  name                = var.storage_account_name
  resource_group_name = var.resource_group_name
}

data "azurerm_storage_container" "datasets" {
  name               = var.container_name
  storage_account_id = data.azurerm_storage_account.datasets.id
}

locals {
  storage_account_name   = data.azurerm_storage_account.datasets.name
  storage_container_name = data.azurerm_storage_container.datasets.name
  storage_container_id   = data.azurerm_storage_container.datasets.id

  # Flatten each dataset's on-disk files into one entry per blob, keyed by
  # blob path, so a single resource block with for_each can manage every
  # file across every dataset. Tags are per-folder (var.datasets) and
  # trickle down to every file found in that folder.
  #
  # datasets.auto.tfvars is committed, so real PII (e.g. card digits) never
  # lives there — it uses placeholder tokens instead (USER1_CC), substituted
  # here with the real value from var.user_one_last_4_cc (set in the
  # gitignored pii.auto.tfvars).
  dataset_files = merge([
    for dataset in var.datasets : {
      for file in fileset("${path.module}/${dataset.folder}", "*") :
      "${dataset.folder}/${file}" => {
        folder      = dataset.folder
        file        = file
        source_path = "${path.module}/${dataset.folder}/${file}"
        tags = {
          for k, v in dataset.tags :
          k => replace(v, "USER1_CC", var.user_one_last_4_cc)
        }
      }
    }
  ]...)
}

resource "azurerm_storage_blob" "dataset_blobs" {
  for_each               = local.dataset_files
  name                   = each.key
  storage_container_id   = local.storage_container_id
  type                   = "Block"
  source                 = each.value.source_path
  content_md5            = filemd5(each.value.source_path)
}


# ARM API does not support setting tags at blob resource level (data plane),
# only at metadata level (arm control plane).
resource "null_resource" "dataset_blob_tags" {
  for_each = local.dataset_files

  triggers = {
    # "k1=v1;k2=v2" — az storage blob tag set's --tags flag expects
    # space-separated key=value pairs, not a map. Sorted so the trigger
    # string (and thus whether this resource replans) doesn't depend on
    # Terraform's arbitrary map key ordering.
    tags = join(" ", [for k in sort(keys(each.value.tags)) : "${k}=${each.value.tags[k]}"])
  }

  provisioner "local-exec" {
    command = <<-EOT
      az storage blob tag set \
        --account-name ${local.storage_account_name} \
        --container-name ${local.storage_container_name} \
        --name ${each.key} \
        --tags ${self.triggers.tags}
    EOT
  }

  depends_on = [azurerm_storage_blob.dataset_blobs]
}
