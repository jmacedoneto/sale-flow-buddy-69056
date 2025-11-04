import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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
    
    console.log('Checking if master user already exists...');

    // Verificar se master já existe
    const { data: existingUser } = await supabaseAdmin
      .from('users_crm')
      .select('id, email')
      .eq('email', MASTER_EMAIL)
      .single();

    if (existingUser) {
      console.log('Master user already exists:', existingUser.email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Master user already exists',
          userId: existingUser.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('Creating master user in auth...');

    // Criar usuário master com senha especificada
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: MASTER_EMAIL,
      password: MASTER_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: 'Master User' }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    console.log('Master user created in auth:', authData.user.id);

    // Inserir em users_crm com role master e aprovado
    const { error: insertError } = await supabaseAdmin
      .from('users_crm')
      .insert({
        id: authData.user.id,
        email: MASTER_EMAIL,
        nome: 'Master User',
        role: 'master',
        ativo: true,
        approved: true,
        edit_funil: true,
        edit_etapas: true
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Master user inserted in users_crm');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Master user created successfully',
        userId: authData.user.id,
        credentials: {
          email: MASTER_EMAIL,
          note: 'Use the password you provided'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in seed-master-user:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error creating master user' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
