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
    meta?: {
      sender?: {
        name?: string;
        phone_number?: string;
        thumbnail?: string;
        id?: number;
      };
      assignee?: {
        name?: string;
        avatar_url?: string;
        id?: number;
      };
    };
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

/**
 * Resolve nome do contato/cliente com múltiplos fallbacks (DRY)
 */
function resolveContactName(payload: any, conversationId: number): string {
  const clientCandidates = [
    payload?.conversation?.meta?.sender?.name,
    payload?.conversation?.contact?.name,
    payload?.contact?.name,
    payload?.meta?.sender?.name,
    payload?.data?.contact?.name,
    payload?.data?.conversation?.contact?.name,
  ];

  for (const candidate of clientCandidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
      console.log(`[resolveContactName] Nome encontrado: "${candidate.trim()}"`);
      return candidate.trim();
    }
  }

  const senderType = payload?.sender?.type;
  const senderName = payload?.sender?.name;
  if (senderType === 'contact' && senderName && typeof senderName === 'string' && senderName.trim().length > 0) {
    return senderName.trim();
  }

  return `Conversa Chatwoot #${conversationId}`;
}

/**
 * NOVO: Extrai avatar do lead (thumbnail do sender)
 */
function resolveAvatarLead(payload: any): string | null {
  const candidates = [
    payload?.conversation?.meta?.sender?.thumbnail,
    payload?.conversation?.contact?.thumbnail,
    payload?.contact?.thumbnail,
    payload?.meta?.sender?.thumbnail,
    payload?.sender?.thumbnail,
    payload?.data?.contact?.thumbnail,
  ];
  
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.startsWith('http')) {
      console.log(`[resolveAvatarLead] Avatar encontrado: ${candidate.substring(0, 50)}...`);
      return candidate;
    }
  }
  return null;
}

/**
 * NOVO: Extrai avatar do agente (assignee)
 */
function resolveAvatarAgente(payload: any): string | null {
  const candidates = [
    payload?.conversation?.meta?.assignee?.avatar_url,
    payload?.conversation?.assignee?.avatar_url,
    payload?.assignee?.avatar_url,
    payload?.meta?.assignee?.avatar_url,
  ];
  
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.startsWith('http')) {
      console.log(`[resolveAvatarAgente] Avatar agente encontrado: ${candidate.substring(0, 50)}...`);
      return candidate;
    }
  }
  return null;
}

/**
 * NOVO: Extrai telefone do lead
 */
function resolveTelefoneLead(payload: any): string | null {
  const candidates = [
    payload?.conversation?.meta?.sender?.phone_number,
    payload?.conversation?.contact?.phone_number,
    payload?.contact?.phone_number,
    payload?.meta?.sender?.phone_number,
    payload?.sender?.phone_number,
  ];
  
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
      console.log(`[resolveTelefoneLead] Telefone encontrado: ${candidate}`);
      return candidate.trim();
    }
  }
  return null;
}

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

function resolveTipoFunil(funilNome: string): TipoFunil {
  return funilNome === 'Comercial' ? 'COMERCIAL' : 'ADMIN';
}

function resolveEtapaPorAtributos(
  tipoFunil: TipoFunil,
  attrs: Record<string, any>,
  mappings: MappingConfig[]
): string | null {
  const attrKey = tipoFunil === 'COMERCIAL' ? 'etapa_comercial' : 'funil_etapa';
  let attrValue = attrs[attrKey];
  
  if (Array.isArray(attrValue)) {
    attrValue = attrValue.length > 0 ? attrValue[0] : null;
  }
  
  if (!attrValue) return null;
  
  const mapping = mappings.find(
    m => m.chatwoot_type === 'attr' && 
         m.chatwoot_key === attrKey &&
         m.chatwoot_value === attrValue
  );
  
  return mapping?.lovable_etapa || attrValue;
}

function resolveDataRetorno(attrs: Record<string, any>): string {
  let dataRetorno = attrs['data_retorno'];
  
  if (Array.isArray(dataRetorno)) {
    dataRetorno = dataRetorno.length > 0 ? dataRetorno[0] : null;
  }
  
  return dataRetorno || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  const rawBodyForDebug = await req.clone().text();
  console.log('>>> [DISPATCHER-MULTI] RECEBENDO REQUEST RAW:', rawBodyForDebug.substring(0, 500));
  console.log('>>> [DISPATCHER-MULTI] METHOD:', req.method, 'URL:', req.url);

  if (req.method === 'OPTIONS') {
    return new Response('OK', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let conversationId: number | null = null;
  let eventType: string | null = null;
  let cardId: string | null = null;
  let rawPayload: any = null;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(s => s);
    const webhookPath = decodeURIComponent(pathSegments[pathSegments.length - 1]);
    
    console.log(`[dispatcher-multi] Webhook path: ${webhookPath}`);
    
    const headersObj = Object.fromEntries(req.headers.entries());
    const contentType = req.headers.get('content-type');
    const headerEventType = req.headers.get('X-Chatwoot-Event') || req.headers.get('x-chatwoot-event');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Tentar encontrar webhook com múltiplas estratégias
    let webhookConfig = null;
    let matchStrategy = 'exact';
    
    const { data: exactMatch } = await supabase
      .from('webhooks_config')
      .select('*')
      .eq('inbox_path', webhookPath)
      .eq('active', true)
      .maybeSingle();
    
    if (exactMatch) {
      webhookConfig = exactMatch;
      matchStrategy = 'exact';
    }
    
    if (!webhookConfig) {
      const lastSegment = webhookPath.split('/').pop() || webhookPath;
      const { data: partialMatch } = await supabase
        .from('webhooks_config')
        .select('*')
        .eq('active', true);
      
      if (partialMatch) {
        webhookConfig = partialMatch.find(w => 
          w.inbox_path === lastSegment ||
          w.inbox_path.endsWith(`/${lastSegment}`) ||
          lastSegment.endsWith(w.inbox_path)
        );
        if (webhookConfig) matchStrategy = 'partial';
      }
    }
    
    if (!webhookConfig) {
      const { data: allConfigs } = await supabase
        .from('webhooks_config')
        .select('*')
        .eq('active', true);
      
      if (allConfigs) {
        webhookConfig = allConfigs.find(w => 
          w.inbox_path.toLowerCase() === webhookPath.toLowerCase()
        );
        if (webhookConfig) matchStrategy = 'case_insensitive';
      }
    }

    if (!webhookConfig) {
      console.error(`[dispatcher-multi] Webhook não encontrado para path: ${webhookPath}`);
      
      const { data: availableWebhooks } = await supabase
        .from('webhooks_config')
        .select('inbox_path, name')
        .eq('active', true);
      
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        status: 'error',
        event_type: 'webhook_not_found',
        error_message: `Webhook não mapeado para path '${webhookPath}'`,
        latency_ms: Date.now() - startTime,
        payload: { webhookPath, availableWebhooks: availableWebhooks?.map(w => w.inbox_path) || [] },
      });

      return new Response(
        JSON.stringify({ error: 'Webhook não mapeado', details: `Path '${webhookPath}' não encontrado` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[dispatcher-multi] Webhook encontrado: ${webhookConfig.name} (strategy: ${matchStrategy})`);

    function resolveConversationId(payload: any): number | null {
      return (
        payload.conversation_id ??
        payload.conversation?.id ??
        payload.data?.conversation?.id ??
        payload.id ??
        payload.data?.id ??
        payload.receivedPayload?.conversation?.id ??
        null
      );
    }

    let body: any = null;
    let payload: any = null;
    let payloadFormat = 'unknown';
    const method = req.method;

    if (method === 'POST' && contentType?.includes('application/json')) {
      try {
        const rawBody = await req.text();
        
        if (rawBody && rawBody.trim().length > 0) {
          body = JSON.parse(rawBody);
          rawPayload = body;
          
          if (!body || Object.keys(body).length === 0) {
            throw new Error('Payload vazio recebido do Chatwoot');
          }
          
          payload = body.receivedPayload ?? body.data ?? body;
          payloadFormat = body.receivedPayload ? 'wrapped' : (body.data ? 'n8n_wrapped' : 'raw');
        }
      } catch (e) {
        console.error(`[dispatcher-multi] Erro ao parsear JSON:`, e);
      }
    }

    if (!payload) {
      const params = url.searchParams;
      
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
      }
    }

    eventType = headerEventType 
      || payload?.event 
      || payload?.event_type 
      || payload?.message_type 
      || 'unknown';
    
    console.log(`[dispatcher-multi] Event type: ${eventType}`);

    // ========== GUARD CLAUSE: MENSAGEM PRIVADA SEM CARD = IGNORAR ==========
    const isPrivateMessage = payload?.private === true || payload?.message?.private === true;
    const messageType = payload?.message_type || payload?.message?.message_type;
    
    // Para message_created privada, verificar ANTES de qualquer processamento
    if ((eventType === 'message_created' || eventType === 'message_updated') && isPrivateMessage) {
      const tempConvId = resolveConversationId(payload);
      
      if (tempConvId) {
        const { data: existingCard } = await supabase
          .from('cards_conversas')
          .select('id')
          .eq('chatwoot_conversa_id', tempConvId)
          .maybeSingle();
        
        if (!existingCard) {
          console.log(`[GHOST-GUARD] ⛔ Mensagem privada sem card existente - BLOQUEANDO. ConversationId: ${tempConvId}`);
          
          await supabase.from('webhook_sync_logs').insert({
            sync_type: 'chatwoot_to_lovable',
            conversation_id: tempConvId,
            status: 'blocked',
            event_type: 'ghost_card_prevented',
            error_message: 'Mensagem privada bloqueada: não existe card para esta conversa',
            latency_ms: Date.now() - startTime,
            payload: { isPrivate: true, messageType, reason: 'GHOST_CARD_PREVENTION' }
          });
          
          return new Response(
            JSON.stringify({ success: true, message: 'Private message ignored - no existing card', blocked: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    // ========================================================================

    const message = payload?.message || payload;
    const conversation = payload?.conversation || message?.conversation;
    
    conversationId = payload ? resolveConversationId(payload) : null;
    
    if (!conversationId && conversation?.id) {
      conversationId = conversation.id;
    }

    if (!conversationId) {
      console.error(`[dispatcher-multi] Payload inválido: conversation_id ausente`);
      
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        status: 'error',
        event_type: eventType || 'unknown',
        error_message: 'Payload inválido: conversation_id ausente',
        latency_ms: Date.now() - startTime,
        payload: { method, payload_format: payloadFormat, receivedPayload: payload },
      });

      return new Response(
        JSON.stringify({ error: 'Invalid payload', details: 'conversation_id ausente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conv = payload.conversation || payload;

    // ========== EXTRAÇÃO ENRIQUECIDA DE DADOS ==========
    const contactName = resolveContactName(payload, conversationId);
    const avatarLeadUrl = resolveAvatarLead(payload);
    const avatarAgenteUrl = resolveAvatarAgente(payload);
    const telefoneLead = resolveTelefoneLead(payload);
    
    console.log(`[dispatcher-multi] Dados extraídos: nome="${contactName}", tel="${telefoneLead}", avatarLead=${!!avatarLeadUrl}, avatarAgente=${!!avatarAgenteUrl}`);
    // ===================================================

    const { data: mappingsData } = await supabase
      .from('mappings_config')
      .select('*')
      .eq('active', true)
      .order('ordem', { ascending: true });

    const mappings = (mappingsData || []) as MappingConfig[];

    const changed_attrs = conv.changed_attributes?.custom_attrs || {};
    const custom_attrs = conv.custom_attributes || {};
    const labels = conv.labels || [];

    const mergedAttrs: Record<string, any> = { ...custom_attrs };
    Object.keys(changed_attrs).forEach(key => {
      const val = changed_attrs[key]?.current_value;
      if (val !== undefined && val !== null && val !== '') {
        mergedAttrs[key] = val;
      }
    });

    const { funilNome: labelFunil, etapaDefault: labelEtapa } = resolveFunilByLabel(labels, mappings);

    let final_funil_nome = labelFunil;
    let fallbackEtapa = labelEtapa;

    if (!final_funil_nome && webhookPath) {
      const pathMap: Record<string, { funil: string; etapa: string }> = {
        'comercial_geral': { funil: 'Comercial', etapa: 'Contato Inicial' },
        'suporte_associado': { funil: 'Suporte ADM Associado', etapa: 'Demanda Aberta' },
        'eventos_colisao': { funil: 'Eventos Colisão', etapa: 'Demanda Aberta' },
        'eventos_terceiros': { funil: 'Eventos Terceiros', etapa: 'Demanda Aberta' },
        'suporte_consultor': { funil: 'Suporte ADM Consultor', etapa: 'Demanda Aberta' },
      };
      const pathKey = webhookPath.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const fb = pathMap[pathKey];
      if (fb) {
        final_funil_nome = fb.funil;
        fallbackEtapa = fb.etapa;
      }
    }

    if (!final_funil_nome && conv.inbox_id) {
      const { data: inboxConfig } = await supabase
        .from('webhooks_config')
        .select('name')
        .eq('inbox_path', String(conv.inbox_id))
        .maybeSingle();
      
      if (inboxConfig?.name) {
        final_funil_nome = inboxConfig.name;
        fallbackEtapa = 'Contato Inicial';
      }
    }

    if (!final_funil_nome) {
      final_funil_nome = 'Comercial';
      fallbackEtapa = 'Contato Inicial';
    }

    const tipoFunil = resolveTipoFunil(final_funil_nome);

    let final_etapa_nome = resolveEtapaPorAtributos(tipoFunil, mergedAttrs, mappings);
    
    if (!final_etapa_nome) {
      final_etapa_nome = fallbackEtapa || labelEtapa;
    }

    const dataRetornoFinal = resolveDataRetorno(mergedAttrs);

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

    // ========== HANDLER: conversation_updated ==========
    if (eventType === 'conversation_updated') {
      const updateFields: any = {
        funil_id: funilId,
        etapa_id: etapaId,
        funil_nome: final_funil_nome,
        funil_etapa: final_etapa_nome,
        data_retorno: dataRetornoFinal,
        titulo: contactName,
        last_chatwoot_sync_at: new Date().toISOString(),
      };
      
      // ENRIQUECIMENTO: Adicionar avatares e telefone se disponíveis
      if (avatarLeadUrl) updateFields.avatar_lead_url = avatarLeadUrl;
      if (avatarAgenteUrl) updateFields.avatar_agente_url = avatarAgenteUrl;
      if (telefoneLead) updateFields.telefone_lead = telefoneLead;

      const { data: upsertedCard, error: upsertError } = await supabase
        .from('cards_conversas')
        .upsert(
          { chatwoot_conversa_id: conversationId, ...updateFields },
          { onConflict: 'chatwoot_conversa_id', ignoreDuplicates: false }
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

      // Criar atividade se data_retorno foi alterada
      if (changed_attrs['data_retorno']) {
        await supabase.from('atividades_cards').insert({
          card_id: cardId,
          tipo: 'DATA_RETORNO',
          descricao: `Data de retorno definida: ${dataRetornoFinal}`,
          privado: false,
        });
      }

      // Criar atividade via custom_attributes
      const resumoAtividade = mergedAttrs['resumo_atividade'];
      const dataFollowup = mergedAttrs['data_followup'];
      
      if (resumoAtividade || dataFollowup) {
        let dataPrevista: string | null = null;
        if (dataFollowup) {
          try {
            const parsedDate = new Date(dataFollowup);
            if (!isNaN(parsedDate.getTime())) {
              dataPrevista = parsedDate.toISOString().split('T')[0];
            }
          } catch (e) {}
        }
        
        await supabase.from('atividades_cards').insert({
          card_id: cardId,
          tipo: 'FOLLOWUP_CHATWOOT',
          descricao: resumoAtividade || 'Follow-up automático via Chatwoot',
          data_prevista: dataPrevista,
          status: 'pendente',
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
          funil: final_funil_nome, 
          etapa: final_etapa_nome, 
          avatarLead: !!avatarLeadUrl,
          avatarAgente: !!avatarAgenteUrl,
          telefone: telefoneLead
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Card upserted', card_id: cardId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== HANDLER: conversation_created ==========
    if (eventType === 'conversation_created') {
      const cardData = {
        chatwoot_conversa_id: conversationId,
        funil_id: funilId,
        etapa_id: etapaId,
        funil_nome: final_funil_nome,
        funil_etapa: final_etapa_nome,
        titulo: contactName || `Conversa #${conversationId}`,
        status: 'em_andamento',
        data_retorno: dataRetornoFinal,
        last_chatwoot_sync_at: new Date().toISOString(),
        // ENRIQUECIMENTO
        avatar_lead_url: avatarLeadUrl,
        avatar_agente_url: avatarAgenteUrl,
        telefone_lead: telefoneLead,
      };

      const { data: card, error: upsertError } = await supabase
        .from('cards_conversas')
        .upsert(cardData, { onConflict: 'chatwoot_conversa_id' })
        .select('id')
        .single();

      if (upsertError) {
        await supabase.from('webhook_sync_logs').insert({
          sync_type: 'chatwoot_to_lovable',
          event_type: 'conversation_created',
          status: 'error',
          conversation_id: conversationId,
          error_message: upsertError.message,
          latency_ms: Date.now() - startTime,
        });
        throw upsertError;
      }

      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        event_type: 'conversation_created',
        status: 'success',
        conversation_id: conversationId,
        card_id: card.id,
        latency_ms: Date.now() - startTime,
        payload: { funil: final_funil_nome, etapa: final_etapa_nome, contact: contactName }
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Card created', card_id: card.id }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== HANDLER: message_created / message_updated ==========
    if (eventType === 'message_created' || eventType === 'message_updated') {
      const messageContent = payload.content || payload.message?.content || '';
      const isPrivate = payload.private === true || payload.message?.private === true;
      const messageId = payload.id || payload.message?.id;
      
      let { data: cardExists } = await supabase
        .from('cards_conversas')
        .select('id')
        .eq('chatwoot_conversa_id', conversationId)
        .maybeSingle();

      const hasValidLabels = labels && labels.length > 0 && labelFunil;
      const hasValidWebhookPath = webhookConfig?.name && final_funil_nome !== 'Comercial';
      const hasValidCriteria = hasValidLabels || hasValidWebhookPath;

      // Auto-criar card se tem critério válido
      if (!cardExists && hasValidCriteria) {
        const cardData = {
          chatwoot_conversa_id: conversationId,
          funil_id: funilId,
          etapa_id: etapaId,
          funil_nome: final_funil_nome,
          funil_etapa: final_etapa_nome,
          titulo: contactName || `Conversa #${conversationId}`,
          status: 'em_andamento',
          data_retorno: dataRetornoFinal,
          last_chatwoot_sync_at: new Date().toISOString(),
          avatar_lead_url: avatarLeadUrl,
          avatar_agente_url: avatarAgenteUrl,
          telefone_lead: telefoneLead,
        };

        const { data: newCard, error: createError } = await supabase
          .from('cards_conversas')
          .insert(cardData)
          .select('id')
          .single();

        if (!createError) {
          cardExists = newCard;
          
          await supabase.from('webhook_sync_logs').insert({
            sync_type: 'chatwoot_to_lovable',
            conversation_id: conversationId,
            card_id: newCard.id,
            status: 'success',
            event_type: 'auto_create_from_message',
            latency_ms: Date.now() - startTime,
            payload: { funil: final_funil_nome, criteria: hasValidLabels ? 'label' : 'webhook_path' }
          });
        }
      }

      // GUARD: Sem card e sem critério válido = IGNORAR
      if (!cardExists && (isPrivate || messageType === 'outgoing')) {
        console.log(`[SKIP] Mensagem sem card e sem critério - ignorando`);
        
        await supabase.from('webhook_sync_logs').insert({
          sync_type: 'chatwoot_to_lovable',
          conversation_id: conversationId,
          status: 'skipped',
          event_type: isPrivate ? 'private_message_ignored' : 'outgoing_message_ignored',
          error_message: 'Mensagem ignorada: sem card e sem critério válido',
          latency_ms: Date.now() - startTime,
        });
        
        return new Response(
          JSON.stringify({ success: true, message: 'Message ignored', skipped: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (cardExists && messageId) {
        // Processar mensagem privada como atividade
        if (isPrivate) {
          await supabase.from('atividades_cards').insert({
            card_id: cardExists.id,
            tipo: 'MENSAGEM_PRIVADA',
            descricao: messageContent || 'Mensagem privada do Chatwoot',
            chatwoot_message_id: messageId,
            privado: true
          });

          await supabase.from('webhook_sync_logs').insert({
            sync_type: 'chatwoot_to_lovable',
            conversation_id: conversationId,
            card_id: cardExists.id,
            status: 'success',
            event_type: 'message_created_private',
            latency_ms: Date.now() - startTime,
          });

          return new Response(
            JSON.stringify({ success: true, message: 'Private message processed', card_id: cardExists.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Mensagem pública - atualizar sync timestamp e dados enriquecidos
        const updateData: any = { last_chatwoot_sync_at: new Date().toISOString() };
        if (avatarLeadUrl) updateData.avatar_lead_url = avatarLeadUrl;
        if (avatarAgenteUrl) updateData.avatar_agente_url = avatarAgenteUrl;
        if (telefoneLead) updateData.telefone_lead = telefoneLead;
        
        await supabase
          .from('cards_conversas')
          .update(updateData)
          .eq('id', cardExists.id);

        await supabase.from('webhook_sync_logs').insert({
          sync_type: 'chatwoot_to_lovable',
          conversation_id: conversationId,
          card_id: cardExists.id,
          status: 'success',
          event_type: 'message_created_public',
          latency_ms: Date.now() - startTime,
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Public message processed', card_id: cardExists.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Auto-heal com critério estrito
      if (!cardExists && hasValidCriteria) {
        const cardData = {
          chatwoot_conversa_id: conversationId,
          funil_id: funilId,
          etapa_id: etapaId,
          funil_nome: final_funil_nome,
          funil_etapa: final_etapa_nome,
          titulo: contactName || `Conversa #${conversationId}`,
          status: 'em_andamento',
          data_retorno: dataRetornoFinal,
          last_chatwoot_sync_at: new Date().toISOString(),
          avatar_lead_url: avatarLeadUrl,
          avatar_agente_url: avatarAgenteUrl,
          telefone_lead: telefoneLead,
        };

        const { data: healedCard, error: healError } = await supabase
          .from('cards_conversas')
          .upsert(cardData, { onConflict: 'chatwoot_conversa_id' })
          .select('id')
          .single();

        if (healError) {
          return new Response(
            JSON.stringify({ error: 'Failed to auto-heal card' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (isPrivate && messageId) {
          await supabase.from('atividades_cards').insert({
            card_id: healedCard.id,
            tipo: 'MENSAGEM_PRIVADA',
            descricao: messageContent || 'Mensagem privada do Chatwoot',
            chatwoot_message_id: messageId,
            privado: true
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Auto-healed card', card_id: healedCard.id }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sem critério válido
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        conversation_id: conversationId,
        status: 'skipped',
        event_type: 'auto_heal_denied',
        error_message: 'Sem critério de classificação válido',
        latency_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Auto-heal denied', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== HANDLER: note_created (Atividades Avulsas) ==========
    if (eventType === 'note_created' || eventType === 'contact_note_created') {
      const noteContent = payload?.content || payload?.note?.content || payload?.body || '';
      const contactId = payload?.contact_id || payload?.contact?.id;
      
      console.log(`[note_created] Criando atividade avulsa. ContactId: ${contactId}, Content: ${noteContent?.substring(0, 100)}`);
      
      // Buscar card existente para este contato (se houver)
      let linkedCardId: string | null = null;
      
      if (conversationId) {
        const { data: existingCard } = await supabase
          .from('cards_conversas')
          .select('id')
          .eq('chatwoot_conversa_id', conversationId)
          .maybeSingle();
        
        if (existingCard) {
          linkedCardId = existingCard.id;
        }
      }
      
      // Criar atividade (card_id pode ser null para atividades avulsas)
      const { data: atividade, error: atividadeError } = await supabase
        .from('atividades_cards')
        .insert({
          card_id: linkedCardId, // Pode ser null
          chatwoot_contact_id: contactId,
          tipo: 'NOTA_CHATWOOT',
          descricao: noteContent || 'Nota do Chatwoot',
          status: 'pendente',
          privado: true,
        })
        .select('id')
        .single();
      
      if (atividadeError) {
        console.error(`[note_created] Erro ao criar atividade:`, atividadeError);
        
        await supabase.from('webhook_sync_logs').insert({
          sync_type: 'chatwoot_to_lovable',
          conversation_id: conversationId,
          status: 'error',
          event_type: 'note_created',
          error_message: atividadeError.message,
          latency_ms: Date.now() - startTime,
        });
        
        return new Response(
          JSON.stringify({ error: 'Failed to create activity from note' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'chatwoot_to_lovable',
        conversation_id: conversationId,
        card_id: linkedCardId,
        status: 'success',
        event_type: 'note_created_activity',
        latency_ms: Date.now() - startTime,
        payload: { atividadeId: atividade.id, contactId, hasLinkedCard: !!linkedCardId }
      });
      
      return new Response(
        JSON.stringify({ success: true, message: 'Note activity created', atividade_id: atividade.id }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log para eventos não tratados
    console.warn(`[UNHANDLED] Event not processed: ${eventType}`);

    await supabase.from('webhook_sync_logs').insert({
      sync_type: 'chatwoot_to_lovable',
      conversation_id: conversationId,
      status: 'warning',
      event_type: eventType,
      error_message: `Event type '${eventType}' not handled`,
      latency_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Event ignored', eventType }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error('>>> [DISPATCHER-MULTI] FATAL ERROR:', err?.message, err?.stack);
    
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
        event_type: eventType || 'crash_handler',
        error_message: `CRASH: ${String(err?.message || err).substring(0, 400)}`,
        latency_ms: Date.now() - startTime,
        payload: { errorName: err?.name, errorStack: err?.stack?.substring(0, 500) }
      });
    } catch (logError) {
      console.error('>>> Failed to log error to DB:', logError);
    }

    return new Response(
      JSON.stringify({ error: String(err?.message || err), recovered: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
