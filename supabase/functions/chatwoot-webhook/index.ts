import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
  // Formato nested: payload.conversation.*
  conversation?: {
    id: number;
    status: string;
    created_at: number;
    updated_at: number;
    messages?: Array<{
      id: number;
      content: string;
      created_at: number;
    }>;
    meta: {
      sender: {
        id: number;
        name: string;
        email?: string;
        phone_number?: string;
      };
      channel: string;
      assignee?: ChatwootAssignee;
    };
    assignee?: ChatwootAssignee;
    labels?: string[];
  };
  // Formato flat: payload.id/messages/meta diretamente
  id?: number;
  status?: string;
  created_at?: number;
  updated_at?: number;
  messages?: Array<{
    id: number;
    content: string;
    created_at: number;
  }>;
  meta?: {
    sender: {
      id: number;
      name: string;
      email?: string;
      phone_number?: string;
    };
    channel: string;
    assignee?: ChatwootAssignee;
  };
  assignee?: ChatwootAssignee;
  labels?: string[];
  // Label adicionada/removida
  label?: {
    title: string;
  };
}

/**
 * Processa webhooks do Chatwoot e sincroniza dados com o banco.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[chatwoot-webhook] === WEBHOOK RECEBIDO ===');
    console.log('[chatwoot-webhook] Timestamp:', new Date().toISOString());
    console.log('[chatwoot-webhook] Method:', req.method);
    console.log('[chatwoot-webhook] Headers:', Object.fromEntries(req.headers.entries()));

    // Parse payload do webhook
    const payload: ChatwootWebhookPayload = await req.json();
    console.log('[chatwoot-webhook] === PAYLOAD COMPLETO ===');
    console.log('[chatwoot-webhook]', JSON.stringify(payload, null, 2));
    console.log('[chatwoot-webhook] Evento:', payload.event);

    // Verificar se é um evento que nos interessa
    const validEvents = [
      'conversation_created',
      'conversation_updated',
      'label_added',
      'label_removed'
    ];

    if (!validEvents.includes(payload.event)) {
      console.log('[chatwoot-webhook] Evento ignorado:', payload.event);
      return new Response(
        JSON.stringify({ success: true, message: 'Evento ignorado' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Detectar formato do payload: nested (payload.conversation.*) ou flat (payload.id/messages/meta)
    let conversation: any;
    let payloadFormat: string;
    
    if (payload.conversation) {
      // Formato nested: payload tem conversation object
      conversation = payload.conversation;
      payloadFormat = 'nested';
      console.log('[chatwoot-webhook] Formato payload detectado: nested');
    } else if (payload.id && payload.meta) {
      // Formato flat: payload é a própria conversa
      conversation = payload;
      payloadFormat = 'flat';
      console.log('[chatwoot-webhook] Formato payload detectado: flat');
    } else {
      console.error('[chatwoot-webhook] === ERRO: PAYLOAD INVÁLIDO ===');
      console.error('[chatwoot-webhook] Payload recebido:', JSON.stringify(payload, null, 2));
      throw new Error(`Payload inválido. Evento: ${payload.event}. Esperado: payload.conversation.* (nested) ou payload.id/meta (flat).`);
    }
    
    console.log('[chatwoot-webhook] Conversa ID:', conversation.id);
    console.log('[chatwoot-webhook] Conversa encontrada:', {
      id: conversation.id,
      status: conversation.status,
      labels: conversation.labels,
      channel: conversation.meta?.channel,
      sender: conversation.meta?.sender?.name,
      format: payloadFormat,
    });

    // Verificar se a conversa tem a label KANBAN_CRM (case-insensitive)
    // Em formato flat, labels podem estar em payload.labels
    // Em formato nested, labels estão em payload.conversation.labels
    const labels = payloadFormat === 'flat' ? payload.labels : conversation.labels;
    const foundLabel = labels?.find((label: string) => label.toUpperCase() === 'KANBAN_CRM');
    const hasKanbanLabel = !!foundLabel;
    console.log('[chatwoot-webhook] Labels da conversa:', labels);
    console.log('[chatwoot-webhook] Tem label KANBAN_CRM?', hasKanbanLabel);
    if (foundLabel) {
      console.log('[chatwoot-webhook] Label encontrada (case-insensitive):', foundLabel);
    }

    if (!hasKanbanLabel && payload.event !== 'label_added') {
      console.log('[chatwoot-webhook] Conversa ignorada - sem label KANBAN_CRM');
      return new Response(
        JSON.stringify({ success: true, message: 'Conversa sem label KANBAN_CRM' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Se for label_added, verificar se é a label KANBAN_CRM
    if (payload.event === 'label_added') {
      if (payload.label?.title !== 'KANBAN_CRM') {
        console.log('[chatwoot-webhook] Label adicionada não é KANBAN_CRM');
        return new Response(
          JSON.stringify({ success: true, message: 'Label não é KANBAN_CRM' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Criar cliente Supabase com service role key
    console.log('[chatwoot-webhook] Conectando ao Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Buscar etapa padrão (primeira etapa do primeiro funil)
    console.log('[chatwoot-webhook] Buscando funil padrão...');
    const { data: funis, error: funilError } = await supabaseClient
      .from('funis')
      .select('id')
      .order('created_at')
      .limit(1);

    if (funilError) {
      console.error('[chatwoot-webhook] Erro ao buscar funil:', funilError);
      throw new Error(`Erro ao buscar funil: ${funilError.message}`);
    }

    if (!funis || funis.length === 0) {
      throw new Error('Nenhum funil encontrado no sistema. Crie ao menos um funil no Dashboard.');
    }

    console.log('[chatwoot-webhook] Funil padrão:', funis[0].id);

    console.log('[chatwoot-webhook] Buscando etapa padrão...');
    const { data: etapas, error: etapaError } = await supabaseClient
      .from('etapas')
      .select('id')
      .eq('funil_id', funis[0].id)
      .order('ordem')
      .limit(1);

    if (etapaError) {
      console.error('[chatwoot-webhook] Erro ao buscar etapa:', etapaError);
      throw new Error(`Erro ao buscar etapa: ${etapaError.message}`);
    }

    if (!etapas || etapas.length === 0) {
      throw new Error(`Nenhuma etapa encontrada no funil ${funis[0].id}. Crie ao menos uma etapa no funil.`);
    }

    const defaultEtapaId = etapas[0].id;
    console.log('[chatwoot-webhook] Etapa padrão:', defaultEtapaId);

    // ===== PROCESSAR ASSIGNEE (RESPONSÁVEL) =====
    // O assignee pode estar em diferentes locais dependendo do formato
    const assignee: ChatwootAssignee | undefined = 
      conversation.assignee || 
      conversation.meta?.assignee || 
      payload.assignee;
    
    let assignedToUserId: string | null = null;
    
    if (assignee?.id) {
      console.log('[chatwoot-webhook] Assignee encontrado:', {
        id: assignee.id,
        name: assignee.name,
        email: assignee.email
      });
      
      // Buscar usuário CRM que tem este chatwoot_agent_id
      const { data: crmUser, error: crmUserError } = await supabaseClient
        .from('users_crm')
        .select('id, nome, email, avatar_url')
        .eq('chatwoot_agent_id', assignee.id)
        .eq('ativo', true)
        .single();
      
      if (crmUserError && crmUserError.code !== 'PGRST116') {
        console.error('[chatwoot-webhook] Erro ao buscar usuário CRM:', crmUserError);
      }
      
      if (crmUser) {
        assignedToUserId = crmUser.id;
        console.log('[chatwoot-webhook] Usuário CRM encontrado:', {
          id: crmUser.id,
          nome: crmUser.nome,
          email: crmUser.email
        });
      } else {
        console.log('[chatwoot-webhook] Nenhum usuário CRM vinculado ao agente Chatwoot ID:', assignee.id);
      }
    } else {
      console.log('[chatwoot-webhook] Sem assignee na conversa');
    }

    // Preparar dados do card
    const lastMessage = conversation.messages?.[conversation.messages.length - 1];
    const contactName = conversation.meta.sender.name || 'Sem nome';

    const cardData: Record<string, any> = {
      chatwoot_conversa_id: conversation.id,
      titulo: `${contactName} - ${conversation.meta.channel}`,
      resumo: lastMessage?.content || 'Sem mensagens',
      etapa_id: defaultEtapaId,
      updated_at: new Date().toISOString(),
    };
    
    // Adicionar assigned_to se encontrou usuário CRM vinculado
    if (assignedToUserId) {
      cardData.assigned_to = assignedToUserId;
      console.log('[chatwoot-webhook] Card será atribuído ao usuário:', assignedToUserId);
    }

    console.log('[chatwoot-webhook] === PREPARANDO UPSERT ===');
    console.log('[chatwoot-webhook] Card data:', JSON.stringify(cardData, null, 2));
    console.log('[chatwoot-webhook] Conversation ID:', conversation.id);

    // Fazer upsert do card
    const { data: upsertedCard, error: upsertError } = await supabaseClient
      .from('cards_conversas')
      .upsert(cardData, {
        onConflict: 'chatwoot_conversa_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[chatwoot-webhook] === ERRO NO UPSERT ===');
      console.error('[chatwoot-webhook] Erro:', JSON.stringify(upsertError, null, 2));
      console.error('[chatwoot-webhook] Card data tentado:', JSON.stringify(cardData, null, 2));
      throw new Error(`Erro ao salvar card: ${upsertError.message}`);
    }

    console.log('[chatwoot-webhook] === UPSERT SUCESSO ===');
    console.log('[chatwoot-webhook] Card ID:', upsertedCard.id);
    console.log('[chatwoot-webhook] Card completo:', JSON.stringify(upsertedCard, null, 2));

    // Verificar se é uma criação (não existia antes)
    const isNewCard = payload.event === 'conversation_created' || 
                      payload.event === 'label_added';

    // Criar registro de atividade
    if (upsertedCard && isNewCard) {
      const atividadeData = {
        card_id: upsertedCard.id,
        tipo: 'CRIACAO',
        descricao: `Card criado via Chatwoot ID: ${conversation.id}`,
      };

      const { error: atividadeError } = await supabaseClient
        .from('atividades_cards')
        .insert(atividadeData);

      if (atividadeError) {
        console.error('[chatwoot-webhook] Erro ao criar atividade:', atividadeError);
        // Não lançar erro aqui, apenas logar
      } else {
        console.log('[chatwoot-webhook] Atividade criada para card:', upsertedCard.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processado com sucesso',
        cardId: upsertedCard.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[chatwoot-webhook] === ERRO FATAL ===');
    console.error('[chatwoot-webhook] Tipo:', error?.constructor?.name);
    console.error('[chatwoot-webhook] Mensagem:', error?.message);
    console.error('[chatwoot-webhook] Stack:', error?.stack);
    console.error('[chatwoot-webhook] Timestamp:', new Date().toISOString());

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido ao processar webhook',
        details: {
          type: error?.constructor?.name,
          timestamp: new Date().toISOString(),
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
