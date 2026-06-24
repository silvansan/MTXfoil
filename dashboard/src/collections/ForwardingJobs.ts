import type { CollectionConfig } from 'payload'

import { canManageForwarding, isAdmin } from '@/lib/permissions'

export const ForwardingJobs: CollectionConfig = {
  slug: 'forwarding-jobs',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'enabled', 'stream'],
  },
  access: {
    read: ({ req }) => canManageForwarding(req.user) || Boolean(req.user),
    create: ({ req }) => canManageForwarding(req.user),
    update: ({ req }) => canManageForwarding(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (!req.payload) return
        const { enqueueForwardingJob } = await import('@/lib/queue')
        if (doc.enabled && (operation === 'create' || operation === 'update')) {
          await enqueueForwardingJob('start', String(doc.id))
        } else if (!doc.enabled && operation === 'update') {
          await enqueueForwardingJob('stop', String(doc.id))
        }
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'stream',
      type: 'relationship',
      relationTo: 'streams',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'srt-push',
      options: [
        { label: 'SRT Push', value: 'srt-push' },
        { label: 'RTMP Push', value: 'rtmp-push' },
        { label: 'HLS Pull', value: 'hls-pull' },
      ],
    },
    { name: 'destinationUrl', type: 'text', required: true },
    { name: 'enabled', type: 'checkbox', defaultValue: false },
    { name: 'autoStart', type: 'checkbox', defaultValue: true },
    { name: 'restartOnFailure', type: 'checkbox', defaultValue: true },
    { name: 'notes', type: 'textarea' },
    {
      name: 'workerStatus',
      type: 'select',
      defaultValue: 'idle',
      admin: { readOnly: true },
      options: [
        { label: 'Idle', value: 'idle' },
        { label: 'Running', value: 'running' },
        { label: 'Error', value: 'error' },
        { label: 'Stopped', value: 'stopped' },
      ],
    },
  ],
}
