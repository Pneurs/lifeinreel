import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOTSTACK_ENV = Deno.env.get('SHOTSTACK_ENV') || 'stage';
const SHOTSTACK_BASE = `https://api.shotstack.io/${SHOTSTACK_ENV}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOTSTACK_API_KEY = Deno.env.get('SHOTSTACK_API_KEY');
    if (!SHOTSTACK_API_KEY) throw new Error('SHOTSTACK_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate user
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get jobId from query params or body
    const url = new URL(req.url);
    let jobId = url.searchParams.get('jobId');
    
    if (!jobId && req.method === 'POST') {
      const body = await req.json();
      jobId = body.jobId;
    }

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get job from DB
    const { data: job, error: jobError } = await supabase
      .from('compilation_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If already completed or failed, return cached status
    if (job.status === 'completed' || job.status === 'failed') {
      return new Response(JSON.stringify({
        jobId: job.id,
        status: job.status,
        resultUrl: job.result_url,
        errorMessage: job.error_message,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check Shotstack render status
    const renderRes = await fetch(`${SHOTSTACK_BASE}/render/${job.render_id}`, {
      headers: { 'x-api-key': SHOTSTACK_API_KEY },
    });

    const renderData = await renderRes.json();
    const shotstackStatus = renderData?.response?.status;
    const shotstackUrl = renderData?.response?.url;

    console.log(`[compile-status] Job ${jobId}: Shotstack status = ${shotstackStatus}`);

    let newStatus = job.status;
    let resultUrl: string | null = null;
    let errorMessage: string | null = null;

    if (shotstackStatus === 'done' && shotstackUrl) {
      newStatus = 'completed';
      resultUrl = shotstackUrl;
    } else if (shotstackStatus === 'failed') {
      newStatus = 'failed';
      errorMessage = renderData?.response?.error || 'Render failed on cloud';
    } else {
      // Still processing (queued, fetching, rendering, saving)
      newStatus = 'processing';
    }

    // Update DB if status changed
    if (newStatus !== job.status || resultUrl || errorMessage) {
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (resultUrl) updateData.result_url = resultUrl;
      if (errorMessage) updateData.error_message = errorMessage;

      await supabase
        .from('compilation_jobs')
        .update(updateData)
        .eq('id', jobId);
    }

    return new Response(JSON.stringify({
      jobId: job.id,
      status: newStatus,
      resultUrl,
      errorMessage,
      shotstackStatus: shotstackStatus || 'unknown',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[compile-status] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Status check failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
