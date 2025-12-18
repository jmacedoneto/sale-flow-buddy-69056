import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadScoreResult {
  score: number;
  categoria: 'Quente' | 'Morno' | 'Frio';
  motivos: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { card_id, mensagens } = await req.json();

    if (!card_id) {
      return new Response(
        JSON.stringify({ error: 'card_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar histórico de mensagens se não fornecido
    let historicoMensagens = mensagens || [];
    
    if (!mensagens || mensagens.length === 0) {
      // Buscar atividades do card como histórico
      const { data: atividades } = await supabase
        .from('atividades_cards')
        .select('tipo, descricao, observacao, data_criacao, status')
        .eq('card_id', card_id)
        .order('data_criacao', { ascending: true })
        .limit(50);

      if (atividades) {
        historicoMensagens = atividades.map(a => 
          `[${a.tipo}] ${a.descricao} ${a.observacao ? `- ${a.observacao}` : ''} (${a.status})`
        );
      }
    }

    // Se não há histórico, retornar score neutro
    if (historicoMensagens.length === 0) {
      const result: LeadScoreResult = {
        score: 30,
        categoria: 'Frio',
        motivos: ['Sem histórico de interações para análise']
      };

      await supabase
        .from('cards_conversas')
        .update({ 
          lead_score: result.score, 
          lead_score_categoria: result.categoria 
        })
        .eq('id', card_id);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chamar Lovable AI para análise
    const prompt = `Você é um especialista em qualificação de leads para vendas. Analise o histórico de conversas/atividades abaixo e retorne uma avaliação do lead.

HISTÓRICO:
${historicoMensagens.join('\n')}

CRITÉRIOS DE PONTUAÇÃO:
- Sinais de urgência ou necessidade imediata: +20 pontos
- Perguntas sobre preço/condições: +15 pontos
- Engajamento alto (muitas respostas): +10 pontos
- Objeções repetidas sem resolução: -10 pontos
- Silêncio prolongado: -15 pontos
- Interesse em produtos específicos: +10 pontos
- Pedido de proposta/orçamento: +25 pontos

Retorne APENAS um JSON válido no formato:
{
  "score": [0-100],
  "categoria": "[Quente|Morno|Frio]",
  "motivos": ["motivo1", "motivo2"]
}

Regras para categoria:
- score >= 70: "Quente"
- score >= 40: "Morno"  
- score < 40: "Frio"`;

    console.log('[ai-lead-score] Analisando card:', card_id);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-lead-score] Erro na API:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extrair JSON da resposta
    let result: LeadScoreResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('[ai-lead-score] Erro ao parsear resposta:', content);
      result = {
        score: 50,
        categoria: 'Morno',
        motivos: ['Análise automática não conclusiva']
      };
    }

    // Garantir categoria correta baseada no score
    if (result.score >= 70) result.categoria = 'Quente';
    else if (result.score >= 40) result.categoria = 'Morno';
    else result.categoria = 'Frio';

    // Atualizar card no banco
    const { error: updateError } = await supabase
      .from('cards_conversas')
      .update({ 
        lead_score: result.score, 
        lead_score_categoria: result.categoria 
      })
      .eq('id', card_id);

    if (updateError) {
      console.error('[ai-lead-score] Erro ao atualizar card:', updateError);
    }

    console.log('[ai-lead-score] Score calculado:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-lead-score] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
