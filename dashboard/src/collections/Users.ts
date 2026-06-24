import type { CollectionConfig } from 'payload'

import { canAccessAdmin, canManageUsers, isAdmin, isOperator, isSuperAdmin } from '@/lib/permissions'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'updatedAt'],
  },
  access: {
    admin: ({ req }) => canAccessAdmin(req.user),
    create: ({ req }) => canManageUsers(req.user) || isAdmin(req.user),
    read: ({ req }) => {
      if (isSuperAdmin(req.user) || isAdmin(req.user)) return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (isSuperAdmin(req.user) || isAdmin(req.user)) return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'operator',
      options: [
        { label: 'Super Admin', value: 'superadmin' },
        { label: 'Admin', value: 'admin' },
        { label: 'Operator', value: 'operator' },
        { label: 'Viewer', value: 'viewer' },
      ],
      access: {
        update: ({ req }) => isSuperAdmin(req.user) || isAdmin(req.user),
      },
    },
    {
      name: 'displayName',
      type: 'text',
    },
  ],
}
