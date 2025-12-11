import { defineField, defineType } from 'sanity'
import { ImageArrayInput } from '../components/ImageArrayInput'

export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Project Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(1900).max(2100),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      components: {
        input: ImageArrayInput,
      },
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'title',
              title: 'Title',
              type: 'string',
              hidden: true,
            },
            {
              name: 'color',
              title: 'Color',
              type: 'string',
              hidden: true,
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'pdf',
      title: 'PDF File',
      type: 'file',
      options: {
        accept: '.pdf',
      },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      year: 'year',
    },
    prepare({ title, year }) {
      return {
        title: title || 'Untitled Project',
        subtitle: year ? `Year: ${year}` : '',
      }
    },
  },
})


