import { useUploadsStore } from '~/stores/uploads.store'
import { useWorkflowStore } from '~/stores/workflow.store'
import { UPLOAD_STATUS } from '~~/shared/enums/upload-status.js'

/**
 * Builds the per-row action menu for the uploads list table.
 * Closes over the uploads + workflow stores; callers just invoke
 * `getRowActions(row)`.
 *
 * Edge case: JSON links are gated on `upload.analyzedAt` (set when the
 * full workflow completes). If OCR succeeded but a later step (e.g.
 * annotations) failed, `analyzedAt` will be unset and the JSON links
 * are hidden — even though the summary/ocr/polygons JSONs would still
 * return valid data. Acceptable trade-off for menu simplicity; debug
 * partial failures via the upload detail page or direct API access.
 */
export function useUploadRowActions () {
  const uploadsStore = useUploadsStore()
  const workflowStore = useWorkflowStore()
  const toast = useToast()

  function canAnalyze (upload) {
    return upload.status === UPLOAD_STATUS.UPLOADED
      && !workflowStore.isProcessingByHashId(upload.hashId)
  }

  async function deleteUpload (hashId, title, blobName) {
    if (!confirm(`Are you sure you want to delete '${title}' (${blobName})?`)) {
      return
    }
    try {
      await uploadsStore.deleteUpload(hashId)
    }
    catch (err) {
      console.error('Failed to delete upload:', err)
      toast.add({
        title: 'Failed to delete upload',
        description: 'Please try again.',
        color: 'error',
      })
    }
  }

  function getRowActions (row) {
    const upload = row.original
    const hashId = upload.hashId
    const hasAnalysis = !!upload.analyzedAt

    return [
      [
        { label: 'Actions', type: 'label' },
        {
          label: 'View Receipt',
          disabled: !upload.receipt,
          onSelect: () => upload.receipt && navigateTo(`/receipts/${upload.receipt.id}`),
        },
      ],
      [
        { label: 'Analysis', type: 'label' },
        {
          label: 'Re-run Analysis',
          disabled: !canAnalyze(upload),
          icon: 'i-lucide-bot',
          onSelect: () => workflowStore.triggerWorkflow(hashId),
        },
        ...(hasAnalysis
          ? [
              {
                label: 'View Summary (JSON)',
                icon: 'i-lucide-file-braces',
                onSelect: () => window.open(`/api/analysis/summary/${hashId}`, '_blank'),
              },
              {
                label: 'View Annotations (JSON)',
                icon: 'i-lucide-file-braces',
                onSelect: () => window.open(`/api/uploads/${hashId}/annotations`, '_blank'),
              },
              {
                label: 'View OCR (JSON)',
                icon: 'i-lucide-file-braces',
                onSelect: () => window.open(`/api/uploads/${hashId}/ocr`, '_blank'),
              },
              {
                label: 'View Polygons (JSON)',
                icon: 'i-lucide-file-braces',
                onSelect: () => window.open(`/api/uploads/${hashId}/polygons`, '_blank'),
              },
            ]
          : []),
      ],
      [
        {
          label: 'Delete',
          icon: 'i-lucide-trash',
          onSelect: () => deleteUpload(hashId, upload.title, upload.blobName),
        },
      ],
    ]
  }

  return { getRowActions }
}
