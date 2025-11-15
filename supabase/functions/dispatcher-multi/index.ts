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

interface MappingConfig {
  chatwoot_type: string;
  chatwoot_key: string;
  chatwoot_value: string | null;
  lovable_funil: string | null;
  lovable_etapa: string | null;
  ordem: number;
}

type TipoFunil = 'COMERCIAL' | 'ADMIN';

// Resolve funil baseado em labels (PRIORIDADE 1 - SSOT)
function resolveFunilByLabel(
  labels: string[],
  mappings: MappingConfig[]
): { funilNome: string | null; etapaDefault: string | null } {
  for (const label of labels) {
    const mapping = mappings.find(
      m => m.chatwoot_type === 'label' && m.chatwoot_key === label
    );
    if (mapping?.lovable_funil) {
      return {
        funilNome: mapping.lovable_funil,
        etapaDefault: mapping.lovable_etapa || null
      };
    }
  }
  return { funilNome: null, etapaDefault: null };
}

// Identifica tipo de funil (Comercial vs Administrativo)
function resolveTipoFunil(funilNome: string): TipoFunil {
  return funilNome === 'Comercial' ? 'COMERCIAL' : 'ADMIN';
}

// Resolve etapa baseado em atributos (PRIORIDADE 2 - complementar)
function resolveEtapaPorAtributos(
  tipoFunil: TipoFunil,
  attrs: Record<string, any>,
  mappings: MappingConfig[]
): string | null {
  const attrKey = tipoFunil === 'COMERCIAL' ? 'etapa_comercial' : 'funil_etapa';
  let attrValue = attrs[attrKey];
  
  // Se for array, pegar primeiro item
  if (Array.isArray(attrValue)) {
    attrValue = attrValue.length > 0 ? attrValue[0] : null;
  }
  
  if (!attrValue) return null;
  
  // Tentar aplicar mapping se existir
  const mapping = mappings.find(
    m => m.chatwoot_type === 'attr' && 
         m.chatwoot_key === attrKey &&
         m.chatwoot_value === attrValue
  );
  
  return mapping?.lovable_etapa || attrValue;
}

// Resolve data de retorno
function resolveDataRetorno(attrs: Record<string, any>): string {
  let dataRetorno = attrs['data_retorno'];
  
  if (Array.isArray(dataRetorno)) {
    dataRetorno = dataRetorno.length > 0 ? dataRetorno[0] : null;
  }
  
  return dataRetorno || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
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
    console.log(`[dispatcher-multi] Request method: ${req.method}`);
    console.log(`[dispatcher-multi] Full URL: ${req.url}`);
    console.log(`[dispatcher-multi] Headers:`, Object.fromEntries(req.headers.entries()));
    
    const contentType = req.headers.get('content-type');
    console.log(`[dispatcher-multi] Content-Type: ${contentType}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: webhookConfig, error: configError } = await supabase
      .from('webhooks_config')
      .select('*')
      .eq('inbox_path', webhookPath)
      .eq('active', true)
      .maybeSingle();

    if (configError || !webhookConfig) {
      console.error(`[dispatcher-multi] Webhook não encontrado para path: ${webhookPath}`);
      
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        status: 'error',
        event_type: 'webhook_not_found',
        error_message: `Webhook não mapeado para path '${webhookPath}'. Verifique webhooks_config.inbox_path.`,
        latency_ms: Date.now() - startTime,
        payload: { webhookPath, url: req.url },
      });

      return new Response(
        JSON.stringify({ 
          error: 'Webhook não mapeado', 
          details: `Path '${webhookPath}' não encontrado em webhooks_config` 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

// Função para extrair conversation_id de múltiplos formatos
    function resolveConversationId(payload: any): number | null {
      return (
        payload.conversation_id ??
        payload.conversation?.id ??
        payload.id ??
        null
      );
    }

    // Extrair e desembrulhar payload
    let body: any = null;
    let payload: any = null;
    let payloadFormat = 'unknown';
    const method = req.method;

    // Formato 1: POST com JSON body
    if (method === 'POST' && contentType?.includes('application/json')) {
      try {
        const rawBody = await req.text();
        console.log(`[dispatcher-multi] Raw body length: ${rawBody.length}`);
        console.log(`[dispatcher-multi] Raw body preview: ${rawBody.substring(0, 500)}`);
        
        if (rawBody && rawBody.trim().length > 0) {
          body = JSON.parse(rawBody);
          
          // Unwrap: se vier de proxy (webhook.site), o Chatwoot original está em receivedPayload
          payload = body.receivedPayload ?? body;
          payloadFormat = body.receivedPayload ? 'wrapped' : 'raw';
          
          console.log(`[dispatcher-multi] Payload parseado (format: ${payloadFormat})`);
        }
      } catch (e) {
        console.error(`[dispatcher-multi] Erro ao parsear JSON:`, e);
      }
    }

    // Formato 2: Query parameters (GET ou POST sem body válido)
    if (!payload) {
      const params = url.searchParams;
      console.log(`[dispatcher-multi] Query params:`, Object.fromEntries(params.entries()));
      
      if (params.has('event') || params.has('conversation_id')) {
        const customAttrs = params.get('custom_attributes');
        payload = {
          event: params.get('event') || 'unknown',
          conversation: {
            id: parseInt(params.get('conversation_id') || '0'),
            labels: params.get('labels')?.split(',').filter(l => l) || [],
            custom_attributes: customAttrs ? JSON.parse(customAttrs) : {},
          }
        };
        payloadFormat = 'query_params';
        console.log(`[dispatcher-multi] Payload reconstruído dos query params`);
      }
    }

    // Extrair conversation_id usando função robusta
    conversationId = payload ? resolveConversationId(payload) : null;

    // Validar conversation_id
    if (!conversationId) {
      console.error(`[dispatcher-multi] Payload inválido: conversation_id ausente`);
      console.log(`[dispatcher-multi] Payload recebido:`, JSON.stringify(payload));
      
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        status: 'error',
        event_type: payload?.event || 'unknown',
        error_message: 'Payload inválido: conversation_id ausente',
        latency_ms: Date.now() - startTime,
        payload: {
          method,
          url: req.url,
          payload_format: payloadFormat,
          headers: Object.fromEntries(req.headers.entries()),
          receivedPayload: payload,
        },
      });

      return new Response(
        JSON.stringify({ 
          error: 'Invalid payload', 
          details: 'conversation_id ausente',
          debug: {
            method,
            payloadFormat,
            hasPayload: !!payload,
            conversationId,
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    eventType = payload.event;
    const conv = payload.conversation || payload;

    // Extrair nome do contato
    const contactName = payload.contact?.name || 
                       payload.meta?.sender?.name || 
                       `Conversa Chatwoot #${conversationId}`;

    const { data: mappingsData } = await supabase
      .from('mappings_config')
      .select('*')
      .eq('active', true)
      .order('ordem', { ascending: true });

    const mappings = (mappingsData || []) as MappingConfig[];

    const changed_attrs = conv.changed_attributes?.custom_attrs || {};
    const custom_attrs = conv.custom_attributes || {};
    const labels = conv.labels || [];

    // Mesclar atributos (changed tem prioridade)
    const mergedAttrs: Record<string, any> = { ...custom_attrs };
    Object.keys(changed_attrs).forEach(key => {
      const val = changed_attrs[key]?.current_value;
      if (val !== undefined && val !== null && val !== '') {
        mergedAttrs[key] = val;
      }
    });

    // REGRA 1: Labels definem funil (SSOT)
    const { funilNome: labelFunil, etapaDefault: labelEtapa } = resolveFunilByLabel(labels, mappings);

    if (!labelFunil) {
      // Sem label mapeada → logar warning e não criar/atualizar card
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        conversation_id: conversationId,
        status: 'warning',
        event_type: eventType,
        error_message: 'Nenhuma label mapeada encontrada. Atributos sem label não definem funil.',
        latency_ms: Date.now() - startTime,
        payload: { labels, attrs: mergedAttrs, webhookPath },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'No valid label mapping' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const final_funil_nome = labelFunil;
    const tipoFunil = resolveTipoFunil(final_funil_nome);

    // REGRA 2: Atributos refinam etapa (complementar)
    let final_etapa_nome = resolveEtapaPorAtributos(tipoFunil, mergedAttrs, mappings);
    
    // Fallback: etapa default da label ou null
    if (!final_etapa_nome) {
      final_etapa_nome = labelEtapa;
    }

    const dataRetornoFinal = resolveDataRetorno(mergedAttrs);

    console.log(`[dispatcher-multi] Label → Funil: ${final_funil_nome} (${tipoFunil}), Attr → Etapa: ${final_etapa_nome || 'auto'}, DataRetorno: ${dataRetornoFinal}`);

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
      const updateFields: any = {
        funil_id: funilId,
        etapa_id: etapaId,
        funil_nome: final_funil_nome,
        funil_etapa: final_etapa_nome,
        data_retorno: dataRetornoFinal,
        titulo: contactName,
      };

      // Gravar etapa em resumo_comercial se for comercial
      if (tipoFunil === 'COMERCIAL' && final_etapa_nome) {
        updateFields.resumo_comercial = `Etapa: ${final_etapa_nome}`;
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
      if (changed_attrs['data_retorno']) {
        await supabase.from('atividades_cards').insert({
          card_id: cardId,
          tipo: 'DATA_RETORNO',
          descricao: `Data de retorno definida: ${dataRetornoFinal}`,
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
        payload: { 
          payload_format: payloadFormat,
          label: labels[0] || null,
          funil: final_funil_nome, 
          tipo: tipoFunil,
          etapa: final_etapa_nome, 
          dataRetorno: dataRetornoFinal,
          contactName 
        },
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
