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

    // Load active mappings for intelligent correlation
    const { data: mappingsData } = await supabase
      .from('mappings_config')
      .select('*')
      .eq('active', true)
      .order('ordem', { ascending: true });

    const mappings = mappingsData || [];
    console.log(`[dispatcher-multi] Loaded ${mappings.length} active mappings`);

    // Robust parsing: handle changed_attributes OR custom_attributes, arrays OR strings
    const changed_attrs = conv.changed_attributes?.custom_attrs || {};
    const custom_attrs = conv.custom_attributes || {};
    const labels = conv.labels || [];

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
      etapa_comercial,
      labels
    });

    // Intelligent correlation: priority order = labels > attrs > path
    let final_funil_nome: string | null = null;
    let final_etapa_nome: string | null = null;

    // 1. Process labels first (highest priority)
    for (const label of labels) {
      // Split by ":" (e.g., "etapa:negociacao" -> key="negociacao")
      const parts = label.split(':');
      const key = parts.length > 1 ? parts[1] : label.replace(/^label_/, '');

      // Find exact match in mappings
      const map = mappings.find((m: any) => 
        m.chatwoot_type === 'label' && 
        m.chatwoot_key === key && 
        (!m.chatwoot_value || m.chatwoot_value === label)
      );

      if (map) {
        if (map.lovable_funil) final_funil_nome = map.lovable_funil;
        if (map.lovable_etapa) final_etapa_nome = map.lovable_etapa;
        console.log(`[dispatcher-multi] Manual match label "${label}" → funil: ${map.lovable_funil}, etapa: ${map.lovable_etapa}`);
        break; // First match wins (highest ordem)
      }
    }

    // 2. Process attributes (overrides labels if higher priority)
    if (nome_do_funil) {
      const map = mappings.find((m: any) => 
        m.chatwoot_type === 'attr' && 
        m.chatwoot_key === 'nome_do_funil' && 
        (!m.chatwoot_value || m.chatwoot_value === nome_do_funil)
      );

      if (map && map.lovable_funil) {
        final_funil_nome = map.lovable_funil;
        console.log(`[dispatcher-multi] Manual match attr nome_do_funil="${nome_do_funil}" → funil: ${map.lovable_funil}`);
      } else {
        // Fallback: use attribute value directly
        final_funil_nome = nome_do_funil;
        console.log(`[dispatcher-multi] No map for attr nome_do_funil="${nome_do_funil}", using value directly`);
      }
    }

    if (funil_etapa) {
      const map = mappings.find((m: any) => 
        m.chatwoot_type === 'attr' && 
        m.chatwoot_key === 'funil_etapa' && 
        (!m.chatwoot_value || m.chatwoot_value === funil_etapa)
      );

      if (map && map.lovable_etapa) {
        final_etapa_nome = map.lovable_etapa;
        console.log(`[dispatcher-multi] Manual match attr funil_etapa="${funil_etapa}" → etapa: ${map.lovable_etapa}`);
      } else {
        // Fallback: use attribute value directly
        final_etapa_nome = funil_etapa;
        console.log(`[dispatcher-multi] No map for attr funil_etapa="${funil_etapa}", using value directly`);
      }
    }

    // 3. Fallback to path-based default if no mappings matched
    if (!final_funil_nome) {
      final_funil_nome = webhookPath.includes('Comercial') ? 'Comercial' : 'Administrativo';
      console.log(`[dispatcher-multi] No mapping matched, using path-based default: ${final_funil_nome}`);
    }

    // Process conversation_updated event
    if (event === 'conversation_updated') {
      console.log(`[dispatcher-multi] Processing conversation ${conv_id}`);

      // Use final correlated funil name
      const funil_nome = final_funil_nome!;
      console.log(`[dispatcher-multi] Target funil: ${funil_nome}`);

      // Find or create funil
      let { data: funil, error: funilError } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('nome', funil_nome)
        .maybeSingle();

      let funil_created = false;
      if (!funil) {
        // Auto-create only if name is > 3 chars (avoid confusion)
        if (funil_nome.length > 3) {
          console.log(`[dispatcher-multi] Auto-creating funil: ${funil_nome}`);
          const { data: newFunil, error: insertError } = await supabase
            .from('funis')
            .insert({ nome: funil_nome })
            .select('id, nome')
            .single();

          if (insertError) {
            console.error('[dispatcher-multi] Error creating funil:', insertError);
            
            // Try ILIKE fallback
            const normalized = funil_nome.toLowerCase().replace(/_/g, ' ');
            const { data: similarFunil } = await supabase
              .from('funis')
              .select('id, nome')
              .ilike('nome', `%${normalized}%`)
              .limit(1)
              .maybeSingle();

            if (similarFunil) {
              funil = similarFunil;
              console.log(`[dispatcher-multi] Semi-correlate fallback: "${funil_nome}" → "${funil.nome}" (suggest adding map)`);
            } else {
              // Use default
              const { data: defaultFunil } = await supabase
                .from('funis')
                .select('id, nome')
                .eq('nome', 'Padrão')
                .maybeSingle();

              funil = defaultFunil || { id: null, nome: 'Padrão' };
              console.log(`[dispatcher-multi] Confuso "${funil_nome}" (create failed) → default "Padrão" (suggest map)`);
            }
          } else {
            funil = newFunil;
            funil_created = true;
          }
        } else {
          // Too short, use default
          const { data: defaultFunil } = await supabase
            .from('funis')
            .select('id, nome')
            .eq('nome', 'Padrão')
            .maybeSingle();

          funil = defaultFunil || { id: null, nome: 'Padrão' };
          console.log(`[dispatcher-multi] Confuso "${funil_nome}" (too short) → default "Padrão" (suggest map)`);
        }
      }

      if (!funil) {
        console.error('[dispatcher-multi] Failed to resolve funil, skipping');
        return new Response(
          JSON.stringify({ error: 'Failed to resolve funil' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[dispatcher-multi] Funil resolved: ${funil.nome} (id: ${funil.id}, created: ${funil_created})`);

      // Handle etapa with intelligent correlation
      let etapa_id = null;
      let etapa_nome = final_etapa_nome || funil_etapa;
      let etapa_created = false;
      let is_default = false;

      if (etapa_nome) {
        // Find or create specific etapa
        let { data: etapa } = await supabase
          .from('etapas')
          .select('id, nome')
          .eq('funil_id', funil.id)
          .eq('nome', etapa_nome)
          .maybeSingle();

        if (!etapa && etapa_nome.length > 3) {
          // Auto-create etapa if name is reasonable
          const { data: maxOrdem } = await supabase
            .from('etapas')
            .select('ordem')
            .eq('funil_id', funil.id)
            .order('ordem', { ascending: false })
            .limit(1)
            .maybeSingle();

          const nextOrdem = (maxOrdem?.ordem || 0) + 1;

          console.log(`[dispatcher-multi] Auto-creating etapa: ${etapa_nome} (ordem: ${nextOrdem})`);
          const { data: newEtapa, error: etapaError } = await supabase
            .from('etapas')
            .insert({ funil_id: funil.id, nome: etapa_nome, ordem: nextOrdem })
            .select('id, nome')
            .single();

          if (etapaError) {
            console.error('[dispatcher-multi] Error creating etapa:', etapaError);
            // Try ILIKE fallback
            const normalized = etapa_nome.toLowerCase().replace(/_/g, ' ');
            const { data: similarEtapa } = await supabase
              .from('etapas')
              .select('id, nome')
              .eq('funil_id', funil.id)
              .ilike('nome', `%${normalized}%`)
              .limit(1)
              .maybeSingle();

            if (similarEtapa) {
              etapa = similarEtapa;
              console.log(`[dispatcher-multi] Semi-correlate etapa: "${etapa_nome}" → "${etapa.nome}" (suggest map)`);
            }
          } else {
            etapa = newEtapa;
            etapa_created = true;
          }
        }

        if (etapa) {
          etapa_id = etapa.id;
          etapa_nome = etapa.nome;
        }
      }

      // Use default first etapa if none specified
      if (!etapa_id) {
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
