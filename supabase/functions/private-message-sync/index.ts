import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[private-message-sync] Iniciando sync de mensagem privada...');
    
    const { card_id, message } = await req.json();
    
    if (!card_id || !message) {
      console.log('[private-message-sync] Dados insuficientes');
      return new Response(
        JSON.stringify({ error: 'Missing required data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // CONDICIONAL: Só processa se card JÁ tem funil_id
    const { data: card, error: cardError } = await supabase
      .from('cards_conversas')
      .select('funil_id, chatwoot_conversa_id')
      .eq('id', card_id)
      .single();

    if (cardError) {
      console.error('[private-message-sync] Erro ao buscar card:', cardError);
      return new Response(
        JSON.stringify({ error: cardError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!card?.funil_id) {
      console.log('[private-message-sync] Card sem funil, ignorando');
      return new Response(
        JSON.stringify({ error: 'Card sem funil, ignora' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('[private-message-sync] Card válido, registrando atividade privada');

    // Registra atividade privada
    const { error: atividadeError } = await supabase
      .from('atividades_cards')
      .insert({
        card_id,
        tipo: 'FOLLOW_UP_PRIVADO',
        descricao: message,
        privado: true,
      });

    if (atividadeError) {
      console.error('[private-message-sync] Erro ao criar atividade:', atividadeError);
    }

    // Buscar configuração do Chatwoot se houver conversa vinculada
    if (card.chatwoot_conversa_id) {
      console.log('[private-message-sync] Buscando configuração do Chatwoot');
      
      const { data: config, error: configError } = await supabase
        .from('integracao_chatwoot')
        .select('*')
        .single();

      if (!configError && config?.api_key && config?.url && config?.account_id) {
        console.log('[private-message-sync] Enviando private note para Chatwoot');
        
        try {
          const chatwootUrl = `${config.url}/api/v1/accounts/${config.account_id}/conversations/${card.chatwoot_conversa_id}/messages`;
          
          const response = await fetch(chatwootUrl, {
            method: 'POST',
            headers: {
              'api_access_token': config.api_key,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: `[PRIVADO]\n${message}`,
              message_type: 'outgoing',
              private: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[private-message-sync] Erro ao enviar para Chatwoot:', errorText);
          } else {
            console.log('[private-message-sync] Private note enviada com sucesso');
          }
        } catch (chatwootError) {
          console.error('[private-message-sync] Erro ao enviar para Chatwoot:', chatwootError);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('[private-message-sync] Erro:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
