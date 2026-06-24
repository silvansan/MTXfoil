import type { CollectionConfig } from 'payload'

import { canReadStreamCatalog, isAdmin, isOperator } from '@/lib/permissions'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'date'],
  },
  access: {
    read: ({ req }) => canReadStreamCatalog(req.user),
    create: ({ req }) => isOperator(req.user),
    update: ({ req }) => isOperator(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'date', type: 'date' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    { name: 'description', type: 'textarea' },
    { name: 'defaultDomain', type: 'text' },
    { name: 'notes', type: 'textarea' },
  ],
}
