import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

interface RunSyncJobRequest {
  sourceId?: string
  jobId?: string
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

  let body: RunSyncJobRequest = {}
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  if (!body.sourceId) {
    return jsonResponse({ success: false, error: 'sourceId is required' }, 400)
  }

  return jsonResponse({
    success: true,
    sourceId: body.sourceId,
    jobId: body.jobId ?? null,
    message: 'Sync job acknowledged. Execute import via authenticated client queue.',
  })
})
