import type { CollectionConfig } from 'payload'

import { recordAudit } from '@/lib/audit-log'
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
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (!req.payload) return

        if (operation === 'create') {
          await recordAudit(req.payload, req, {
            action: 'user.create',
            resource: 'users',
            resourceId: doc.id,
            summary: `User created: ${doc.email}`,
            metadata: { role: doc.role },
          })
          return
        }

        if (previousDoc?.role !== doc.role) {
          await recordAudit(req.payload, req, {
            action: 'user.role_change',
            resource: 'users',
            resourceId: doc.id,
            summary: `User role changed: ${doc.email} (${previousDoc?.role} → ${doc.role})`,
            metadata: { from: previousDoc?.role, to: doc.role },
          })
          return
        }

        await recordAudit(req.payload, req, {
          action: 'user.update',
          resource: 'users',
          resourceId: doc.id,
          summary: `User updated: ${doc.email}`,
        })
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        if (req.payload) {
          await recordAudit(req.payload, req, {
            action: 'user.delete',
            resource: 'users',
            resourceId: doc.id,
            summary: `User deleted: ${doc.email}`,
          })
        }
      },
    ],
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
