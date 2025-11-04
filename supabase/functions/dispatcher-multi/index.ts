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
}

interface FunilConfig {
  funil_nome: string;
  allow_etapa_comercial: boolean;
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

    // Route by path
    let funilConfig: FunilConfig;
    if (webhookPath === 'Meu Comercial') {
      funilConfig = { funil_nome: 'Comercial', allow_etapa_comercial: true };
    } else if (webhookPath === 'Atendimento Regional') {
      funilConfig = { funil_nome: 'Admin Regional', allow_etapa_comercial: false };
    } else {
      console.error(`[dispatcher-multi] Path inválido: ${webhookPath}`);
      return new Response(
        JSON.stringify({ error: 'Webhook inválido: Use /Meu%20Comercial ou /Atendimento%20Regional' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[dispatcher-multi] Config: ${JSON.stringify(funilConfig)}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse payload
    const payload: WebhookPayload = await req.json();
    console.log(`[dispatcher-multi] Event: ${payload.event}`);

    const event = payload.event;
    const conv = payload.conversation;

    if (!conv?.id) {
      console.log('[dispatcher-multi] No conversation ID, skipping');
      return new Response(
        JSON.stringify({ message: 'No conversation ID' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conv_id = conv.id;
    const custom_attrs = conv.custom_attributes || {};
    const changed_attrs = conv.changed_attributes || {};

    // Process conversation_updated event
    if (event === 'conversation_updated') {
      console.log(`[dispatcher-multi] Processing conversation ${conv_id}`);

      // Parse attributes from changed_attributes or custom_attributes
      const parseAttrValue = (key: string) => {
        // Try changed_attributes first (format: {current_value: ...})
        if (changed_attrs[key]?.current_value !== undefined) {
          return changed_attrs[key].current_value;
        }
        // Fallback to custom_attributes
        return custom_attrs[key];
      };

      const nome_do_funil = parseAttrValue('nome_do_funil');
      const funil_etapa = parseAttrValue('funil_etapa');
      const data_retorno = parseAttrValue('data_retorno');
      const etapa_comercial = funilConfig.allow_etapa_comercial ? parseAttrValue('etapa_comercial') : null;

      console.log(`[dispatcher-multi] Parsed attrs:`, {
        nome_do_funil,
        funil_etapa,
        data_retorno,
        etapa_comercial
      });

      // Build update fields
      const updateFields: any = {
        chatwoot_conversa_id: conv_id,
        funil_nome: funilConfig.funil_nome,
        titulo: `Conversa Chatwoot #${conv_id}`,
      };

      if (funil_etapa) updateFields.funil_etapa = funil_etapa;
      if (data_retorno) updateFields.data_retorno = data_retorno;
      if (etapa_comercial) updateFields.resumo_comercial = etapa_comercial;

      // Find funil_id and etapa_id
      const { data: funil } = await supabase
        .from('funis')
        .select('id')
        .eq('nome', funilConfig.funil_nome)
        .maybeSingle();

      if (funil) {
        updateFields.funil_id = funil.id;

        // Find etapa_id if funil_etapa is provided
        if (funil_etapa) {
          const { data: etapa } = await supabase
            .from('etapas')
            .select('id')
            .eq('funil_id', funil.id)
            .eq('nome', funil_etapa)
            .maybeSingle();

          if (etapa) {
            updateFields.etapa_id = etapa.id;
          }
        }
      }

      // Upsert card
      const { error } = await supabase
        .from('cards_conversas')
        .upsert(updateFields, { onConflict: 'chatwoot_conversa_id' });

      if (error) {
        console.error('[dispatcher-multi] Upsert error:', error);
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[dispatcher-multi] Card synced for conversation ${conv_id}`);
    }

    // Process message_created event (private messages)
    if (event === 'message_created' && payload.private) {
      console.log(`[dispatcher-multi] Processing private message for conversation ${conv_id}`);

      // Store private message (you may need to create this table)
      const { error } = await supabase
        .from('atividades_cards')
        .insert({
          card_id: (await supabase
            .from('cards_conversas')
            .select('id')
            .eq('chatwoot_conversa_id', conv_id)
            .maybeSingle()).data?.id,
          tipo: 'MENSAGEM_PRIVADA',
          descricao: payload.content || 'Mensagem privada recebida',
          privado: true,
        });

      if (error) {
        console.error('[dispatcher-multi] Private message insert error:', error);
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
