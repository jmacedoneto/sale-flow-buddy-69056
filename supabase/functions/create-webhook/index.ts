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

    const { nome, evento_chatwoot, acao, config_adicional, ativo } = await req.json();

    console.log('[create-webhook] Criando webhook...');
    console.log('[create-webhook] Nome:', nome);
    console.log('[create-webhook] Evento:', evento_chatwoot);
    console.log('[create-webhook] Ação:', acao);

    // Validações
    if (!nome || !evento_chatwoot || !acao) {
      return new Response(
        JSON.stringify({ error: 'Nome, evento e ação são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('webhook_config')
      .insert({
        nome,
        evento_chatwoot,
        acao,
        config_adicional: config_adicional || null,
        ativo: ativo !== undefined ? ativo : true,
      })
      .select()
      .single();

    if (error) {
      console.error('[create-webhook] Erro ao criar:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-webhook] Webhook criado com sucesso:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        webhook_id: data.id,
        webhook: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-webhook] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
