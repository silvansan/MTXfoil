import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/permissions'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit Log', plural: 'Audit Logs' },
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['action', 'summary', 'actor', 'createdAt'],
    group: 'System',
  },
  access: {
    read: ({ req }) => isAdmin(req.user),
    create: () => false,
    update: () => false,
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Config apply', value: 'config.apply' },
        { label: 'Stream created', value: 'stream.create' },
        { label: 'Stream updated', value: 'stream.update' },
        { label: 'Stream deleted', value: 'stream.delete' },
        { label: 'User created', value: 'user.create' },
        { label: 'User updated', value: 'user.update' },
        { label: 'User deleted', value: 'user.delete' },
        { label: 'User role changed', value: 'user.role_change' },
        { label: 'CORS updated', value: 'cors.update' },
        { label: 'CORS preset applied', value: 'cors.preset_apply' },
        { label: 'CORS preset created', value: 'cors.preset_create' },
        { label: 'CORS preset updated', value: 'cors.preset_update' },
        { label: 'CORS preset deleted', value: 'cors.preset_delete' },
        { label: 'Protocol updated', value: 'protocol.update' },
        { label: 'Forwarding created', value: 'forwarding.create' },
        { label: 'Forwarding updated', value: 'forwarding.update' },
        { label: 'Forwarding deleted', value: 'forwarding.delete' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      name: 'resource',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'resourceId',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'summary',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: { readOnly: true },
    },
    {
      name: 'ip',
      type: 'text',
      admin: { readOnly: true },
    },
  ],
}
