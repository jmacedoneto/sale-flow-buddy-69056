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
  };
  id?: number;
  private?: boolean;
  content?: string;
  created_at?: number;
  message_type?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('OK', { headers: corsHeaders });
  }

  try {
    // Extract webhook path from URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(s => s);
    const webhookPath = decodeURIComponent(pathSegments[pathSegments.length - 1]);
    
    console.log(`[dispatcher-multi] Webhook path: ${webhookPath}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if webhook is active
    const { data: webhookConfig, error: configError } = await supabase
      .from('webhooks_config')
      .select('*')
      .eq('inbox_path', `/${webhookPath}`)
      .eq('active', true)
      .maybeSingle();

    if (configError || !webhookConfig) {
      console.error(`[dispatcher-multi] Webhook inativo ou não encontrado: ${webhookPath}`);
      return new Response(
        JSON.stringify({ error: 'Webhook inativo ou não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[dispatcher-multi] Webhook ativo: ${webhookConfig.name}`);

    // Parse payload
    const payload: WebhookPayload = await req.json();
    console.log(`[dispatcher-multi] Event: ${payload.event}`);

    const event = payload.event;
    const conv = payload.conversation;

    if (!conv?.id) {
      console.log('[dispatcher-multi] No conversation ID, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'No conversation ID' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conv_id = conv.id;

    // Robust parsing: handle changed_attributes OR custom_attributes, arrays OR strings
    const changed_attrs = conv.changed_attributes?.custom_attrs || {};
    const custom_attrs = conv.custom_attributes || {};

    const parseAttrValue = (key: string) => {
      // Try changed_attributes first (format: {current_value: ...})
      let val = changed_attrs[key]?.current_value;
      
      // Fallback to custom_attributes
      if (val === undefined || val === null || val === '') {
        val = custom_attrs[key];
      }

      // Handle null/empty
      if (val === null || val === undefined || val === '') {
        return null;
      }

      // Handle arrays (take first element)
      if (Array.isArray(val)) {
        return val.length > 0 ? val[0] : null;
      }

      return val;
    };

    const nome_do_funil = parseAttrValue('nome_do_funil');
    const funil_etapa = parseAttrValue('funil_etapa');
    const data_retorno = parseAttrValue('data_retorno');
    const etapa_comercial = parseAttrValue('etapa_comercial');

    console.log(`[dispatcher-multi] Parsed attrs:`, {
      nome_do_funil,
      funil_etapa,
      data_retorno,
      etapa_comercial
    });

    // Process conversation_updated event
    if (event === 'conversation_updated') {
      console.log(`[dispatcher-multi] Processing conversation ${conv_id}`);

      // Determine base funil from path
      let funil_nome = webhookPath.includes('Comercial') ? 'Comercial' : 'Administrativo';
      
      // Override with custom attribute if provided
      if (nome_do_funil) {
        funil_nome = nome_do_funil;
      }

      console.log(`[dispatcher-multi] Target funil: ${funil_nome}`);

      // Find or create funil
      let { data: funil, error: funilError } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('nome', funil_nome)
        .maybeSingle();

      let funil_created = false;
      if (!funil) {
        console.log(`[dispatcher-multi] Auto-creating funil: ${funil_nome}`);
        const { data: newFunil, error: insertError } = await supabase
          .from('funis')
          .insert({ nome: funil_nome })
          .select('id, nome')
          .single();

        if (insertError) {
          console.error('[dispatcher-multi] Error creating funil:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to create funil' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        funil = newFunil;
        funil_created = true;
      }

      console.log(`[dispatcher-multi] Funil resolved: ${funil.nome} (id: ${funil.id}, created: ${funil_created})`);

      // Handle etapa
      let etapa_id = null;
      let etapa_nome = funil_etapa;
      let etapa_created = false;
      let is_default = false;

      if (funil_etapa) {
        // Find or create specific etapa
        let { data: etapa } = await supabase
          .from('etapas')
          .select('id, nome')
          .eq('funil_id', funil.id)
          .eq('nome', funil_etapa)
          .maybeSingle();

        if (!etapa) {
          // Get max ordem for this funil
          const { data: maxOrdem } = await supabase
            .from('etapas')
            .select('ordem')
            .eq('funil_id', funil.id)
            .order('ordem', { ascending: false })
            .limit(1)
            .maybeSingle();

          const nextOrdem = (maxOrdem?.ordem || 0) + 1;

          console.log(`[dispatcher-multi] Auto-creating etapa: ${funil_etapa} (ordem: ${nextOrdem})`);
          const { data: newEtapa, error: etapaError } = await supabase
            .from('etapas')
            .insert({ funil_id: funil.id, nome: funil_etapa, ordem: nextOrdem })
            .select('id, nome')
            .single();

          if (etapaError) {
            console.error('[dispatcher-multi] Error creating etapa:', etapaError);
          } else {
            etapa = newEtapa;
            etapa_created = true;
          }
        }

        if (etapa) {
          etapa_id = etapa.id;
          etapa_nome = etapa.nome;
        }
      } else {
        // Use default first etapa
        const { data: defaultEtapa } = await supabase
          .from('etapas')
          .select('id, nome')
          .eq('funil_id', funil.id)
          .order('ordem', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (defaultEtapa) {
          etapa_id = defaultEtapa.id;
          etapa_nome = defaultEtapa.nome;
          is_default = true;
        }
      }

      console.log(`[dispatcher-multi] Etapa resolved: ${etapa_nome || 'none'} (id: ${etapa_id}, created: ${etapa_created}, default: ${is_default})`);

      // Build update fields
      const updateFields: any = {
        chatwoot_conversa_id: conv_id,
        funil_id: funil.id,
        funil_nome: funil.nome,
        titulo: `Conversa Chatwoot #${conv_id}`,
        updated_at: new Date().toISOString(),
      };

      if (etapa_id) {
        updateFields.etapa_id = etapa_id;
        updateFields.funil_etapa = etapa_nome;
      }

      if (data_retorno) {
        updateFields.data_retorno = new Date(data_retorno).toISOString();
      }

      if (funil_nome === 'Comercial' && etapa_comercial) {
        updateFields.resumo_comercial = etapa_comercial;
      }

      // Upsert card
      const { data: upsertData, error: upsertError } = await supabase
        .from('cards_conversas')
        .upsert(updateFields, { onConflict: 'chatwoot_conversa_id' })
        .select('id');

      if (upsertError) {
        console.error('[dispatcher-multi] Upsert error:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Database error', details: upsertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isUpdate = upsertData && upsertData.length > 0;
      console.log(`[dispatcher-multi] Card ${isUpdate ? 'updated' : 'created'} for conversation ${conv_id}`);
    }

    // Process message_created event (private messages)
    if (event === 'message_created' && payload.private) {
      console.log(`[dispatcher-multi] Processing private message for conversation ${conv_id}`);

      // Find card by conversation_id
      const { data: card } = await supabase
        .from('cards_conversas')
        .select('id')
        .eq('chatwoot_conversa_id', conv_id)
        .maybeSingle();

      if (card) {
        const { error: msgError } = await supabase
          .from('atividades_cards')
          .insert({
            card_id: card.id,
            tipo: 'MENSAGEM_PRIVADA',
            descricao: payload.content || 'Mensagem privada recebida',
            privado: true,
            chatwoot_message_id: payload.id || null,
            data_criacao: payload.created_at ? new Date(payload.created_at * 1000).toISOString() : new Date().toISOString(),
          });

        if (msgError) {
          // Ignore duplicate errors (UNIQUE constraint)
          if (!msgError.message.includes('duplicate') && !msgError.message.includes('unique')) {
            console.error('[dispatcher-multi] Private message insert error:', msgError);
          } else {
            console.log('[dispatcher-multi] Private message already exists (duplicate), skipping');
          }
        } else {
          console.log(`[dispatcher-multi] Private message appended to card ${card.id}`);
        }
      } else {
        console.log(`[dispatcher-multi] No card found for conversation ${conv_id}, skipping private message`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Synced', webhook: webhookPath }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[dispatcher-multi] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
