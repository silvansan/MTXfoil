import type { CollectionConfig } from 'payload'

import type { Stream } from '@/payload-types'
import { syncStreamToMediaMtx } from '@/lib/config-sync'
import { recordAudit } from '@/lib/audit-log'
import { canManageForwarding, isAdmin } from '@/lib/permissions'

export const ForwardingJobs: CollectionConfig = {
  slug: 'forwarding-jobs',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'enabled', 'stream'],
  },
  access: {
    read: ({ req }) => canManageForwarding(req.user),
    create: ({ req }) => canManageForwarding(req.user),
    update: ({ req }) => canManageForwarding(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (!req.payload) return

        await recordAudit(req.payload, req, {
          action:
            operation === 'create'
              ? 'forwarding.create'
              : 'forwarding.update',
          resource: 'forwarding-jobs',
          resourceId: doc.id,
          summary: `Forwarding job ${operation === 'create' ? 'created' : 'updated'}: ${doc.name}`,
          metadata: { enabled: doc.enabled, type: doc.type },
        })

        const streamId =
          doc.stream && typeof doc.stream === 'object'
            ? (doc.stream as { id: number }).id
            : doc.stream

        if (doc.type === 'rtmp-push' && streamId) {
          const stream = await req.payload.findByID({
            collection: 'streams',
            id: streamId,
            depth: 0,
          })
          await syncStreamToMediaMtx(req.payload, stream as Stream)
          return
        }

        const { enqueueForwardingJob } = await import('@/lib/queue')
        try {
          if (doc.enabled && (operation === 'create' || operation === 'update')) {
            await enqueueForwardingJob('start', String(doc.id))
          } else if (!doc.enabled && operation === 'update') {
            await enqueueForwardingJob('stop', String(doc.id))
          }
        } catch (err) {
          await req.payload.update({
            collection: 'forwarding-jobs',
            id: doc.id,
            data: { workerStatus: 'error' },
            overrideAccess: true,
            req,
          })
          throw err
        }
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        if (req.payload) {
          await recordAudit(req.payload, req, {
            action: 'forwarding.delete',
            resource: 'forwarding-jobs',
            resourceId: doc.id,
            summary: `Forwarding job deleted: ${doc.name}`,
          })
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
    {
      name: 'autoStart',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'When enabled, forwarding starts automatically: RTMP push uses MediaMTX runOnReady when a publisher connects; SRT push and HLS pull are started by the worker when the stream goes live (and on worker boot if already live).',
      },
    },
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