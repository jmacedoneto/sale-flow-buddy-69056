import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * sync-private-messages
 * 
 * Busca mensagens privadas da API do Chatwoot e cria atividades correspondentes.
 * Pode ser chamada manualmente ou por trigger quando uma conversa é atualizada.
 * 
 * Payload esperado:
 * {
 *   conversation_id: number,      // ID da conversa no Chatwoot
 *   card_id?: string,             // ID do card (opcional, será buscado)
 *   force_sync?: boolean          // Força resync de todas as mensagens privadas
 * }
 */

interface ChatwootMessage {
  id: number;
  content: string;
  private: boolean;
  message_type: number; // 0=incoming, 1=outgoing
  created_at: number;
  sender?: {
    id: number;
    name: string;
    type: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('[sync-private-messages] Iniciando...');
    
    const body = await req.json();
    const { conversation_id, card_id: providedCardId, force_sync = false } = body;
    
    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: 'conversation_id é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar configuração do Chatwoot
    const { data: chatwootConfig, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('url, api_key, account_id')
      .single();

    if (configError || !chatwootConfig?.api_key || !chatwootConfig?.url) {
      console.error('[sync-private-messages] Configuração do Chatwoot não encontrada');
      return new Response(
        JSON.stringify({ error: 'Configuração do Chatwoot não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar card pelo conversation_id
    let cardId = providedCardId;
    let cardData: { id: string; funil_id: string | null; funil_nome: string | null } | null = null;
    
    if (!cardId) {
      const { data: card, error: cardError } = await supabase
        .from('cards_conversas')
        .select('id, funil_id, funil_nome')
        .eq('chatwoot_conversa_id', conversation_id)
        .single();

      if (cardError || !card) {
        console.log('[sync-private-messages] Card não encontrado para conversa', conversation_id);
        return new Response(
          JSON.stringify({ error: 'Card não encontrado', conversation_id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      cardId = card.id;
      cardData = card;
    } else {
      const { data: card } = await supabase
        .from('cards_conversas')
        .select('id, funil_id, funil_nome')
        .eq('id', cardId)
        .single();
      cardData = card;
    }

    if (!cardData?.funil_id) {
      console.log('[sync-private-messages] Card sem funil, ignorando');
      return new Response(
        JSON.stringify({ error: 'Card sem funil configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Buscar mensagens já sincronizadas para não duplicar
    const { data: existingActivities } = await supabase
      .from('atividades_cards')
      .select('chatwoot_message_id')
      .eq('card_id', cardId)
      .not('chatwoot_message_id', 'is', null);

    const syncedMessageIds = new Set(
      (existingActivities || []).map(a => a.chatwoot_message_id)
    );

    console.log(`[sync-private-messages] Mensagens já sincronizadas: ${syncedMessageIds.size}`);

    // Buscar mensagens da conversa via API do Chatwoot
    const messagesUrl = `${chatwootConfig.url}/api/v1/accounts/${chatwootConfig.account_id}/conversations/${conversation_id}/messages`;
    
    console.log(`[sync-private-messages] Buscando mensagens de: ${messagesUrl}`);
    
    const messagesResponse = await fetch(messagesUrl, {
      method: 'GET',
      headers: {
        'api_access_token': chatwootConfig.api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error('[sync-private-messages] Erro ao buscar mensagens:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar mensagens do Chatwoot', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const messagesData = await messagesResponse.json();
    const messages: ChatwootMessage[] = messagesData.payload || messagesData || [];
    
    console.log(`[sync-private-messages] Total de mensagens encontradas: ${messages.length}`);

    // Filtrar apenas mensagens privadas que ainda não foram sincronizadas
    const privateMessages = messages.filter((msg: ChatwootMessage) => {
      const isPrivate = msg.private === true;
      const notSynced = force_sync || !syncedMessageIds.has(msg.id);
      return isPrivate && notSynced;
    });

    console.log(`[sync-private-messages] Mensagens privadas para sincronizar: ${privateMessages.length}`);

    if (privateMessages.length === 0) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: 'Nenhuma nova mensagem privada para sincronizar',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Determinar tipo de atividade baseado no funil
    const funilNome = cardData.funil_nome || '';
    const isComercial = funilNome.toLowerCase().includes('comercial');
    
    // Calcular data de retorno (3 dias úteis) se for comercial
    let dataPrevista: string | null = null;
    if (isComercial) {
      const { data: dataRetorno } = await supabase.rpc('calcular_dias_uteis', {
        data_base: new Date().toISOString().split('T')[0],
        n_dias: 3
      });
      dataPrevista = dataRetorno;
    }

    // Criar atividades para cada mensagem privada
    const atividades = privateMessages.map((msg: ChatwootMessage) => ({
      card_id: cardId,
      tipo: isComercial ? 'FOLLOW_UP' : 'NOTA_ADMIN',
      descricao: msg.content || '[Mensagem sem conteúdo]',
      privado: !isComercial, // FOLLOW_UP é visível, NOTA_ADMIN é privada
      data_prevista: isComercial ? dataPrevista : null,
      chatwoot_message_id: msg.id,
      status: 'pendente',
    }));

    const { error: insertError } = await supabase
      .from('atividades_cards')
      .insert(atividades);

    if (insertError) {
      console.error('[sync-private-messages] Erro ao criar atividades:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar atividades', details: insertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const latency = Date.now() - startTime;
    console.log(`[sync-private-messages] Sincronizadas ${atividades.length} atividades em ${latency}ms`);

    // Log de sucesso
    await supabase.from('webhook_sync_logs').insert({
      sync_type: 'private_message_sync',
      event_type: isComercial ? 'follow_up_created' : 'nota_admin_created',
      status: 'success',
      card_id: cardId,
      conversation_id: conversation_id,
      latency_ms: latency,
      payload: { 
        synced_count: atividades.length, 
        message_ids: privateMessages.map((m: ChatwootMessage) => m.id),
        funil: funilNome,
        tipo_atividade: isComercial ? 'FOLLOW_UP' : 'NOTA_ADMIN'
      }
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        synced: atividades.length,
        tipo: isComercial ? 'FOLLOW_UP' : 'NOTA_ADMIN',
        data_prevista: dataPrevista,
        message_ids: privateMessages.map((m: ChatwootMessage) => m.id)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[sync-private-messages] Erro:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
