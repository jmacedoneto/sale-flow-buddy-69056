import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const MASTER_EMAIL = 'jmacedoneto1989@gmail.com';
    const MASTER_PASSWORD = 'Macedo020589#';

    console.log('[Reset Master] Buscando usuário master...');

    // Buscar usuário na tabela users_crm
    const { data: userCrm, error: userCrmError } = await supabaseAdmin
      .from('users_crm')
      .select('id, email')
      .eq('email', MASTER_EMAIL)
      .single();

    if (userCrmError) {
      console.error('[Reset Master] Erro ao buscar user_crm:', userCrmError);
      throw new Error(`Erro ao buscar usuário: ${userCrmError.message}`);
    }

    console.log('[Reset Master] Usuário encontrado:', userCrm.id);

    // Atualizar senha no auth.users
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userCrm.id,
      { password: MASTER_PASSWORD }
    );

    if (updateError) {
      console.error('[Reset Master] Erro ao atualizar senha:', updateError);
      throw new Error(`Erro ao resetar senha: ${updateError.message}`);
    }

    console.log('[Reset Master] Senha atualizada com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Senha do master resetada com sucesso',
        userId: userCrm.id,
        email: MASTER_EMAIL,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Reset Master] Erro fatal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
