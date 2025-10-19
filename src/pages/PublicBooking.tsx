import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Clock, CheckCircle2, Zap } from "lucide-react";
import { toast } from "sonner";

// ====== TIPOS ======
interface Agenda {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  is_active: boolean;
  user_id: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
}

interface Slot { 
  slot_start: string; 
  slot_end: string; 
}

// ====== UTILS ======
function formatCurrencyBRL(value: number | null | undefined) {
  if (value == null) return "";
  try { 
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); 
  } catch { 
    return `${value}`; 
  }
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // YYYY-MM-DD
}

// ====== COMPONENTE PRINCIPAL ======
export default function PublicBooking() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const selectedService = useMemo(() => services.find(s => s.id === selectedServiceId) ?? null, [services, selectedServiceId]);

  const [date, setDate] = useState<string>(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [startTime, setStartTime] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [success, setSuccess] = useState(false);

  // 1) Carregar agenda e serviços pelo slug
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErrorMsg("");
      try {
        const { data: ag, error: agErr } = await supabase
          .from("agendas")
          .select("id, title, description, slug, is_active, user_id")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();
        if (agErr) throw agErr;
        if (!ag) throw new Error("Agenda não encontrada ou inativa.");
        if (!mounted) return;
        setAgenda(ag as Agenda);

        const { data: servs, error: sErr } = await supabase
          .from("services")
          .select("id, name, duration_minutes, price")
          .eq("user_id", ag.user_id)
          .eq("active", true)
          .order("name", { ascending: true });
        if (sErr) throw sErr;
        if (!mounted) return;
        setServices((servs || []) as Service[]);
        // Seleciona o primeiro serviço por padrão
        if (servs && servs.length > 0) setSelectedServiceId(servs[0].id);
      } catch (e: any) {
        console.error(e);
        if (!mounted) return;
        setErrorMsg(e?.message || "Erro ao carregar agenda.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (slug) load();
    return () => { mounted = false; };
  }, [slug]);

  // 2) Buscar slots sempre que agenda/serviço/data mudarem
  useEffect(() => {
    async function fetchSlots() {
      if (!agenda?.id || !selectedServiceId || !date) return;
      setLoadingSlots(true);
      setErrorMsg("");
      try {
        const { data, error } = await supabase.rpc("list_available_slots", {
          p_agenda_id: agenda.id,
          p_service_id: selectedServiceId,
          p_date: date,
        });
        if (error) throw error;
        setSlots((data || []) as Slot[]);
        setStartTime(""); // reset seleção ao recarregar
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message || "Erro ao carregar horários.");
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [agenda?.id, selectedServiceId, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agenda?.id || !selectedService || !date || !startTime) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      // Extrair data e hora do slot para os campos legacy obrigatórios
      const slotDate = new Date(startTime);
      const bookingDate = slotDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const startTimeStr = slotDate.toTimeString().split(' ')[0]; // HH:MM:SS
      
      const { error } = await supabase.from("bookings").insert([{
        agenda_id: agenda.id,
        service_id: selectedService.id,
        guest_name: clientName,
        guest_email: clientEmail || null,
        guest_phone: clientPhone || null,
        starts_at: startTime, // timestamp with timezone do slot
        booking_date: bookingDate, // campo legacy obrigatório
        start_time: startTimeStr, // campo legacy obrigatório
        end_time: '00:00:00', // placeholder - trigger vai calcular
        status: "pending",
      }]);
      if (error) throw error;

      setSuccess(true);
      toast.success("Agendamento confirmado!");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Não foi possível criar o agendamento.");
      toast.error("Erro ao criar agendamento");
    } finally {
      setSubmitting(false);
    }
  }

  // ====== RENDER ======
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>
    );
  }
  
  if (errorMsg && !agenda) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-2xl font-semibold">Ops…</div>
        <p className="text-muted-foreground">{errorMsg}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="mx-auto h-20 w-20 text-green-500" />
          <h2 className="text-3xl font-bold mb-2">Agendamento Confirmado!</h2>
          <p className="text-muted-foreground">Entraremos em contato via WhatsApp</p>
          <div className="bg-card border rounded-2xl p-6 text-left space-y-3">
            <p className="font-bold text-xl">{selectedService?.name}</p>
            <p className="text-sm text-muted-foreground">{agenda?.title}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-5 w-5" />
              <span>{new Date(date).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-2xl font-bold text-foreground">
                {new Date(startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header simples */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Zap className="h-6 w-6 text-primary" />
            <span>Flash Agenda</span>
          </div>
          <button className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted" onClick={() => navigate("/auth")}>
            Área do Profissional
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Cabeçalho da agenda */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{agenda?.title}</h1>
            {agenda?.description && (
              <p className="text-muted-foreground">{agenda.description}</p>
            )}
          </div>

          {/* Passo 1: Serviço */}
          <section className="mb-8 p-4 md:p-6 border rounded-xl bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">1) Escolha o serviço</h2>
            </div>
            {services.length === 0 ? (
              <p className="text-muted-foreground">Nenhum serviço disponível no momento.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    className={`text-left p-4 rounded-xl border transition-shadow hover:shadow ${selectedServiceId === s.id ? "border-primary ring-2 ring-primary/20" : ""}`}
                    onClick={() => setSelectedServiceId(s.id)}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Duração: {s.duration_minutes} min {s.price != null && `• ${formatCurrencyBRL(s.price)}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Passo 2: Data e horário */}
          <section className="mb-8 p-4 md:p-6 border rounded-xl bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">2) Selecione data e horário</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:items-end">
              <div className="flex-1">
                <label className="block text-sm mb-1">Data</label>
                <input
                  type="date"
                  className="w-full rounded-lg border px-3 py-2 bg-background"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={todayStr()}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm mb-1">Serviço selecionado</label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-3 py-2 bg-muted cursor-not-allowed"
                  value={selectedService ? `${selectedService.name} • ${selectedService.duration_minutes} min` : "—"}
                  readOnly
                />
              </div>
            </div>

            <div className="mt-4">
              {loadingSlots ? (
                <div className="text-sm text-muted-foreground">Carregando horários…</div>
              ) : slots.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem horários disponíveis para esta data.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => {
                    const displayTime = new Date(s.slot_start).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Sao_Paulo'
                    });
                    return (
                      <button
                        key={`${s.slot_start}-${s.slot_end}`}
                        className={`px-3 py-2 rounded-full border text-sm hover:shadow transition ${startTime === s.slot_start ? "border-primary ring-2 ring-primary/20" : ""}`}
                        onClick={() => setStartTime(s.slot_start)}
                      >
                        {displayTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Passo 3: Dados do cliente */}
          <section className="mb-8 p-4 md:p-6 border rounded-xl bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">3) Confirme seus dados</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Nome completo</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 bg-background"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Telefone (WhatsApp)</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 bg-background"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(00) 90000-0000"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">E-mail (opcional)</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border px-3 py-2 bg-background"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="voce@email.com"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !agenda || !selectedService || !date || !startTime}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Reservando…" : "Confirmar agendamento"}
              </button>
            </form>
          </section>

          {/* Observação */}
          <p className="text-xs text-muted-foreground text-center">
            Ao confirmar, você concorda com a política da agenda. Em caso de imprevistos, cancele com antecedência.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Flash Agenda
        </div>
      </footer>
    </div>
  );
}
