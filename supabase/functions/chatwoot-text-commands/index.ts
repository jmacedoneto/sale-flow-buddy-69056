import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatwootWebhook {
  event: string;
  message_type: string;
  content: string;
  conversation: {
    id: number;
    custom_attributes?: {
      card_id?: string;
    };
  };
  sender?: {
    type: string;
    id: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ChatwootWebhook = await req.json();
    console.log('[chatwoot-text-commands] Webhook recebido:', JSON.stringify(payload));

    // Ignorar se não for mensagem de entrada
    if (payload.event !== 'message_created' || payload.message_type !== 'incoming') {
      return new Response(JSON.stringify({ message: 'Evento ignorado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const content = payload.content?.trim() || '';
    
    // Verificar se é um comando (começa com /)
    if (!content.startsWith('/')) {
      return new Response(JSON.stringify({ message: 'Não é um comando' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar card relacionado à conversa
    const conversationId = payload.conversation.id;
    const { data: card, error: cardError } = await supabase
      .from('cards_conversas')
      .select('*')
      .eq('chatwoot_conversa_id', conversationId)
      .single();

    if (cardError || !card) {
      console.error('[chatwoot-text-commands] Card não encontrado:', cardError);
      return new Response(JSON.stringify({ error: 'Card não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar comando
    const [comando, ...args] = content.toLowerCase().split(' ');
    let resultado = '';

    switch (comando) {
      case '/pausar':
        await supabase
          .from('cards_conversas')
          .update({ pausado: true })
          .eq('id', card.id);
        resultado = '✅ Negociação pausada';
        break;

      case '/retomar':
        await supabase
          .from('cards_conversas')
          .update({ pausado: false })
          .eq('id', card.id);
        resultado = '✅ Negociação retomada';
        break;

      case '/prioridade':
        const prioridade = args[0] || 'media';
        const prioridadesValidas = ['baixa', 'media', 'alta', 'urgente'];
        
        if (!prioridadesValidas.includes(prioridade)) {
          resultado = '❌ Prioridade inválida. Use: baixa, media, alta, urgente';
        } else {
          await supabase
            .from('cards_conversas')
            .update({ prioridade })
            .eq('id', card.id);
          resultado = `✅ Prioridade alterada para: ${prioridade}`;
        }
        break;

      case '/transferir':
        const emailUsuario = args[0]?.replace('@', '');
        
        if (!emailUsuario) {
          resultado = '❌ Uso: /transferir @email_usuario';
        } else {
          const { data: usuario } = await supabase
            .from('users_crm')
            .select('id')
            .eq('email', emailUsuario)
            .single();

          if (!usuario) {
            resultado = '❌ Usuário não encontrado';
          } else {
            await supabase
              .from('cards_conversas')
              .update({ assigned_to: usuario.id })
              .eq('id', card.id);
            resultado = `✅ Card transferido para ${emailUsuario}`;
          }
        }
        break;

      case '/info':
        resultado = `📋 Card: ${card.titulo}\n🏷️ Funil: ${card.funil_nome || 'N/A'}\n📍 Etapa: ${card.funil_etapa || 'N/A'}\n💰 Valor: R$ ${card.valor_total || 0}\n⏸️ Pausado: ${card.pausado ? 'Sim' : 'Não'}`;
        break;

      case '/ajuda':
      case '/comandos':
        resultado = `📝 Comandos disponíveis:
/pausar - Pausar negociação
/retomar - Retomar negociação
/prioridade [baixa|media|alta|urgente] - Alterar prioridade
/transferir @email - Transferir para outro usuário
/info - Ver informações do card
/ajuda - Ver esta mensagem`;
        break;

      default:
        resultado = `❌ Comando desconhecido: ${comando}\nUse /ajuda para ver comandos disponíveis`;
    }

    // Registrar atividade
    await supabase.from('atividades_cards').insert({
      card_id: card.id,
      tipo: 'comando',
      descricao: `Comando executado: ${content}`,
      observacao: resultado,
      privado: false,
    });

    console.log('[chatwoot-text-commands] Comando processado:', { comando, resultado });

    return new Response(JSON.stringify({ 
      success: true,
      comando,
      resultado 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[chatwoot-text-commands] Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
