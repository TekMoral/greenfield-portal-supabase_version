// Minimal test function to verify rate limiting works
import { withRateLimit } from '../_shared/rate-limit.ts'

const RL_MAX = 2
const RL_WIN = 60000

Deno.serve(withRateLimit(
  { bucket: 'test-rate-limit', max: RL_MAX, intervalMs: RL_WIN, identityType: 'ip' },
  async (req: Request) => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Rate limiter is working!',
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
))
