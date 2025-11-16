import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatwootMessage {
  id: number;
  content: string;
  message_type: string;
  conversation: {
    id: number;
    meta: {
      sender?: {
        id: string;
      };
    };
  };
}

interface CommandMatch {
  command: string;
  data: string;
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

    const payload = await req.json();
    console.log('[chatwoot-text-commands] Payload recebido:', JSON.stringify(payload, null, 2));

    // Validar se é uma mensagem de entrada
    if (payload.event !== 'message_created') {
      console.log('[chatwoot-text-commands] Evento ignorado:', payload.event);
      return new Response(
        JSON.stringify({ message: 'Evento ignorado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message: ChatwootMessage = payload;
    
    // Ignorar mensagens de saída (enviadas pelo agente)
    if (message.message_type === 'outgoing') {
      console.log('[chatwoot-text-commands] Mensagem de saída ignorada');
      return new Response(
        JSON.stringify({ message: 'Mensagem de saída ignorada' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = message.content || '';
    console.log('[chatwoot-text-commands] Conteúdo da mensagem:', content);

    // Detectar comandos
    const commandMatch = parseCommand(content);
    if (!commandMatch) {
      console.log('[chatwoot-text-commands] Nenhum comando detectado');
      return new Response(
        JSON.stringify({ message: 'Nenhum comando detectado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[chatwoot-text-commands] Comando detectado:', commandMatch);

    // Buscar card associado à conversa
    const conversationId = message.conversation.id;
    const { data: cards, error: cardError } = await supabase
      .from('cards_conversas')
      .select('id')
      .eq('chatwoot_conversa_id', conversationId)
      .limit(1);

    if (cardError || !cards || cards.length === 0) {
      console.error('[chatwoot-text-commands] Card não encontrado:', cardError);
      return new Response(
        JSON.stringify({ error: 'Card não encontrado para esta conversa' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cardId = cards[0].id;
    console.log('[chatwoot-text-commands] Card encontrado:', cardId);

    // Executar comando
    const result = await executeCommand(supabase, commandMatch, cardId, message.id);

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[chatwoot-text-commands] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Parse command from message content
 * Supported formats:
 * /atividade DD/MM Descrição
 * /atividade DD/MM/YYYY Descrição
 */
function parseCommand(content: string): CommandMatch | null {
  // Comando /atividade
  const atividadeRegex = /^\/atividade\s+(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s+(.+)$/i;
  const match = content.match(atividadeRegex);
  
  if (match) {
    return {
      command: 'atividade',
      data: JSON.stringify({
        date: match[1],
        description: match[2],
      }),
    };
  }

  return null;
}

/**
 * Execute the detected command
 */
async function executeCommand(
  supabase: any,
  commandMatch: CommandMatch,
  cardId: string,
  chatwootMessageId: number
) {
  if (commandMatch.command === 'atividade') {
    return await createAtividade(supabase, commandMatch.data, cardId, chatwootMessageId);
  }

  throw new Error('Comando não suportado: ' + commandMatch.command);
}

/**
 * Create activity from command
 */
async function createAtividade(
  supabase: any,
  dataJson: string,
  cardId: string,
  chatwootMessageId: number
) {
  const data = JSON.parse(dataJson);
  const { date, description } = data;

  // Parse date DD/MM or DD/MM/YYYY
  const dateParts = date.split('/');
  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
  const year = dateParts[2] ? parseInt(dateParts[2]) : new Date().getFullYear();

  const dataPrevista = new Date(year, month, day);
  
  console.log('[chatwoot-text-commands] Criando atividade:', {
    cardId,
    description,
    dataPrevista: dataPrevista.toISOString(),
  });

  const { data: atividade, error } = await supabase
    .from('atividades_cards')
    .insert({
      card_id: cardId,
      tipo: 'follow-up',
      descricao: description,
      data_prevista: dataPrevista.toISOString().split('T')[0],
      status: 'pendente',
      privado: false,
      chatwoot_message_id: chatwootMessageId,
    })
    .select()
    .single();

  if (error) {
    console.error('[chatwoot-text-commands] Erro ao criar atividade:', error);
    throw error;
  }

  console.log('[chatwoot-text-commands] Atividade criada:', atividade);
  return atividade;
}
