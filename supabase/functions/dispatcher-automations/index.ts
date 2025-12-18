import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomacaoConfig {
  id: string;
  nome: string;
  tipo: string;
  gatilho: {
    evento: string;
    funil_origem?: string;
    etapa_destino?: string;
    score_minimo?: number;
  };
  acao: {
    tipo: string;
    funil_destino?: string;
    etapa_destino?: string;
    dias_prazo?: number;
    tipo_tarefa?: string;
    url_webhook?: string;
    agente_id?: string;
  };
  ativo: boolean;
}

interface DispatcherPayload {
  evento: string;
  card_id?: string;
  funil_id?: string;
  etapa_id?: string;
  etapa_anterior?: string;
  lead_score?: number;
  dados_extras?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: DispatcherPayload = await req.json();
    console.log('[dispatcher-automations] Payload recebido:', payload);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar automações ativas
    const { data: automacoes, error: fetchError } = await supabase
      .from('automacoes_config')
      .select('*')
      .eq('ativo', true);

    if (fetchError) {
      console.error('[dispatcher-automations] Erro ao buscar automações:', fetchError);
      throw fetchError;
    }

    if (!automacoes || automacoes.length === 0) {
      console.log('[dispatcher-automations] Nenhuma automação ativa');
      return new Response(
        JSON.stringify({ message: 'Nenhuma automação ativa', executed: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const executedAutomations: string[] = [];

    for (const automacao of automacoes as AutomacaoConfig[]) {
      const gatilho = automacao.gatilho;
      
      // Verificar se o evento corresponde ao gatilho
      if (gatilho.evento !== payload.evento) continue;

      // Verificar condições específicas
      let shouldExecute = true;

      if (gatilho.funil_origem && payload.funil_id !== gatilho.funil_origem) {
        shouldExecute = false;
      }

      if (gatilho.etapa_destino && payload.etapa_id !== gatilho.etapa_destino) {
        shouldExecute = false;
      }

      // Verificar score mínimo para lead_score_changed
      if (gatilho.evento === 'lead_score_changed' && gatilho.score_minimo) {
        if (!payload.lead_score || payload.lead_score < gatilho.score_minimo) {
          shouldExecute = false;
        }
      }

      if (!shouldExecute) continue;

      console.log(`[dispatcher-automations] Executando automação: ${automacao.nome}`);

      // Executar ação
      const acao = automacao.acao;

      switch (acao.tipo) {
        case 'mover_funil':
          if (payload.card_id && acao.funil_destino && acao.etapa_destino) {
            // Buscar nomes do funil e etapa
            const { data: funil } = await supabase
              .from('funis')
              .select('nome')
              .eq('id', acao.funil_destino)
              .single();

            const { data: etapa } = await supabase
              .from('etapas')
              .select('nome')
              .eq('id', acao.etapa_destino)
              .single();

            const { error: updateError } = await supabase
              .from('cards_conversas')
              .update({
                funil_id: acao.funil_destino,
                etapa_id: acao.etapa_destino,
                funil_nome: funil?.nome || null,
                funil_etapa: etapa?.nome || null,
                etapa_origem_id: payload.etapa_id,
              })
              .eq('id', payload.card_id);

            if (updateError) {
              console.error('[dispatcher-automations] Erro ao mover card:', updateError);
            } else {
              executedAutomations.push(`${automacao.nome} - Card movido para ${funil?.nome}/${etapa?.nome}`);
            }
          }
          break;

        case 'criar_tarefa':
          if (payload.card_id) {
            const dataPrevista = new Date();
            dataPrevista.setDate(dataPrevista.getDate() + (acao.dias_prazo || 1));

            const { error: insertError } = await supabase
              .from('atividades_cards')
              .insert({
                card_id: payload.card_id,
                tipo: acao.tipo_tarefa || 'Retorno',
                descricao: `Tarefa criada automaticamente: ${automacao.nome}`,
                data_prevista: dataPrevista.toISOString().split('T')[0],
                status: 'pendente',
              });

            if (insertError) {
              console.error('[dispatcher-automations] Erro ao criar tarefa:', insertError);
            } else {
              executedAutomations.push(`${automacao.nome} - Tarefa criada`);
            }
          }
          break;

        case 'recalcular_score':
          if (payload.card_id) {
            try {
              const baseUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co');
              const response = await fetch(`${baseUrl}/ai-lead-score`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({ card_id: payload.card_id }),
              });

              if (response.ok) {
                executedAutomations.push(`${automacao.nome} - Score recalculado`);
              } else {
                console.error('[dispatcher-automations] Erro ao recalcular score:', await response.text());
              }
            } catch (scoreError) {
              console.error('[dispatcher-automations] Erro ao recalcular score:', scoreError);
            }
          }
          break;

        case 'disparar_webhook':
          if (acao.url_webhook) {
            try {
              // Buscar dados completos do card se existir
              let cardData = null;
              if (payload.card_id) {
                const { data } = await supabase
                  .from('cards_conversas')
                  .select('*')
                  .eq('id', payload.card_id)
                  .single();
                cardData = data;
              }

              const webhookPayload = {
                evento: payload.evento,
                card_id: payload.card_id,
                card: cardData,
                funil_id: payload.funil_id,
                etapa_id: payload.etapa_id,
                lead_score: payload.lead_score,
                automacao: automacao.nome,
                timestamp: new Date().toISOString(),
              };

              console.log(`[dispatcher-automations] Disparando webhook para: ${acao.url_webhook}`);
              
              const response = await fetch(acao.url_webhook, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookPayload),
              });

              if (response.ok) {
                executedAutomations.push(`${automacao.nome} - Webhook disparado (${response.status})`);
              } else {
                console.error(`[dispatcher-automations] Webhook retornou erro: ${response.status}`);
                executedAutomations.push(`${automacao.nome} - Webhook falhou (${response.status})`);
              }
            } catch (webhookError) {
              console.error('[dispatcher-automations] Erro ao disparar webhook:', webhookError);
            }
          }
          break;

        case 'atribuir_agente':
          if (payload.card_id && acao.agente_id) {
            // Buscar nome do agente
            const { data: agente } = await supabase
              .from('users_crm')
              .select('nome, email')
              .eq('id', acao.agente_id)
              .single();

            const { error: atribuirError } = await supabase
              .from('cards_conversas')
              .update({ assigned_to: acao.agente_id })
              .eq('id', payload.card_id);

            if (atribuirError) {
              console.error('[dispatcher-automations] Erro ao atribuir agente:', atribuirError);
            } else {
              const nomeAgente = agente?.nome || agente?.email || 'Agente';
              executedAutomations.push(`${automacao.nome} - Card atribuído a ${nomeAgente}`);
            }
          }
          break;

        default:
          console.log(`[dispatcher-automations] Ação não implementada: ${acao.tipo}`);
      }
    }

    console.log('[dispatcher-automations] Automações executadas:', executedAutomations);

    return new Response(
      JSON.stringify({ 
        message: 'Automações processadas', 
        executed: executedAutomations 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[dispatcher-automations] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
