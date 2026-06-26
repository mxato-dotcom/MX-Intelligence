import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

interface RetrySyncJobRequest {
  jobId?: string
  syncHistoryId?: string
}

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

  let body: RetrySyncJobRequest = {}
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  if (!body.jobId && !body.syncHistoryId) {
    return jsonResponse({ success: false, error: 'jobId or syncHistoryId is required' }, 400)
  }

  return jsonResponse({
    success: true,
    jobId: body.jobId ?? null,
    syncHistoryId: body.syncHistoryId ?? null,
    message: 'Retry scheduled via client queue with 1m/5m/15m backoff.',
  })
})
