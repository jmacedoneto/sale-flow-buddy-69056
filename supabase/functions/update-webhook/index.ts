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

    const { webhook_id, nome, evento_chatwoot, acao, config_adicional, ativo } = await req.json();

    console.log('[update-webhook] Atualizando webhook:', webhook_id);

    // Validações
    if (!webhook_id) {
      return new Response(
        JSON.stringify({ error: 'webhook_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (evento_chatwoot !== undefined) updateData.evento_chatwoot = evento_chatwoot;
    if (acao !== undefined) updateData.acao = acao;
    if (config_adicional !== undefined) updateData.config_adicional = config_adicional;
    if (ativo !== undefined) updateData.ativo = ativo;

    const { data, error } = await supabase
      .from('webhook_config')
      .update(updateData)
      .eq('id', webhook_id)
      .select()
      .single();

    if (error) {
      console.error('[update-webhook] Erro ao atualizar:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[update-webhook] Webhook atualizado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        webhook: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[update-webhook] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
