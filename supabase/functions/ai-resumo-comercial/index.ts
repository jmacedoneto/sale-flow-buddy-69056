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
    const { conversationId, cardId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração de prompt
    const { data: config } = await supabase
      .from('ai_config')
      .select('prompt_resumo_comercial')
      .limit(1)
      .single();

    const systemPrompt = config?.prompt_resumo_comercial || 
      'Analise a conversa e forneça: 1) Probabilidade de fechamento (0-100%), 2) Principais objeções identificadas, 3) Próximos passos recomendados.';

    // Buscar mensagens do Chatwoot
    const { data: messagesData } = await supabase.functions.invoke('get-chatwoot-messages', {
      body: { conversationId },
    });

    if (!messagesData?.messages || messagesData.messages.length === 0) {
      throw new Error('Nenhuma mensagem encontrada');
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise esta conversa comercial:\n\n${conversationHistory}` },
        ],
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

    // Salvar resumo no card
    await supabase
      .from('cards_conversas')
      .update({ resumo_comercial: resumo })
      .eq('id', cardId);

    return new Response(JSON.stringify({ resumo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ai-resumo-comercial] Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
