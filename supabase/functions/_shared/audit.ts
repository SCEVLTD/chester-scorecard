import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AuditEntry {
  userId: string | null
  userEmail: string | null
  userRole: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Write an entry to the audit log.
 * Uses the write_audit_log RPC function for SECURITY DEFINER access.
 * Failures are logged but never throw - audit logging should not break the main flow.
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await supabase.rpc('write_audit_log', {
      p_user_id: entry.userId,
      p_user_email: entry.userEmail,
      p_user_role: entry.userRole,
      p_action: entry.action,
      p_resource_type: entry.resourceType,
      p_resource_id: entry.resourceId || null,
      p_metadata: entry.metadata || {},
      p_ip_address: entry.ipAddress || null,
      p_user_agent: entry.userAgent || null,
    })
  } catch (error) {
    // Never let audit logging failures break the main flow
    console.error('Failed to write audit log:', error)
  }
}

/**
 * Extract IP address from request headers.
 * Checks common proxy headers first.
 */
export function getClientIp(req: Request): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    null
  )
}
