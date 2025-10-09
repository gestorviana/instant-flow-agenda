import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, CheckCircle } from "lucide-react";
import type { Agenda, Availability, Service } from "@/types/database";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const PublicBooking = () => {
  const { slug } = useParams();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      loadAgenda();
    }
  }, [slug]);

  useEffect(() => {
    if (agenda) {
      loadAvailability();
      loadServices();
    }
  }, [agenda]);

  useEffect(() => {
    if (selectedDate && availability.length > 0 && agenda) {
      calculateAvailableTimes();
    } else if (!selectedDate || availability.length === 0) {
      setAvailableTimes([]);
    }
  }, [selectedDate, availability, agenda, selectedService]);

  const loadAgenda = async () => {
    try {
      if (!slug) {
        throw new Error("Slug inválido");
      }

      const { data, error } = await (supabase as any)
        .from("agendas")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Agenda não encontrada");
      }
      
      setAgenda(data);
    } catch (error: any) {
      console.error("Erro ao carregar agenda:", error);
      toast({
        title: "Agenda não encontrada",
        description: "Esta agenda não está disponível.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("availability")
        .select("*")
        .eq("agenda_id", agenda!.id);

      if (error) throw error;
      setAvailability(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar disponibilidade:", error);
    }
  };

  const loadServices = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("services")
        .select("*")
        .eq("user_id", agenda!.user_id)
        .eq("active", true);

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar serviços:", error);
    }
  };

  const calculateAvailableTimes = async () => {
    if (!selectedDate || !agenda || !selectedService) {
      setAvailableTimes([]);
      return;
    }

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter((a) => a.day_of_week === dayOfWeek);

    if (dayAvailability.length === 0) {
      setAvailableTimes([]);
      return;
    }

    try {
      // Buscar agendamentos existentes para esta data
      const { data: existingBookings, error } = await (supabase as any)
          .from("bookings")
          .select("start_time, end_time")
          .eq("agenda_id", agenda.id)
          .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
          .in("status", ["pending", "confirmed"]);

      if (error) {
        console.error("Erro ao buscar agendamentos:", error);
        setAvailableTimes([]);
        return;
      }

    const times: string[] = [];
    const slotDuration = selectedService.duration_minutes; // Duração baseada no serviço

    // Função auxiliar para verificar se um horário está bloqueado
    const isTimeBlocked = (timeStr: string) => {
      // Verificar bloqueio de almoço
      if (agenda.lunch_break_start && agenda.lunch_break_end) {
        const lunchStart = agenda.lunch_break_start.substring(0, 5); // HH:MM
        const lunchEnd = agenda.lunch_break_end.substring(0, 5);
        if (timeStr >= lunchStart && timeStr < lunchEnd) {
          return true;
        }
      }
      
      // Verificar se já está agendado
      return existingBookings?.some((booking: any) => {
        return booking.start_time <= timeStr && booking.end_time > timeStr;
      });
    };

    dayAvailability.forEach((slot) => {
      const [startHour, startMin] = slot.start_time.split(":").map(Number);
      const [endHour, endMin] = slot.end_time.split(":").map(Number);

      let currentTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      while (currentTime + slotDuration <= endTime) {
        const hour = Math.floor(currentTime / 60);
        const min = currentTime % 60;
        const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        
        if (!isTimeBlocked(timeStr)) {
          times.push(timeStr);
        }

        currentTime += slotDuration;
      }
      });

      setAvailableTimes(times);
    } catch (error) {
      console.error("Erro ao calcular horários:", error);
      setAvailableTimes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !agenda || !selectedService) return;

    setSubmitting(true);

    try {
      const serviceDuration = selectedService.duration_minutes;
      const [hour, min] = selectedTime.split(":").map(Number);
      const totalMinutes = hour * 60 + min + serviceDuration;
      const endHour = Math.floor(totalMinutes / 60);
      const endMin = totalMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;

      const { data: bookingData, error: bookingError } = await (supabase as any)
        .from("bookings")
        .insert({
          agenda_id: agenda.id,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          start_time: selectedTime,
          end_time: endTime,
          guest_name: formData.name,
          guest_email: formData.email,
          guest_phone: formData.phone,
          service_id: selectedService.id,
          status: "pending",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Notificar via webhook sobre novo agendamento
      try {
        await supabase.functions.invoke("notify-booking", {
          body: {
            booking_id: bookingData.id,
            event_type: "created",
          },
        });
      } catch (webhookError) {
        console.error("Erro ao enviar webhook:", webhookError);
        // Não bloqueia o agendamento se o webhook falhar
      }

      setSuccess(true);
      toast({
        title: "Agendamento realizado!",
        description: "Você receberá uma confirmação em breve.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao agendar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Agenda não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle className="mx-auto h-20 w-20 text-green-500" />
          <div>
            <h2 className="text-3xl font-bold mb-2">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground">
              Entraremos em contato via WhatsApp
            </p>
          </div>
          <div className="bg-card border rounded-2xl p-6 text-left space-y-3">
            <p className="font-bold text-xl">{selectedService?.name}</p>
            <p className="text-sm text-muted-foreground">{agenda.title}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-5 w-5" />
              <span>{format(selectedDate!, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-2xl font-bold text-foreground">{selectedTime}</span>
            </div>
            <div className="text-lg font-bold text-primary">
              R$ {selectedService?.price.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,transparent)]" />
        <div className="max-w-2xl mx-auto px-4 py-12 relative">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="inline-block">
              <div className="flex items-center gap-2 text-primary mb-2">
                <div className="h-px w-8 bg-primary/50" />
                <span className="text-sm font-medium tracking-wider uppercase">Agendamento Online</span>
                <div className="h-px w-8 bg-primary/50" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Reserve seu Horário
            </h1>
            {agenda.description && (
              <p className="text-lg text-muted-foreground max-w-md mx-auto">{agenda.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Step 1: Selecionar Serviço */}
        {services.length > 0 && (
          <div className="bg-card border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">💼</span> Escolha o serviço
            </h2>
            <div className="grid gap-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`text-left p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                    selectedService?.id === service.id
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-border hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        ⏱️ {service.duration_minutes} minutos
                      </p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      R$ {service.price.toFixed(2)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Selecionar Data */}
        {selectedService && (
          <div className="bg-card border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow animate-scale-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">📅</span> Escolha a data
            </h2>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => {
                const dayOfWeek = date.getDay();
                const hasAvailability = availability.some((a) => a.day_of_week === dayOfWeek);
                const oneWeekFromNow = new Date();
                oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
                return date < startOfDay(new Date()) || date > oneWeekFromNow || !hasAvailability;
              }}
              locale={ptBR}
              className="rounded-xl border mx-auto"
            />
          </div>
        )}

        {/* Step 3: Selecionar Horário */}
        {selectedDate && selectedService && (
          <div className="bg-card border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow animate-scale-in">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <span className="text-2xl">⏰</span> Escolha o horário
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </p>
            {availableTimes.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum horário disponível para esta data
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {availableTimes.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="lg"
                    onClick={() => setSelectedTime(time)}
                    className="h-14 text-lg font-semibold rounded-xl"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Formulário */}
        {selectedTime && selectedService && (
          <div className="bg-card border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow animate-scale-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">✏️</span> Seus dados
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-12 rounded-xl text-base"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-12 rounded-xl text-base"
                  placeholder="seuemail@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="h-12 rounded-xl text-base"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <Button
                type="submit" 
                className="w-full h-14 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]" 
                disabled={submitting}
              >
                {submitting ? "Agendando..." : "✅ Confirmar Agendamento"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicBooking;
