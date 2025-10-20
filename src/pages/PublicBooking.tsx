import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, User, Clock as ClockIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

// ====== TIPOS ======
interface Agenda {
  id: string;
  title: string;
  user_id: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
}

interface Profile {
  full_name: string | null;
}

interface Slot {
  slot_start: string;
  slot_end: string;
}

// ====== UTILS ======
function formatCurrencyBRL(value: number | null | undefined) {
  if (value == null) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

// ====== COMPONENTE PRINCIPAL ======
export default function PublicBooking() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [professionalName, setProfessionalName] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1) Carregar agenda, serviço e perfil do profissional
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // Buscar agenda
        const { data: ag, error: agErr } = await supabase
          .from("agendas")
          .select("id, title, user_id")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();
        if (agErr) throw agErr;
        if (!ag) throw new Error("Agenda não encontrada.");
        if (!mounted) return;
        setAgenda(ag as Agenda);

        // Buscar primeiro serviço ativo
        const { data: servs, error: sErr } = await supabase
          .from("services")
          .select("id, name, duration_minutes, price")
          .eq("user_id", ag.user_id)
          .eq("active", true)
          .order("name", { ascending: true })
          .limit(1);
        if (sErr) throw sErr;
        if (!mounted) return;
        if (servs && servs.length > 0) {
          setService(servs[0] as Service);
        }

        // Buscar nome do profissional
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", ag.user_id)
          .single();
        if (!pErr && profile) {
          setProfessionalName(profile.full_name || "Profissional");
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Erro ao carregar agenda.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (slug) load();
    return () => { mounted = false; };
  }, [slug]);

  // 2) Buscar slots quando data ou serviço mudarem
  useEffect(() => {
    async function fetchSlots() {
      if (!agenda?.id || !service?.id || !selectedDate) return;
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const { data, error } = await supabase.rpc("list_available_slots", {
          p_agenda_id: agenda.id,
          p_service_id: service.id,
          p_date: dateStr,
        });
        if (error) throw error;
        setSlots((data || []) as Slot[]);
        setSelectedSlot(null);
      } catch (e: any) {
        console.error(e);
        toast.error("Erro ao carregar horários.");
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [agenda?.id, service?.id, selectedDate]);

  async function handleConfirm() {
    if (!agenda?.id || !service?.id || !selectedSlot || !clientName || !clientPhone) return;

    setSubmitting(true);
    try {
      const slotDate = new Date(selectedSlot.slot_start);
      const bookingDate = slotDate.toISOString().split('T')[0];
      const startTimeStr = slotDate.toTimeString().split(' ')[0];

      const { error } = await supabase.from("bookings").insert([{
        agenda_id: agenda.id,
        service_id: service.id,
        guest_name: clientName,
        guest_phone: clientPhone,
        starts_at: selectedSlot.slot_start,
        booking_date: bookingDate,
        start_time: startTimeStr,
        end_time: '00:00:00',
        status: "pending",
      }]);
      if (error) throw error;

      toast.success("Agendamento confirmado!");
      // Limpar formulário e recarregar slots
      setClientName("");
      setClientPhone("");
      setSelectedSlot(null);
      // Recarregar slots
      const dateStr = format(selectedDate!, "yyyy-MM-dd");
      const { data } = await supabase.rpc("list_available_slots", {
        p_agenda_id: agenda.id,
        p_service_id: service.id,
        p_date: dateStr,
      });
      setSlots((data || []) as Slot[]);
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes("já foi reservado") || e?.message?.includes("overlap")) {
        toast.error("Esse horário acabou de ser reservado. Escolha outro.");
      } else {
        toast.error("Erro ao criar agendamento.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ====== RENDER ======
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!agenda || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Agenda ou serviço não encontrado.</p>
          <button 
            onClick={() => navigate("/")} 
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const hasFormData = clientName && clientPhone && selectedSlot;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <button 
            onClick={() => navigate("/")} 
            className="p-1.5 hover:bg-muted rounded-lg transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Fazer uma reserva</h1>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-2xl">
        {/* Calendário */}
        <section className="mb-6">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-xl border bg-card shadow-sm"
            />
          </div>
        </section>

        {/* Horários disponíveis */}
        <section className="mb-6">
          <h2 className="text-sm font-medium mb-3 text-muted-foreground">
            {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
          </h2>
          {loadingSlots ? (
            <div className="text-sm text-muted-foreground">Carregando horários…</div>
          ) : slots.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem horários disponíveis nesta data.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.slot_start === slot.slot_start;
                return (
                  <button
                    key={slot.slot_start}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary shadow-md" 
                        : "bg-background border-border hover:border-primary hover:shadow"
                    }`}
                  >
                    {formatTime(slot.slot_start)}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Card do serviço */}
        {selectedSlot && (
          <section className="mb-6">
            <div className="rounded-2xl border bg-card shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(selectedSlot.slot_start)} - {formatTime(selectedSlot.slot_end)}
                  </p>
                </div>
                <span className="text-xl font-bold">{formatCurrencyBRL(service.price)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Equipe: {professionalName}</span>
              </div>
            </div>
          </section>
        )}

        {/* Formulário do cliente */}
        {selectedSlot && (
          <section className="mb-20">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Digite seu nome"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Telefone (WhatsApp)</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 90000-0000"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Rodapé fixo com botão */}
      {selectedSlot && (
        <footer className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-lg">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">{formatCurrencyBRL(service.price)}</span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={!hasFormData || submitting}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {submitting ? "Confirmando…" : "Continuar"}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
