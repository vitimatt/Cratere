import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'privateMedia',
  title: 'Private Media (PDFs)',
  type: 'document',
  description: 'PDFs uploaded here are accessible at cratere.studio/Media/private/[filename]',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Internal label for this file (optional)',
    }),
    defineField({
      name: 'file',
      title: 'PDF File',
      type: 'file',
      options: {
        accept: '.pdf',
      },
      validation: (Rule) => Rule.required(),
      description: 'The filename will be used in the URL: /Media/private/filename.pdf',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      filename: 'file.asset->originalFilename',
    },
    prepare({ title, filename }) {
      return {
        title: title || filename || 'Untitled PDF',
        subtitle: filename ? `URL: /Media/private/${filename}` : '',
      }
    },
  },
})
