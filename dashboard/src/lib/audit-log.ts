import type { Payload, PayloadRequest } from 'payload'

export type AuditAction =
  | 'config.apply'
  | 'stream.create'
  | 'stream.update'
  | 'stream.delete'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.role_change'
  | 'cors.update'
  | 'protocol.update'
  | 'cors.preset_apply'
  | 'cors.preset_create'
  | 'cors.preset_update'
  | 'cors.preset_delete'
  | 'forwarding.create'
  | 'forwarding.update'
  | 'forwarding.delete'

export type AuditEvent = {
  action: AuditAction
  resource: string
  resourceId?: string | number | null
  summary: string
  metadata?: Record<string, unknown> | null
  actorId?: number | null
}

function clientIp(req?: PayloadRequest | null): string | null {
  if (!req?.headers) return null
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip')
}

export async function recordAudit(
  payload: Payload,
  req: PayloadRequest | undefined | null,
  event: AuditEvent,
): Promise<void> {
  try {
    const actorId =
      event.actorId ??
      (req?.user && typeof req.user === 'object' && 'id' in req.user
        ? (req.user as { id: number }).id
        : null)

    await payload.create({
      collection: 'audit-logs',
      data: {
        action: event.action,
        actor: actorId,
        resource: event.resource,
        resourceId: event.resourceId != null ? String(event.resourceId) : null,
        summary: event.summary,
        metadata: event.metadata ?? null,
        ip: clientIp(req),
      },
      overrideAccess: true,
      req: req ?? undefined,
    })
  } catch {
    // Audit must never block the primary operation.
  }
}
