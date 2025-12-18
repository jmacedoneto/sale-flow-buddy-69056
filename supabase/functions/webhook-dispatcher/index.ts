import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface para o assignee (agente responsável)
interface ChatwootAssignee {
  id: number;
  name: string;
  email?: string;
  avatar_url?: string;
}

interface ChatwootWebhookPayload {
  event: string;
  conversation?: {
    id: number;
    assignee?: ChatwootAssignee;
    custom_attributes?: {
      nome_do_funil?: string;
      funil_etapa?: string;
      data_retorno?: string;
      label?: string; // Backward compatibility
      etapa_comercial?: string; // Backward compatibility
    };
  };
  assignee?: ChatwootAssignee;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[webhook-dispatcher] Recebendo webhook do Chatwoot...');

    const payload: ChatwootWebhookPayload = await req.json();
    
    console.log('[webhook-dispatcher] Event type:', payload.event);
    
    // Processar apenas eventos relevantes
    if (!['conversation_updated', 'conversation_created'].includes(payload.event)) {
      console.log('[webhook-dispatcher] Evento ignorado:', payload.event);
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se sync bidirecional está ativo
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('bidir_enabled')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error('[webhook-dispatcher] Erro ao buscar config:', configError);
      return new Response(
        JSON.stringify({ error: 'Config error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config?.bidir_enabled) {
      console.log('[webhook-dispatcher] Sync bidirecional desativado');
      return new Response(
        JSON.stringify({ message: 'Bidirectional sync disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados da conversa
    const conversationId = payload.conversation?.id;
    const customAttributes = payload.conversation?.custom_attributes;

    if (!conversationId) {
      console.error('[webhook-dispatcher] conversation_id missing');
      return new Response(
        JSON.stringify({ error: 'Missing conversation_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nomeFunil = customAttributes?.nome_do_funil || customAttributes?.label;
    const funilEtapa = customAttributes?.funil_etapa || customAttributes?.etapa_comercial;
    const dataRetorno = customAttributes?.data_retorno;

    // ===== PROCESSAR ASSIGNEE (RESPONSÁVEL) =====
    const assignee: ChatwootAssignee | undefined = payload.conversation?.assignee || payload.assignee;
    let assignedToUserId: string | null = null;
    
    if (assignee?.id) {
      console.log('[webhook-dispatcher] Assignee encontrado:', {
        id: assignee.id,
        name: assignee.name,
        email: assignee.email
      });
      
      // Buscar usuário CRM que tem este chatwoot_agent_id
      const { data: crmUser, error: crmUserError } = await supabase
        .from('users_crm')
        .select('id, nome, email')
        .eq('chatwoot_agent_id', assignee.id)
        .eq('ativo', true)
        .maybeSingle();
      
      if (crmUserError) {
        console.error('[webhook-dispatcher] Erro ao buscar usuário CRM:', crmUserError);
      }
      
      if (crmUser) {
        assignedToUserId = crmUser.id;
        console.log('[webhook-dispatcher] Usuário CRM vinculado:', crmUser.nome || crmUser.email);
      } else {
        console.log('[webhook-dispatcher] Nenhum usuário CRM vinculado ao agente ID:', assignee.id);
      }
    }

    console.log('[webhook-dispatcher] Processando conversa:', conversationId, {
      nomeFunil,
      funilEtapa,
      dataRetorno,
      assignee: assignee?.id,
      assignedToUserId,
    });

    // Buscar card existente
    const { data: existingCard } = await supabase
      .from('cards_conversas')
      .select('*')
      .eq('chatwoot_conversa_id', conversationId)
      .maybeSingle();

    if (existingCard) {
      // Atualizar card existente
      console.log('[webhook-dispatcher] Atualizando card existente:', existingCard.id);

      // Buscar funil por nome (suporta tanto label quanto nome_do_funil)
      let funilId = existingCard.funil_id;
      let etapaId = existingCard.etapa_id;

      if (nomeFunil) {
        console.log('[webhook-dispatcher] Buscando funil:', nomeFunil);
        const { data: funil } = await supabase
          .from('funis')
          .select('id, nome')
          .ilike('nome', nomeFunil) // case-insensitive
          .maybeSingle();
        
        if (funil) {
          console.log('[webhook-dispatcher] Funil encontrado:', funil);
          funilId = funil.id;
        } else {
          console.warn('[webhook-dispatcher] Funil não encontrado:', nomeFunil);
        }
      }

      if (funilEtapa && funilId) {
        console.log('[webhook-dispatcher] Buscando etapa:', { funilId, funilEtapa });
        const { data: etapa } = await supabase
          .from('etapas')
          .select('id, nome')
          .eq('funil_id', funilId)
          .ilike('nome', funilEtapa) // case-insensitive
          .maybeSingle();
        
        if (etapa) {
          console.log('[webhook-dispatcher] Etapa encontrada:', etapa);
          etapaId = etapa.id;
        } else {
          console.warn('[webhook-dispatcher] Etapa não encontrada:', { funilId, funilEtapa });
        }
      }

      // Preparar objeto de atualização
      const updateData: Record<string, any> = {
        funil_nome: nomeFunil || existingCard.funil_nome,
        funil_etapa: funilEtapa || existingCard.funil_etapa,
        data_retorno: dataRetorno || existingCard.data_retorno,
        funil_id: funilId,
        etapa_id: etapaId,
      };
      
      // Atualizar assigned_to se houver agente vinculado
      if (assignedToUserId) {
        updateData.assigned_to = assignedToUserId;
      }

      console.log('[webhook-dispatcher] Atualizando card com:', updateData);

      const { error: updateError } = await supabase
        .from('cards_conversas')
        .update(updateData)
        .eq('id', existingCard.id);

      if (updateError) {
        console.error('[webhook-dispatcher] Erro ao atualizar card:', updateError);
        return new Response(
          JSON.stringify({ error: 'Update error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar atividade de sync
      await supabase.from('atividades_cards').insert({
        card_id: existingCard.id,
        tipo: 'SYNC_BIDIR',
        descricao: `Atualizado via webhook Chatwoot: ${funilEtapa || 'sem etapa'}`,
      });

      console.log('[webhook-dispatcher] Card atualizado com sucesso');
    } else if (payload.event === 'conversation_created') {
      // Criar novo card apenas se for evento de criação
      console.log('[webhook-dispatcher] Criando novo card para conversa:', conversationId);

      const dataRetornoPadrao = dataRetorno || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      // Buscar funil e etapa padrão
      const { data: defaultFunil } = await supabase
        .from('funis')
        .select('id, nome')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      let funilId = defaultFunil?.id;
      let etapaId = null;

      if (nomeFunil) {
        const { data: funil } = await supabase
          .from('funis')
          .select('id')
          .eq('nome', nomeFunil)
          .maybeSingle();
        
        if (funil) {
          funilId = funil.id;
        }
      }

      if (funilId) {
        const { data: etapas } = await supabase
          .from('etapas')
          .select('id, nome')
          .eq('funil_id', funilId)
          .order('ordem', { ascending: true });

        if (etapas && etapas.length > 0) {
          if (funilEtapa) {
            const etapaEncontrada = etapas.find(e => e.nome === funilEtapa);
            etapaId = etapaEncontrada?.id || etapas[0].id;
          } else {
            etapaId = etapas[0].id;
          }
        }
      }

      // Preparar objeto de inserção
      const insertData: Record<string, any> = {
        chatwoot_conversa_id: conversationId,
        titulo: `Conversa Chatwoot #${conversationId}`,
        funil_nome: nomeFunil || defaultFunil?.nome || 'Sem Funil',
        funil_etapa: funilEtapa || 'Primeira Etapa',
        data_retorno: dataRetornoPadrao,
        funil_id: funilId,
        etapa_id: etapaId,
      };
      
      // Adicionar assigned_to se houver agente vinculado
      if (assignedToUserId) {
        insertData.assigned_to = assignedToUserId;
      }

      const { data: newCard, error: insertError } = await supabase
        .from('cards_conversas')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('[webhook-dispatcher] Erro ao criar card:', insertError);
        return new Response(
          JSON.stringify({ error: 'Insert error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar atividade de criação
      await supabase.from('atividades_cards').insert({
        card_id: newCard.id,
        tipo: 'CRIACAO',
        descricao: 'Card criado via webhook Chatwoot',
      });

      console.log('[webhook-dispatcher] Card criado com sucesso:', newCard.id);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[webhook-dispatcher] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
