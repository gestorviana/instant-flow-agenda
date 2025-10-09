import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhook_url } = await req.json();

    if (!webhook_url) {
      throw new Error("URL do webhook não fornecida");
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
