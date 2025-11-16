import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[chatwoot-healthcheck] Iniciando health check do Chatwoot');

    // Criar cliente Supabase com service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar configuração do Chatwoot
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('*')
      .limit(1)
      .single();

    if (configError || !config) {
      console.error('[chatwoot-healthcheck] Erro ao buscar config:', configError);
      
      // Atualizar status como offline (sem config)
      await supabase
        .from('system_health')
        .upsert({
          service: 'chatwoot',
          status: 'offline',
          last_checked: new Date().toISOString(),
          error_message: 'Configuração do Chatwoot não encontrada',
        }, { onConflict: 'service' });

      return new Response(
        JSON.stringify({ 
          status: 'offline', 
          error: 'Chatwoot config not found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Testar conexão com Chatwoot
    const startTime = Date.now();
    const response = await fetch(`${config.url}/api/v1/profile`, {
      method: 'GET',
      headers: {
        'api_access_token': config.api_key || '',
        'Content-Type': 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;
    console.log(`[chatwoot-healthcheck] Chatwoot respondeu em ${responseTime}ms com status ${response.status}`);

    let healthStatus: 'operational' | 'degraded' | 'offline' = 'operational';
    let errorMessage: string | null = null;

    if (!response.ok) {
      healthStatus = response.status >= 500 ? 'offline' : 'degraded';
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    } else if (responseTime > 5000) {
      healthStatus = 'degraded';
      errorMessage = 'Tempo de resposta alto (>5s)';
    }

    // Atualizar status no banco
    const { error: updateError } = await supabase
      .from('system_health')
      .upsert({
        service: 'chatwoot',
        status: healthStatus,
        last_checked: new Date().toISOString(),
        error_message: errorMessage,
        response_time_ms: responseTime,
      }, { onConflict: 'service' });

    if (updateError) {
      console.error('[chatwoot-healthcheck] Erro ao atualizar status:', updateError);
    }

    return new Response(
      JSON.stringify({
        status: healthStatus,
        response_time_ms: responseTime,
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[chatwoot-healthcheck] Erro inesperado:', error);

    // Marcar como offline em caso de erro
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase
      .from('system_health')
      .upsert({
        service: 'chatwoot',
        status: 'offline',
        last_checked: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
      }, { onConflict: 'service' });

    return new Response(
      JSON.stringify({
        status: 'offline',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
