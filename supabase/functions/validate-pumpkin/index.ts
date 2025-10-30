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
    const { imageData, userId } = await req.json()

    // VALIDACIÓN 1: Verificar userId
    if (!userId || userId.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Usuario inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // VALIDACIÓN 2: Verificar formato base64 de imagen
    const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/
    if (!base64Regex.test(imageData)) {
      return new Response(
        JSON.stringify({ error: 'Formato de imagen inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // VALIDACIÓN 3: Verificar tamaño (máximo 5MB)
    const maxSize = 7000000 // caracteres (≈5MB en base64)
    if (imageData.length > maxSize) {
      return new Response(
        JSON.stringify({ error: 'Imagen demasiado grande (máximo 5MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // VALIDACIÓN 4: Decodificar base64 para verificar integridad
    try {
      const base64Data = imageData.split(',')[1]
      atob(base64Data)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Imagen corrupta o inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 🔑 Obtener IP del usuario
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown'

    // Crear cliente de Supabase con SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // VALIDACIÓN 5: Verificar límite por userId
    const { count: userCount, error: userCountError } = await supabase
      .from('calabazas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (userCountError) {
      console.error('Error contando por userId:', userCountError)
      return new Response(
        JSON.stringify({ error: 'Error al verificar límite de usuario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // VALIDACIÓN 6: Verificar límite por IP
    const { count: ipCount, error: ipCountError } = await supabase
      .from('calabazas')
      .select('*', { count: 'exact', head: true })
      .eq('user_ip', ip)

    if (ipCountError) {
      console.error('Error contando por IP:', ipCountError)
      return new Response(
        JSON.stringify({ error: 'Error al verificar límite de IP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar si alguno de los dos llegó al límite
    if ((userCount !== null && userCount >= 5) || (ipCount !== null && ipCount >= 5)) {
      return new Response(
        JSON.stringify({ error: 'Has alcanzado el límite de 5 calabazas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Guardar calabaza con userId e IP
    const { data, error } = await supabase
      .from('calabazas')
      .insert({
        user_id: userId,
        user_ip: ip,
        img: imageData,
        visible: false,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Error insertando:', error)
      return new Response(
        JSON.stringify({ error: 'Error al guardar la calabaza' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        remaining: 4 - Math.max(userCount ?? 0, ipCount ?? 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error general:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})