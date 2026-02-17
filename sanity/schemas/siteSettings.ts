import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'bioDescription',
      title: 'Bio Description',
      type: 'text',
      description: 'Main bio text (founded by..., studio description)',
    }),
    defineField({
      name: 'portfolioPdf',
      title: 'Portfolio PDF',
      type: 'file',
      options: {
        accept: '.pdf',
      },
      description: 'PDF file for "Download portfolio" link',
    }),
    defineField({
      name: 'publications',
      title: 'Selected Publications',
      type: 'array',
      description: 'Format: (outlet links) - (project title). E.g. Highsnobiety, Nss sport, Hypebeast - Nike ACG Train',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'outlets',
              title: 'Outlets (links)',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    { name: 'title', title: 'Outlet name', type: 'string' },
                    { name: 'url', title: 'URL', type: 'url' },
                  ],
                },
              ],
            },
            { name: 'projectTitle', title: 'Project title', type: 'string' },
          ],
          preview: {
            select: { projectTitle: 'projectTitle' },
            prepare({ projectTitle }) {
              return { title: projectTitle || 'Untitled publication' }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'exhibitions',
      title: 'Selected Exhibitions',
      type: 'array',
      description: 'Format: (title) - Review on (links). E.g. @Studio Cratere, "by PHONE", 23/10/2024 - Review on Highsnobiety, Nss sport, Hypebeast',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', title: 'Exhibition title', type: 'string' },
            {
              name: 'reviewLinks',
              title: 'Review links',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    { name: 'title', title: 'Outlet name', type: 'string' },
                    { name: 'url', title: 'URL', type: 'url' },
                  ],
                },
              ],
            },
          ],
          preview: {
            select: { title: 'title' },
            prepare({ title }) {
              return { title: title || 'Untitled exhibition' }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'commissions',
      title: 'Commissions',
      type: 'string',
      description: 'e.g. "Represented by C41.eu"',
    }),
    defineField({
      name: 'commissionsUrl',
      title: 'Commissions Link',
      type: 'url',
      description: 'Optional URL to make the commissions text a link',
    }),
    defineField({
      name: 'studioEmail',
      title: 'Studio Email',
      type: 'string',
    }),
    defineField({
      name: 'studioPhone',
      title: 'Studio Phone',
      type: 'string',
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact Email (General Info)',
      type: 'string',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'string',
    }),
    defineField({
      name: 'websiteLabel',
      title: 'Website Label',
      type: 'string',
      description: 'e.g. "Matteo Viti"',
    }),
    defineField({
      name: 'websiteUrl',
      title: 'Website URL',
      type: 'url',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Site Settings',
      }
    },
  },
})
