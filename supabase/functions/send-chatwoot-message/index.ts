import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  conversation_id: number;
  content: string;
  private?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[send-chatwoot-message] Starting...');

    // Criar cliente Supabase
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
      console.error('[send-chatwoot-message] Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('[send-chatwoot-message] User authenticated:', user.email);

    // Parse request body
    const { conversation_id, content, private: isPrivate = false } = await req.json() as SendMessageRequest;

    if (!conversation_id || !content) {
      throw new Error('Missing required fields: conversation_id and content');
    }

    console.log('[send-chatwoot-message] Request:', { conversation_id, contentLength: content.length, isPrivate });

    // Buscar card associado à conversa para verificar permissão
    const { data: card, error: cardError } = await supabase
      .from('cards_conversas')
      .select('funil_id')
      .eq('chatwoot_conversa_id', conversation_id)
      .maybeSingle();

    if (cardError) {
      console.error('[send-chatwoot-message] Error fetching card:', cardError);
      throw new Error('Failed to fetch card');
    }

    // Verificar permissão do usuário (via função has_role ou can_access_funil)
    if (card?.funil_id) {
      const { data: hasAccess, error: accessError } = await supabase
        .rpc('can_access_funil', {
          _user_id: user.id,
          _funil_id: card.funil_id,
          _require_edit: true, // Requer permissão de edição para enviar mensagens
        });

      if (accessError || !hasAccess) {
        console.error('[send-chatwoot-message] Access denied:', { user: user.email, funilId: card.funil_id });
        throw new Error('User does not have permission to send messages for this conversation');
      }

      console.log('[send-chatwoot-message] Access granted for funil:', card.funil_id);
    }

    // Buscar configuração do Chatwoot
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('*')
      .eq('status', 'ativo')
      .maybeSingle();

    if (configError || !config) {
      console.error('[send-chatwoot-message] Chatwoot config error:', configError);
      throw new Error('Chatwoot integration not configured or inactive');
    }

    // Enviar mensagem ao Chatwoot
    const chatwootUrl = `${config.url}/api/v1/accounts/${config.account_id}/conversations/${conversation_id}/messages`;
    const chatwootResponse = await fetch(chatwootUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': config.api_key,
      },
      body: JSON.stringify({
        content,
        message_type: 'outgoing',
        private: isPrivate,
      }),
    });

    if (!chatwootResponse.ok) {
      const errorText = await chatwootResponse.text();
      console.error('[send-chatwoot-message] Chatwoot API error:', errorText);
      throw new Error(`Chatwoot API error: ${chatwootResponse.status} - ${errorText}`);
    }

    const chatwootData = await chatwootResponse.json();
    console.log('[send-chatwoot-message] Message sent successfully:', chatwootData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: chatwootData.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[send-chatwoot-message] Error:', error);
    
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
