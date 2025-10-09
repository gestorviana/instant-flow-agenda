import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, CheckCircle } from "lucide-react";
import type { Agenda, Availability } from "@/types/database";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const PublicBooking = () => {
  const { slug } = useParams();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
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
    }
  }, [agenda]);

  useEffect(() => {
    if (selectedDate && availability.length > 0) {
      calculateAvailableTimes();
    }
  }, [selectedDate, availability]);

  const loadAgenda = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("agendas")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setAgenda(data);
    } catch (error: any) {
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

  const calculateAvailableTimes = async () => {
    if (!selectedDate || !agenda) return;

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter((a) => a.day_of_week === dayOfWeek);

    if (dayAvailability.length === 0) {
      setAvailableTimes([]);
      return;
    }

    // Buscar agendamentos existentes para esta data
    const { data: existingBookings } = await (supabase as any)
        .from("bookings")
        .select("start_time, end_time")
        .eq("agenda_id", agenda.id)
        .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
        .in("status", ["pending", "confirmed"]);

    const times: string[] = [];
    const slotDuration = 60; // 60 minutos por slot

    dayAvailability.forEach((slot) => {
      const [startHour, startMin] = slot.start_time.split(":").map(Number);
      const [endHour, endMin] = slot.end_time.split(":").map(Number);

      let currentTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      while (currentTime + slotDuration <= endTime) {
        const hour = Math.floor(currentTime / 60);
        const min = currentTime % 60;
        const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        
        // Verificar se este horário já está agendado
        const isBooked = existingBookings?.some((booking: any) => {
          return booking.start_time <= timeStr && booking.end_time > timeStr;
        });

        if (!isBooked) {
          times.push(timeStr);
        }

        currentTime += slotDuration;
      }
    });

    setAvailableTimes(times);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !agenda) return;

    setSubmitting(true);

    try {
      const [hour, min] = selectedTime.split(":").map(Number);
      const endHour = hour + 1;
      const endTime = `${endHour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;

      const { error } = await (supabase as any).from("bookings").insert({
        agenda_id: agenda.id,
        booking_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: selectedTime,
        end_time: endTime,
        guest_name: formData.name,
        guest_email: formData.email,
        guest_phone: formData.phone || null,
        notes: formData.notes || null,
        status: "pending",
      });

      if (error) throw error;

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
              Enviamos uma confirmação para {formData.email}
            </p>
          </div>
          <div className="bg-card border rounded-2xl p-6 text-left space-y-3">
            <p className="font-bold text-xl">{agenda.title}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-5 w-5" />
              <span>{format(selectedDate!, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="text-2xl font-bold text-foreground">{selectedTime}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-1">{agenda.title}</h1>
          {agenda.description && (
            <p className="text-sm text-muted-foreground">{agenda.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Step 1: Selecionar Data */}
        <div className="bg-card border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">📅 Escolha a data</h2>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => {
              const dayOfWeek = date.getDay();
              const hasAvailability = availability.some((a) => a.day_of_week === dayOfWeek);
              return date < startOfDay(new Date()) || !hasAvailability;
            }}
            locale={ptBR}
            className="rounded-xl border mx-auto"
          />
        </div>

        {/* Step 2: Selecionar Horário */}
        {selectedDate && (
          <div className="bg-card border rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-2">⏰ Escolha o horário</h2>
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

        {/* Step 3: Formulário */}
        {selectedTime && (
          <div className="bg-card border rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">✏️ Seus dados</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
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
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12 rounded-xl text-base"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="rounded-xl resize-none"
                  placeholder="Alguma informação adicional?"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-bold rounded-xl" 
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
