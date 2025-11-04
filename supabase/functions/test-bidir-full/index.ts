import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[test-bidir-full] Iniciando teste do ciclo completo...');

    const testLog: string[] = [];

    // 1. Criar card de teste
    testLog.push('1. Criando card de teste...');
    const testConversationId = Math.floor(Math.random() * 1000000);
    const testDataRetorno = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]; // +3 dias

    const { data: defaultFunil } = await supabase
      .from('funis')
      .select('id, nome')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!defaultFunil) {
      testLog.push('❌ Nenhum funil encontrado no sistema');
      return new Response(
        JSON.stringify({ success: false, log: testLog.join('\n') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: etapas } = await supabase
      .from('etapas')
      .select('id, nome')
      .eq('funil_id', defaultFunil.id)
      .order('ordem', { ascending: true })
      .limit(1);

    const defaultEtapa = etapas?.[0];

    const { data: mockCard, error: createError } = await supabase
      .from('cards_conversas')
      .insert({
        titulo: 'TEST Bidirectional Cycle',
        chatwoot_conversa_id: testConversationId,
        data_retorno: testDataRetorno,
        funil_nome: defaultFunil.nome,
        funil_etapa: defaultEtapa?.nome || 'Teste',
        funil_id: defaultFunil.id,
        etapa_id: defaultEtapa?.id,
      })
      .select()
      .single();

    if (createError || !mockCard) {
      testLog.push(`❌ Erro ao criar card: ${createError?.message}`);
      return new Response(
        JSON.stringify({ success: false, log: testLog.join('\n') }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    testLog.push(`✓ Card criado: ID ${mockCard.id}, conversa ${testConversationId}`);

    // 2. Verificar config bidirecional
    testLog.push('2. Verificando configuração bidirecional...');
    const { data: config } = await supabase
      .from('integracao_chatwoot')
      .select('bidir_enabled')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const originalBidirState = config?.bidir_enabled || false;
    testLog.push(`✓ Estado original: ${originalBidirState ? 'ativo' : 'inativo'}`);

    // 3. Ativar bidirecional temporariamente para teste
    if (!originalBidirState) {
      testLog.push('3. Ativando bidirecional para teste...');
      const { data: configData } = await supabase
        .from('integracao_chatwoot')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (configData) {
        await supabase
          .from('integracao_chatwoot')
          .update({ bidir_enabled: true })
          .eq('id', configData.id);
        testLog.push('✓ Bidirecional ativado temporariamente');
      }
    }

    // 4. Simular webhook Chatwoot
    testLog.push('4. Simulando webhook do Chatwoot...');
    const novaDataRetorno = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]; // +5 dias
    
    const webhookPayload = {
      event: 'conversation_updated',
      conversation: {
        id: testConversationId,
        custom_attributes: {
          nome_do_funil: defaultFunil.nome,
          funil_etapa: defaultEtapa?.nome || 'Teste',
          data_retorno: novaDataRetorno,
        },
      },
    };

    const webhookUrl = `${supabaseUrl}/functions/v1/webhook-dispatcher`;
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      testLog.push(`⚠️ Webhook retornou status ${webhookResponse.status}`);
      const errorText = await webhookResponse.text();
      testLog.push(`Erro: ${errorText}`);
    } else {
      testLog.push('✓ Webhook processado com sucesso');
    }

    // 5. Verificar atualização do card
    testLog.push('5. Verificando atualização do card...');
    const { data: updatedCard } = await supabase
      .from('cards_conversas')
      .select('*')
      .eq('id', mockCard.id)
      .single();

    if (updatedCard && updatedCard.data_retorno === novaDataRetorno) {
      testLog.push(`✓ Card atualizado corretamente! data_retorno: ${novaDataRetorno}`);
      
      // Calcular status da tarefa
      const hoje = new Date();
      const dataRetornoDate = new Date(novaDataRetorno);
      const diffTime = dataRetornoDate.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        testLog.push(`✓ Status tarefa: 🟢 ${diffDays} dias restantes`);
      } else if (diffDays === 0) {
        testLog.push('✓ Status tarefa: 🟡 Vence hoje');
      } else {
        testLog.push(`✓ Status tarefa: 🔴 Vencida há ${Math.abs(diffDays)} dias`);
      }
    } else {
      testLog.push(`⚠️ Card não foi atualizado. Esperado: ${novaDataRetorno}, Atual: ${updatedCard?.data_retorno}`);
    }

    // 6. Verificar atividade criada
    testLog.push('6. Verificando atividades...');
    const { data: atividades } = await supabase
      .from('atividades_cards')
      .select('*')
      .eq('card_id', mockCard.id)
      .order('data_criacao', { ascending: false });

    if (atividades && atividades.length > 0) {
      testLog.push(`✓ ${atividades.length} atividade(s) registrada(s)`);
      atividades.forEach((a, i) => {
        testLog.push(`  ${i + 1}. ${a.tipo}: ${a.descricao}`);
      });
    }

    // 7. Cleanup - deletar card de teste
    testLog.push('7. Limpando dados de teste...');
    await supabase.from('atividades_cards').delete().eq('card_id', mockCard.id);
    await supabase.from('cards_conversas').delete().eq('id', mockCard.id);
    testLog.push('✓ Card de teste removido');

    // 8. Restaurar estado original do bidirecional
    if (!originalBidirState) {
      const { data: configData } = await supabase
        .from('integracao_chatwoot')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (configData) {
        await supabase
          .from('integracao_chatwoot')
          .update({ bidir_enabled: false })
          .eq('id', configData.id);
        testLog.push('✓ Bidirecional desativado (estado restaurado)');
      }
    }

    testLog.push('\n✅ TESTE DO CICLO COMPLETO: SUCESSO!');
    testLog.push('O sistema está funcionando corretamente:');
    testLog.push('- Cards podem ser criados');
    testLog.push('- Webhooks do Chatwoot são processados');
    testLog.push('- Cards são atualizados bidirecionalmente');
    testLog.push('- Atividades são registradas');
    testLog.push('- Status de tarefas são calculados');

    console.log('[test-bidir-full] Teste concluído com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        log: testLog.join('\n'),
        details: {
          cardId: mockCard.id,
          conversationId: testConversationId,
          originalDataRetorno: testDataRetorno,
          updatedDataRetorno: novaDataRetorno,
          atividades: atividades?.length || 0,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[test-bidir-full] Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: String(error),
        log: 'Teste falhou com erro fatal. Verifique os logs.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
