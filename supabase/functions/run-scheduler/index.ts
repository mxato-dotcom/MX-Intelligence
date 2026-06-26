import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getAuthenticatedUser, getServiceClient } from '../_shared/auth.ts'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

serve(async (req: Request) => {
  const corsResponse = handleCorsPreflight(req)
  if (corsResponse) {
    return corsResponse
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  const userId = await getAuthenticatedUser(req)
  if (!userId) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
  }

  const adminClient = getServiceClient()
  const { data: sources, error } = await adminClient
    .from('sources')
    .select('id, update_interval, active, status, last_sync_at')
    .eq('user_id', userId)
    .eq('active', true)
    .eq('status', 'enabled')

  if (error) {
    return jsonResponse({ success: false, error: error.message }, 500)
  }

  const dueSourceIds: string[] = []
  const now = Date.now()

  for (const source of sources ?? []) {
    const interval = source.update_interval as string
    if (!interval || interval === 'manual') {
      continue
    }

    const lastSync = source.last_sync_at ? new Date(source.last_sync_at).getTime() : 0
    const intervalMs = parseIntervalMs(interval)
    if (intervalMs > 0 && now - lastSync >= intervalMs) {
      dueSourceIds.push(source.id)
    }
  }

  return jsonResponse({
    success: true,
    dueCount: dueSourceIds.length,
    dueSourceIds,
    message: 'Scheduler evaluation complete. Client queue processes sync jobs.',
  })
})

function parseIntervalMs(interval: string): number {
  const map: Record<string, number> = {
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '3h': 3 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
  }
  return map[interval] ?? 0
}
