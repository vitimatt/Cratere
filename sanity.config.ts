import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './sanity/schemas'
import { uploadWithFilenameAssetSource } from './sanity/components/UploadWithFilenameAssetSource'

const structure = (S: any) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site Settings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
        ),
      ...S.documentTypeListItems().filter((listItem: any) => listItem.getId() !== 'siteSettings'),
    ])

export default defineConfig({
  name: 'default',
  title: 'Cratere CMS',

  projectId: 'jeo4p1su',
  dataset: 'production',

  basePath: '/studio',

  plugins: [
    structureTool({ structure }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  form: {
    image: {
      assetSources: (prev) => [uploadWithFilenameAssetSource, ...prev],
    },
  },
})


