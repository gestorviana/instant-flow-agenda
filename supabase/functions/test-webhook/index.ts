import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
  'make.com'
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhook_url } = await req.json();

    if (!webhook_url) {
      throw new Error("URL do webhook não fornecida");
    }

    // Validate webhook URL to prevent SSRF attacks
    let url: URL;
    try {
      url = new URL(webhook_url);
    } catch {
      throw new Error('URL inválida');
    }

    // Check if domain is allowed
    const isAllowedDomain = ALLOWED_WEBHOOK_DOMAINS.some(domain => 
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowedDomain) {
      throw new Error('Domínio do webhook não autorizado. Apenas URLs de serviços conhecidos são permitidas.');
    }

    // Prevent internal network access
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

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Apenas protocolos HTTP e HTTPS são permitidos');
    }

    console.log('🧪 Testing webhook:', webhook_url);

    const testPayload = {
      event_type: "test",
      timestamp: new Date().toISOString(),
      booking: {
        id: "test-booking-123",
        date: new Date().toISOString().split('T')[0],
        start_time: "10:00",
        end_time: "11:00",
        status: "pending",
        guest: {
          name: "Cliente Teste",
          phone: "(11) 99999-9999",
        },
        agenda: {
          title: "Agenda de Teste",
        },
        service: {
          name: "Serviço de Teste",
          duration: 60,
          price: 50.00,
        },
      },
    };

    const response = await fetch(webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    console.log('📬 Webhook response:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Webhook error:', errorText);
      throw new Error(`Webhook retornou status ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('✅ Webhook success:', responseText);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook testado com sucesso!",
        status: response.status,
        response: responseText
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("💥 Test failed:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
