import React, { useCallback, useState } from 'react'
import { useClient } from 'sanity'
import { Card, Flex, Stack, Box, Spinner, Text } from '@sanity/ui'

/**
 * Custom asset source that uploads files and patches the asset's originalFilename
 * after upload. This fixes Sanity's deduplication: when the same file content
 * is uploaded with a different name, Sanity reuses the asset but keeps the old
 * originalFilename. We patch it to use the filename the user actually chose.
 */
export function UploadWithFilenameAssetSource(props: {
  onSelect: (assets: Array<{ kind: 'assetDocumentId'; value: string }>) => void
  onClose: () => void
  selectionType: 'single' | 'multiple'
  assetType: 'file' | 'image'
}) {
  const { onSelect, onClose, selectionType, assetType } = props
  const client = useClient({ apiVersion: '2024-01-01' })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return

      setUploading(true)
      setError(null)

      try {
        const type = assetType === 'image' ? 'image' : 'file'
        const results: Array<{ kind: 'assetDocumentId'; value: string }> = []

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (!file) continue

          const asset = await client.assets.upload(type, file, {
            filename: file.name,
          })

          // Patch the asset to ensure originalFilename matches the uploaded filename.
          // This fixes deduplication: when the same file content is uploaded with
          // a different name, Sanity reuses the asset but keeps the old filename.
          await client.patch(asset._id).set({ originalFilename: file.name }).commit()

          results.push({ kind: 'assetDocumentId', value: asset._id })
        }

        if (selectionType === 'single' && results.length > 0) {
          onSelect([results[0]])
        } else {
          onSelect(results)
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
        ;(e.target as HTMLInputElement).value = ''
      }
    },
    [client, assetType, selectionType, onSelect, onClose],
  )

  return (
    <Card padding={4}>
      <Stack space={4}>
        <Flex align="center" gap={3}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              background: 'var(--card-bg-color)',
              border: '1px solid var(--card-border-color)',
              borderRadius: 4,
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            <input
              type="file"
              accept={assetType === 'image' ? 'image/*' : '*'}
              multiple={selectionType === 'multiple'}
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            {uploading ? <Spinner /> : null}
            <Text size={2} as="span">
              {uploading ? 'Uploading…' : `Choose ${assetType === 'image' ? 'image' : 'file'}(s) from computer`}
            </Text>
          </label>
        </Flex>
        {error && (
          <Box padding={2} style={{ background: 'var(--card-danger-fg-color)', color: 'white', borderRadius: 4 }}>
            <Text size={2}>{error}</Text>
          </Box>
        )}
        <Text size={1} muted>
          The filename will be preserved even when re-uploading the same image with a different name.
        </Text>
      </Stack>
    </Card>
  )
}

export const uploadWithFilenameAssetSource = {
  name: 'uploadWithFilename',
  title: 'Upload (preserve filename)',
  component: UploadWithFilenameAssetSource,
}
