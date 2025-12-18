import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração do Chatwoot
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('url, account_id, api_key')
      .limit(1)
      .single();

    if (configError || !config) {
      console.error('[fetch-chatwoot-agents] Erro ao buscar config:', configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração do Chatwoot não encontrada. Configure a integração primeiro.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.api_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API Key do Chatwoot não configurada.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fazer requisição para a API do Chatwoot
    const chatwootUrl = `${config.url}/api/v1/accounts/${config.account_id}/agents`;
    console.log(`[fetch-chatwoot-agents] Buscando agentes de: ${chatwootUrl}`);

    const chatwootResponse = await fetch(chatwootUrl, {
      method: 'GET',
      headers: {
        'api_access_token': config.api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!chatwootResponse.ok) {
      const errorText = await chatwootResponse.text();
      console.error(`[fetch-chatwoot-agents] Erro na API Chatwoot: ${chatwootResponse.status}`, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao buscar agentes do Chatwoot: ${chatwootResponse.status}` 
        }),
        { status: chatwootResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agents = await chatwootResponse.json();
    console.log(`[fetch-chatwoot-agents] ${agents.length} agentes encontrados`);

    // Mapear para retornar apenas os campos necessários
    const agentsList = agents.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      avatar_url: agent.thumbnail || agent.avatar_url,
      role: agent.role,
      availability_status: agent.availability_status,
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        agents: agentsList 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[fetch-chatwoot-agents] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
