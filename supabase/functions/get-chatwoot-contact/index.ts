import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { conversationId } = await req.json();

    if (!conversationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'conversationId obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[GetChatwootContact] Buscando contato para conversa: ${conversationId}`);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração do Chatwoot
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('url, api_key, account_id')
      .limit(1)
      .maybeSingle();

    if (configError || !config) {
      console.error('[GetChatwootContact] Config não encontrada:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração Chatwoot não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url: baseUrl, api_key: apiKey, account_id: accountId } = config;

    // Buscar detalhes da conversa na API do Chatwoot
    const chatwootUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}`;
    
    console.log(`[GetChatwootContact] Chamando API: ${chatwootUrl}`);

    const response = await fetch(chatwootUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GetChatwootContact] Erro API Chatwoot: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar conversa: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extrair dados do contato do meta.sender
    const sender = data.meta?.sender;
    
    const contact = {
      name: sender?.name || null,
      phone: sender?.phone_number || null,
      email: sender?.email || null,
      avatar_url: sender?.thumbnail || sender?.avatar_url || null,
    };

    console.log('[GetChatwootContact] Contato encontrado:', contact);

    return new Response(
      JSON.stringify({ success: true, contact }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[GetChatwootContact] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
