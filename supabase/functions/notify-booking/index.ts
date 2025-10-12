import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowed webhook domains for security
const ALLOWED_WEBHOOK_DOMAINS = [
  'hooks.n8n.cloud',
  'webhook.site',
  'n8n.cloud',
  'pipedream.com',
  'zapier.com',
  'make.com',
  'gestorviana.com', // Domínio personalizado do usuário
  'webhook.n8n.io'
];

// Função para verificar se é domínio permitido ou domínio customizado válido
const isValidWebhookDomain = (hostname: string): boolean => {
  // Verifica se é um dos domínios permitidos
  const isAllowedDomain = ALLOWED_WEBHOOK_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith(`.${domain}`)
  );
  
  // Permite domínios customizados que não sejam localhost/internos
  const isCustomDomain = hostname.includes('.') && !hostname.match(/^(localhost|127\.0\.0\.1)$/);
  
  return isAllowedDomain || isCustomDomain;
};

// Valida URL do webhook
const validateWebhookUrl = (webhookUrl: string): void => {
  let url: URL;
  try {
    url = new URL(webhookUrl);
  } catch {
    throw new Error('URL do webhook inválida');
  }

  // Valida protocolo
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Apenas protocolos HTTP e HTTPS são permitidos');
  }

  // Valida rede interna
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.match(/^10\./) ||
    hostname.match(/^192\.168\./) ||
    hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
    hostname.match(/^169\.254\./) ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error('Acesso a redes internas não permitido');
  }

  // Valida domínio
  if (!isValidWebhookDomain(hostname)) {
    throw new Error('Domínio do webhook não autorizado');
  }
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
    
    console.log('📞 Webhook notification triggered');
    console.log('Event type:', event_type);
    console.log('Booking ID:', booking_id);

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
      console.error("❌ Error fetching booking:", bookingError);
      throw new Error("Booking não encontrado");
    }

    console.log('✅ Booking found:', {
      id: booking.id,
      guest_name: booking.guest_name,
      agenda: booking.agendas?.title
    });

    // Buscar configurações do usuário (webhook URL)
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("webhook_url")
      .eq("user_id", booking.agendas.user_id)
      .single();

    if (settingsError || !settings?.webhook_url) {
      console.log("⚠️ No webhook URL configured for this user");
      return new Response(
        JSON.stringify({ message: "Webhook não configurado" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log('🔗 Webhook URL found:', settings.webhook_url);

    // Valida URL do webhook antes de enviar
    try {
      validateWebhookUrl(settings.webhook_url);
    } catch (validationError: any) {
      console.error('⚠️ Webhook URL validation failed:', validationError.message);
      return new Response(
        JSON.stringify({ 
          message: "Webhook não configurado corretamente",
          error: validationError.message 
        }),
        { 
          status: 400, 
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
    console.log('📬 Sending webhook to:', settings.webhook_url);
    const webhookResponse = await fetch(settings.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log('📨 Webhook response status:', webhookResponse.status);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('❌ Webhook failed:', {
        status: webhookResponse.status,
        error: errorText
      });
      throw new Error(`Webhook retornou status ${webhookResponse.status}`);
    }

    console.log("✅ Webhook sent successfully!");

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