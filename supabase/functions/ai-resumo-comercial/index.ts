import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { card_id: cardId } = await req.json();
    
    if (!cardId) {
      throw new Error('card_id é obrigatório');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // P4: Verificar cache de resumo (< 24h)
    const { data: card } = await supabase
      .from('cards_conversas')
      .select('resumo_comercial, resumo_generated_at, chatwoot_conversa_id')
      .eq('id', cardId)
      .single();

    if (!card) {
      throw new Error('Card não encontrado');
    }

    // Se existe resumo recente (< 24h), retornar cache
    if (card.resumo_comercial && card.resumo_generated_at) {
      const horasCacheadas = (Date.now() - new Date(card.resumo_generated_at).getTime()) / (1000 * 60 * 60);
      if (horasCacheadas < 24) {
        console.log(`[ai-resumo] Cache hit para card ${cardId} (${horasCacheadas.toFixed(1)}h)`);
        return new Response(JSON.stringify({ resumo: card.resumo_comercial, cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Cache inválido ou inexistente - gerar novo resumo
    if (!card.chatwoot_conversa_id) {
      throw new Error('Card não possui conversa do Chatwoot vinculada');
    }

    // Buscar configuração de prompt
    const { data: config } = await supabase
      .from('ai_config')
      .select('prompt_resumo_comercial')
      .limit(1)
      .maybeSingle();

    const systemPrompt = config?.prompt_resumo_comercial || 
      'Analise a conversa e forneça um resumo comercial CONCISO em no máximo 2 parágrafos curtos. Inclua: 1) Probabilidade de fechamento (%), 2) Principal objeção, 3) Próximo passo.';

    // Buscar mensagens do Chatwoot
    const { data: messagesData } = await supabase.functions.invoke('get-chatwoot-messages', {
      body: { conversationId: card.chatwoot_conversa_id },
    });

    if (!messagesData?.messages || messagesData.messages.length === 0) {
      throw new Error('Nenhuma mensagem encontrada para análise');
    }

    // Formatar mensagens para análise
    const conversationHistory = messagesData.messages
      .map((msg: any) => `[${msg.message_type === 0 ? 'Cliente' : 'Agente'}]: ${msg.content}`)
      .join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `${systemPrompt}\n\nRESPONDA EM NO MÁXIMO 2 PARÁGRAFOS CURTOS E DIRETOS.` },
          { role: 'user', content: `Analise esta conversa comercial:\n\n${conversationHistory}` },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Erro ao chamar Lovable AI');
    }

    const data = await response.json();
    const resumo = data.choices?.[0]?.message?.content || 'Não foi possível gerar o resumo.';

    // P4: Salvar resumo + timestamp no card
    await supabase
      .from('cards_conversas')
      .update({ 
        resumo_comercial: resumo,
        resumo_generated_at: new Date().toISOString()
      })
      .eq('id', cardId);

    console.log(`[ai-resumo] Novo resumo gerado para card ${cardId}`);

    return new Response(JSON.stringify({ resumo, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ai-resumo-comercial] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
