import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, CheckCircle } from "lucide-react";
import type { Agenda, Availability } from "@/types/database";
import { format, addDays, startOfDay } from "date-fns";
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
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground mb-4">
              Enviamos uma confirmação para {formData.email}
            </p>
            <div className="bg-muted p-4 rounded-lg text-left">
              <p className="font-semibold">{agenda.title}</p>
              <p className="text-sm text-muted-foreground mt-2">
                <CalendarIcon className="inline h-4 w-4 mr-1" />
                {format(selectedDate!, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground">
                <Clock className="inline h-4 w-4 mr-1" />
                {selectedTime}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">{agenda.title}</CardTitle>
            {agenda.description && (
              <CardDescription className="text-base">{agenda.description}</CardDescription>
            )}
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecione a Data</CardTitle>
            </CardHeader>
            <CardContent>
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
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle>Horários Disponíveis</CardTitle>
                  <CardDescription>
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availableTimes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nenhum horário disponível para esta data
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableTimes.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedTime && (
              <Card>
                <CardHeader>
                  <CardTitle>Seus Dados</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? "Agendando..." : "Confirmar Agendamento"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicBooking;
