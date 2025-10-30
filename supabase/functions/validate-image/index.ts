import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageData } = await req.json()

    // Validación 1: Verificar que existe
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó imagen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validación 2: Verificar formato base64 de imagen
    const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/
    if (!base64Regex.test(imageData)) {
      return new Response(
        JSON.stringify({ error: 'Formato de imagen inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validación 3: Verificar tamaño (5MB en base64 ≈ 6.7MB)
    const maxSize = 7000000 // caracteres
    if (imageData.length > maxSize) {
      return new Response(
        JSON.stringify({ error: 'Imagen demasiado grande (máximo 5MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validación 4: Intentar decodificar base64 para verificar integridad
    try {
      const base64Data = imageData.split(',')[1]
      atob(base64Data) // Si falla, no es base64 válido
    } catch {
      return new Response(
        JSON.stringify({ error: 'Datos base64 corruptos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener el usuario autenticado
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Guardar en la base de datos
    const { data, error } = await supabase
      .from('images') // Cambia por el nombre de tu tabla
      .insert({
        user_id: user.id,
        image_data: imageData,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})