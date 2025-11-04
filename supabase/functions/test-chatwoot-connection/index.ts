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
    const { url, account_id } = await req.json();

    console.log('[test-chatwoot-connection] Testando conexão com Chatwoot...');
    console.log('[test-chatwoot-connection] URL:', url);
    console.log('[test-chatwoot-connection] Account ID:', account_id);

    // API Key do ambiente
    const api_key = Deno.env.get('CHATWOOT_API_KEY');
    
    // Validações
    if (!url || !account_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'URL e Account ID são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!api_key) {
      return new Response(
        JSON.stringify({ success: false, message: 'CHATWOOT_API_KEY não configurado no ambiente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remover barra final da URL se existir
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;

    // Testar conexão com Chatwoot
    const chatwootUrl = `${cleanUrl}/api/v1/accounts/${account_id}/conversations`;
    console.log('[test-chatwoot-connection] Chamando:', chatwootUrl);

    const response = await fetch(chatwootUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': api_key,
      },
    });

    console.log('[test-chatwoot-connection] Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[test-chatwoot-connection] Erro na resposta:', errorText);

      let message = 'Erro ao conectar com Chatwoot';
      if (response.status === 401) {
        message = 'API Key inválida ou sem permissão';
      } else if (response.status === 404) {
        message = 'URL ou Account ID incorretos';
      } else if (response.status === 403) {
        message = 'Acesso negado. Verifique as permissões da API Key';
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          message,
          details: errorText 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const conversationCount = data?.data?.payload?.length || 0;

    console.log('[test-chatwoot-connection] Conexão bem-sucedida!');
    console.log('[test-chatwoot-connection] Conversas encontradas:', conversationCount);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Chatwoot conectado com sucesso!',
        conversation_count: conversationCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[test-chatwoot-connection] Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro ao testar conexão',
        details: String(error)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
