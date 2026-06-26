import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
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

  return jsonResponse({
    success: true,
    message: 'Queue processing is managed by the authenticated client session.',
  })
})
