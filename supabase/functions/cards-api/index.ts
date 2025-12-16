import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Hash function for API key validation
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate API Key
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key required. Include x-api-key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the API key
    const keyHash = await hashApiKey(apiKey);
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('active', true)
      .single();

    if (keyError || !keyData) {
      console.log('Invalid API Key attempt');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or inactive API Key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last used
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    // Parse request
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    console.log(`API Request: action=${action}`);

    // Handle actions
    switch (action) {
      case 'move': {
        const { cardId, newStageId, funilId } = body;

        if (!cardId || !newStageId) {
          return new Response(
            JSON.stringify({ success: false, error: 'cardId and newStageId are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get current card data
        const { data: currentCard, error: cardError } = await supabase
          .from('cards_conversas')
          .select('*')
          .eq('id', cardId)
          .single();

        if (cardError || !currentCard) {
          return new Response(
            JSON.stringify({ success: false, error: 'Card not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update card
        const updateData: any = { 
          etapa_id: newStageId,
          updated_at: new Date().toISOString()
        };

        if (funilId) {
          updateData.funil_id = funilId;
        }

        const { data: updatedCard, error: updateError } = await supabase
          .from('cards_conversas')
          .update(updateData)
          .eq('id', cardId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating card:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Card ${cardId} moved to stage ${newStageId}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            card: updatedCard,
            previousStage: currentCard.etapa_id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        const { funilId, etapaId, status, limit = 50 } = body;

        let query = supabase
          .from('cards_conversas')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(limit);

        if (funilId) query = query.eq('funil_id', funilId);
        if (etapaId) query = query.eq('etapa_id', etapaId);
        if (status) query = query.eq('status', status);

        const { data: cards, error } = await query;

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, cards, count: cards?.length || 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        const { cardId } = body;

        if (!cardId) {
          return new Response(
            JSON.stringify({ success: false, error: 'cardId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: card, error } = await supabase
          .from('cards_conversas')
          .select('*')
          .eq('id', cardId)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: 'Card not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, card }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        const { titulo, funilId, etapaId, resumo, assignedTo } = body;

        if (!titulo || !funilId || !etapaId) {
          return new Response(
            JSON.stringify({ success: false, error: 'titulo, funilId, and etapaId are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: card, error } = await supabase
          .from('cards_conversas')
          .insert({
            titulo,
            funil_id: funilId,
            etapa_id: etapaId,
            resumo: resumo || null,
            assigned_to: assignedTo || null,
            status: 'aberto'
          })
          .select()
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Card created: ${card.id}`);

        return new Response(
          JSON.stringify({ success: true, card }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { cardId, ...updates } = body;

        if (!cardId) {
          return new Response(
            JSON.stringify({ success: false, error: 'cardId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Remove action from updates
        delete updates.action;

        const { data: card, error } = await supabase
          .from('cards_conversas')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', cardId)
          .select()
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, card }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid action. Available: move, list, get, create, update' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
