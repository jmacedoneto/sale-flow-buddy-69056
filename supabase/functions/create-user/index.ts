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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é master/admin
    const { data: currentUser } = await supabase
      .from('users_crm')
      .select('role')
      .eq('email', authUser.email)
      .single();

    if (!currentUser || !['master', 'admin'].includes(currentUser.role || '')) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { nome, email, password, role = 'agent' } = body;

    if (!nome || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar usuário no Auth
    const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    });

    if (createError) {
      console.error('[create-user] Erro ao criar usuário no Auth:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar registro em users_crm
    const { error: crmError } = await supabase
      .from('users_crm')
      .insert({
        id: newAuthUser.user.id,
        email,
        nome,
        role,
        status: 'approved',
        approved: true,
        ativo: true
      });

    if (crmError) {
      console.error('[create-user] Erro ao criar users_crm:', crmError);
      // Tentar deletar o usuário do Auth se falhar
      await supabase.auth.admin.deleteUser(newAuthUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar registro do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar role na tabela user_roles
    const roleMap: Record<string, string> = {
      'master': 'admin',
      'admin': 'admin',
      'manager': 'manager',
      'agent': 'agent',
      'viewer': 'viewer'
    };

    await supabase
      .from('user_roles')
      .insert({
        user_id: newAuthUser.user.id,
        role: roleMap[role] || 'agent'
      });

    console.log(`[create-user] Usuário criado: ${email} com role ${role}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newAuthUser.user.id, 
          email, 
          nome, 
          role 
        } 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[create-user] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});