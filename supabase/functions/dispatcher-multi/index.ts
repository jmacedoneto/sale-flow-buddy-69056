import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  conversation?: {
    id: number;
    custom_attributes?: Record<string, any>;
    changed_attributes?: Record<string, any>;
    labels?: string[];
  };
  id?: number;
  private?: boolean;
  content?: string;
  created_at?: number;
  message_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('OK', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let conversationId: number | null = null;
  let eventType: string | null = null;
  let cardId: string | null = null;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(s => s);
    const webhookPath = decodeURIComponent(pathSegments[pathSegments.length - 1]);
    
    console.log(`[dispatcher-multi] Webhook path: ${webhookPath}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: webhookConfig, error: configError } = await supabase
      .from('webhooks_config')
      .select('*')
      .eq('inbox_path', `/${webhookPath}`)
      .eq('active', true)
      .maybeSingle();

    if (configError || !webhookConfig) {
      console.error(`[dispatcher-multi] Webhook inativo: ${webhookPath}`);
      
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        status: 'error',
        event_type: 'webhook_not_found',
        error_message: `Webhook inativo: ${webhookPath}`,
        latency_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ error: 'Webhook inativo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: WebhookPayload = await req.json();
    eventType = payload.event;
    const conv = payload.conversation;

    if (!conv?.id) {
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        status: 'warning',
        event_type: eventType,
        error_message: 'Conversation ID ausente',
        latency_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ success: true, message: 'No conversation ID' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    conversationId = conv.id;

    const { data: mappingsData } = await supabase
      .from('mappings_config')
      .select('*')
      .eq('active', true)
      .order('ordem', { ascending: true });

    const mappings = mappingsData || [];

    const changed_attrs = conv.changed_attributes?.custom_attrs || {};
    const custom_attrs = conv.custom_attributes || {};
    const labels = conv.labels || [];

    const parseAttrValue = (key: string) => {
      let val = changed_attrs[key]?.current_value;
      if (val === undefined || val === null || val === '') {
        val = custom_attrs[key];
      }
      if (val === null || val === undefined || val === '') return null;
      if (Array.isArray(val)) return val.length > 0 ? val[0] : null;
      return val;
    };

    const funilEtapa = parseAttrValue('funil_etapa');
    const dataRetorno = parseAttrValue('data_retorno');
    const etapaComercial = parseAttrValue('etapa_comercial');

    let final_funil_nome: string | null = null;
    let final_etapa_nome: string | null = null;

    // PRIORIDADE 1: Mappings de labels (labels definem funil)
    if (labels.length > 0) {
      for (const label of labels) {
        const mapping = mappings.find(
          m => m.chatwoot_type === 'label' && m.chatwoot_key === label
        );
        if (mapping) {
          if (mapping.lovable_funil) final_funil_nome = mapping.lovable_funil;
          if (mapping.lovable_etapa) final_etapa_nome = mapping.lovable_etapa;
          break;
        }
      }
    }

    // PRIORIDADE 2: Fallback por path da inbox (se label não definiu)
    if (!final_funil_nome) {
      if (webhookPath.includes('Comercial')) {
        final_funil_nome = 'Comercial';
      } else if (webhookPath.includes('Regional') || webhookPath.includes('Administrativo')) {
        final_funil_nome = 'Administrativo';
      }
    }

    // PRIORIDADE 3: Default
    if (!final_funil_nome) final_funil_nome = 'Padrão';

    // RESOLUÇÃO DE ETAPA: depende do funil
    // Se funil = Comercial → usar etapa_comercial
    // Senão → usar funil_etapa
    if (!final_etapa_nome) {
      if (final_funil_nome === 'Comercial' && etapaComercial) {
        final_etapa_nome = etapaComercial;
      } else if (funilEtapa) {
        final_etapa_nome = funilEtapa;
      }
    }

    // Verificar mappings de etapa (se não resolvido ainda)
    if (!final_etapa_nome && labels.length > 0) {
      for (const label of labels) {
        const mapping = mappings.find(
          m => m.chatwoot_type === 'label' && 
               m.chatwoot_key === label &&
               m.lovable_etapa
        );
        if (mapping?.lovable_etapa) {
          final_etapa_nome = mapping.lovable_etapa;
          break;
        }
      }
    }

    console.log(`[dispatcher-multi] Funil: ${final_funil_nome}, Etapa: ${final_etapa_nome || 'auto'}`);

    // Auto-create funil
    let { data: funilRow } = await supabase
      .from('funis')
      .select('id, nome')
      .eq('nome', final_funil_nome)
      .maybeSingle();

    if (!funilRow) {
      const { data: newFunil } = await supabase
        .from('funis')
        .insert({ nome: final_funil_nome })
        .select('id, nome')
        .single();
      funilRow = newFunil!;
    }

    const funilId = funilRow.id;

    // Auto-create/find etapa
    let etapaId: string | null = null;

    const { data: existingEtapas } = await supabase
      .from('etapas')
      .select('id, nome, ordem')
      .eq('funil_id', funilId)
      .order('ordem', { ascending: true });

    if (final_etapa_nome) {
      const etapaMatch = existingEtapas?.find(e => e.nome === final_etapa_nome);
      
      if (etapaMatch) {
        etapaId = etapaMatch.id;
      } else {
        const maxOrdem = existingEtapas && existingEtapas.length > 0
          ? Math.max(...existingEtapas.map(e => e.ordem))
          : 0;

        const { data: newEtapa } = await supabase
          .from('etapas')
          .insert({
            funil_id: funilId,
            nome: final_etapa_nome,
            ordem: maxOrdem + 1
          })
          .select('id')
          .single();

        etapaId = newEtapa!.id;
      }
    } else {
      if (existingEtapas && existingEtapas.length > 0) {
        etapaId = existingEtapas[0].id;
        final_etapa_nome = existingEtapas[0].nome;
      } else {
        const { data: newEtapa } = await supabase
          .from('etapas')
          .insert({
            funil_id: funilId,
            nome: 'Nova',
            ordem: 1
          })
          .select('id, nome')
          .single();

        etapaId = newEtapa!.id;
        final_etapa_nome = newEtapa!.nome;
      }
    }

    // Processar events
    if (eventType === 'conversation_updated') {
      const dataRetornoPadrao = dataRetorno || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const updateFields: any = {
        funil_id: funilId,
        etapa_id: etapaId,
        funil_nome: final_funil_nome,
        funil_etapa: final_etapa_nome,
        data_retorno: dataRetornoPadrao,
        titulo: `Conversa Chatwoot #${conversationId}`,
      };

      // Gravar etapa_comercial em resumo_comercial para referência
      if (etapaComercial && final_funil_nome === 'Comercial') {
        updateFields.resumo_comercial = `Etapa Comercial: ${etapaComercial}`;
      }

      const { data: upsertedCard, error: upsertError } = await supabase
        .from('cards_conversas')
        .upsert(
          {
            chatwoot_conversa_id: conversationId,
            ...updateFields
          },
          {
            onConflict: 'chatwoot_conversa_id',
            ignoreDuplicates: false
          }
        )
        .select('id')
        .single();

      if (upsertError) {
        await supabase.from('webhook_sync_logs').insert({
          sync_type: 'chatwoot_to_lovable',
          conversation_id: conversationId,
          status: 'error',
          event_type: eventType,
          error_message: `Upsert error: ${upsertError.message}`,
          latency_ms: Date.now() - startTime,
        });
        throw upsertError;
      }

      cardId = upsertedCard.id;

      // Criar atividade se data_retorno foi definida/alterada
      if (dataRetorno && changed_attrs['data_retorno']) {
        await supabase.from('atividades_cards').insert({
          card_id: cardId,
          tipo: 'DATA_RETORNO',
          descricao: `Data de retorno definida: ${dataRetorno}`,
          privado: false,
        });
      }

      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        conversation_id: conversationId,
        card_id: cardId,
        status: 'success',
        event_type: eventType,
        latency_ms: Date.now() - startTime,
        payload: { funil: final_funil_nome, etapa: final_etapa_nome, dataRetorno },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Card upserted', card_id: cardId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (eventType === 'message_created' && payload.private === true) {
      const { data: cardExists } = await supabase
        .from('cards_conversas')
        .select('id')
        .eq('chatwoot_conversa_id', conversationId)
        .maybeSingle();

      if (cardExists && payload.id) {
        const { error: atividadeError } = await supabase
          .from('atividades_cards')
          .insert({
            card_id: cardExists.id,
            tipo: 'MENSAGEM_PRIVADA',
            descricao: payload.content || 'Mensagem privada do Chatwoot',
            chatwoot_message_id: payload.id,
            privado: true
          });

        if (!atividadeError || atividadeError.message.includes('duplicate')) {
          await supabase.from('webhook_sync_logs').insert({
            sync_type: 'chatwoot_to_lovable',
            conversation_id: conversationId,
            card_id: cardExists.id,
            status: 'success',
            event_type: 'message_created_private',
            latency_ms: Date.now() - startTime,
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Private message processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('webhook_sync_logs').insert({
      sync_type: 'chatwoot_to_lovable',
      conversation_id: conversationId,
      status: 'warning',
      event_type: eventType,
      error_message: 'Event type not handled',
      latency_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Event ignored' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[dispatcher-multi] Fatal error:', error);
    
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        conversation_id: conversationId,
        card_id: cardId,
        status: 'error',
        event_type: eventType || 'unknown',
        error_message: String(error).substring(0, 500),
        latency_ms: Date.now() - startTime,
      });
    } catch {}

    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
