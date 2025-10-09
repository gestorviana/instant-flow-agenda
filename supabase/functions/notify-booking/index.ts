import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotification {
  booking_id: string;
  event_type: "created" | "confirmed" | "cancelled";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { booking_id, event_type }: BookingNotification = await req.json();
    
    console.log(`Processing ${event_type} event for booking ${booking_id}`);

    // Buscar dados completos do booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        agendas (
          title,
          user_id,
          slug
        ),
        services (
          name,
          duration_minutes,
          price
        )
      `)
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      console.error("Erro ao buscar booking:", bookingError);
      throw new Error("Booking não encontrado");
    }

    // Buscar configurações do usuário (webhook URL)
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("webhook_url")
      .eq("user_id", booking.agendas.user_id)
      .single();

    if (settingsError || !settings?.webhook_url) {
      console.log("Webhook URL não configurada para este usuário");
      return new Response(
        JSON.stringify({ message: "Webhook não configurado" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Preparar payload para webhook
    const webhookPayload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      booking: {
        id: booking.id,
        date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        guest: {
          name: booking.guest_name,
          email: booking.guest_email,
          phone: booking.guest_phone,
        },
        agenda: {
          title: booking.agendas.title,
          slug: booking.agendas.slug,
        },
        service: booking.services ? {
          name: booking.services.name,
          duration: booking.services.duration_minutes,
          price: booking.services.price,
        } : null,
        public_url: `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app")}/agendar/${booking.agendas.slug}`,
      },
    };

    // Enviar para webhook n8n
    console.log(`Enviando webhook para: ${settings.webhook_url}`);
    const webhookResponse = await fetch(settings.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      console.error(`Webhook falhou: ${webhookResponse.status}`);
      throw new Error(`Webhook retornou status ${webhookResponse.status}`);
    }

    console.log("Webhook enviado com sucesso!");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Notificação enviada com sucesso" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Erro ao processar notificação:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});