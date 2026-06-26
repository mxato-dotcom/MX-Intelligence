import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

interface RunPostImportRequest {
  syncId?: string
  sourceId?: string
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

  let body: RunPostImportRequest = {}
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  return jsonResponse({
    success: true,
    syncId: body.syncId ?? null,
    sourceId: body.sourceId ?? null,
    message: 'Post-import pipeline runs automatically after client import completes.',
  })
})
