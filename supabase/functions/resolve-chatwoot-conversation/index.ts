import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResolveRequest {
  conversation_id: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[resolve-chatwoot-conversation] Starting...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[resolve-chatwoot-conversation] Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('[resolve-chatwoot-conversation] User authenticated:', user.email);

    const { conversation_id } = await req.json() as ResolveRequest;

    if (!conversation_id) {
      throw new Error('Missing required field: conversation_id');
    }

    console.log('[resolve-chatwoot-conversation] Resolving conversation:', conversation_id);

    // Buscar configuração do Chatwoot
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('*')
      .eq('status', 'ativo')
      .maybeSingle();

    if (configError || !config) {
      console.error('[resolve-chatwoot-conversation] Chatwoot config error:', configError);
      throw new Error('Chatwoot integration not configured or inactive');
    }

    // Resolver conversa no Chatwoot (mudar status para "resolved")
    const chatwootUrl = `${config.url}/api/v1/accounts/${config.account_id}/conversations/${conversation_id}/toggle_status`;
    const chatwootResponse = await fetch(chatwootUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': config.api_key,
      },
      body: JSON.stringify({
        status: 'resolved',
      }),
    });

    if (!chatwootResponse.ok) {
      const errorText = await chatwootResponse.text();
      console.error('[resolve-chatwoot-conversation] Chatwoot API error:', errorText);
      throw new Error(`Chatwoot API error: ${chatwootResponse.status} - ${errorText}`);
    }

    const chatwootData = await chatwootResponse.json();
    console.log('[resolve-chatwoot-conversation] Conversation resolved:', chatwootData);

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id,
        status: 'resolved',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[resolve-chatwoot-conversation] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
      }
    );
  }
});
