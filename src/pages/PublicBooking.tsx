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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Agenda, Availability, Service } from "@/types/database";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

// Validation schema for booking form
const bookingSchema = z.object({
  name: z.string()
    .min(1, "Nome é obrigatório")
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  email: z.string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email muito longo"),
  phone: z.string()
    .min(8, "Telefone muito curto")
    .max(20, "Telefone muito longo")
});

const PublicBooking = () => {
  const { slug } = useParams();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
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
      loadProfile();
    }
  }, [agenda]);

  useEffect(() => {
    if (selectedDate && availability.length > 0 && agenda) {
      calculateAvailableTimes();
    } else if (!selectedDate || availability.length === 0) {
      setAvailableTimes([]);
    }
  }, [selectedDate, availability, agenda, selectedServices]);

  const loadAgenda = async () => {
    try {
      console.log("=== CARREGANDO AGENDA ===");
      console.log("Slug recebido:", slug);
      
      if (!slug) {
        throw new Error("Slug inválido");
      }

      console.log("Buscando agenda com slug:", slug);
      
      const { data, error } = await supabase
        .from("agendas")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      console.log("Resultado da busca:", { data, error });

      if (error) {
        console.error("Erro na query:", error);
        throw error;
      }
      
      if (!data) {
        console.error("Nenhuma agenda encontrada com slug:", slug);
        throw new Error("Agenda não encontrada");
      }
      
      console.log("Agenda carregada com sucesso:", data);
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

  const loadProfile = async () => {
    try {
      console.log("=== CARREGANDO PERFIL ===");
      console.log("User ID da agenda:", agenda!.user_id);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", agenda!.user_id)
        .maybeSingle();

      console.log("Perfil carregado:", { data, error });

      if (error) {
        console.error("Erro ao carregar perfil:", error);
        throw error;
      }
      
      if (data) {
        console.log("Foto do perfil:", data.photo_url);
        setProfile(data);
      }
    } catch (error: any) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  const calculateAvailableTimes = async () => {
    if (!selectedDate || !agenda || selectedServices.length === 0) {
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
    const slotDuration = selectedServices.reduce((total, service) => total + service.duration_minutes, 0); // Duração total dos serviços

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
    
    console.log("=== INICIANDO AGENDAMENTO ===");
    console.log("Data selecionada:", selectedDate);
    console.log("Horário selecionado:", selectedTime);
    console.log("Serviços selecionados:", selectedServices);
    console.log("Dados do formulário:", formData);
    
    if (!selectedDate || !selectedTime || !agenda || selectedServices.length === 0) {
      console.error("Validação falhou:", {
        selectedDate: !!selectedDate,
        selectedTime: !!selectedTime,
        agenda: !!agenda,
        servicesLength: selectedServices.length
      });
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    // Validate form data with Zod schema
    console.log("📋 Dados do formulário ANTES da validação:", formData);
    
    const validation = bookingSchema.safeParse({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim()
    });

    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "Dados inválidos";
      console.error("❌ Validação Zod falhou:", validation.error.errors);
      toast({
        title: "Dados inválidos",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    
    console.log("✅ Validação passou! Dados validados:", validation.data);

    setSubmitting(true);

    try {
      const totalDuration = selectedServices.reduce((total, service) => total + service.duration_minutes, 0);
      const [hour, min] = selectedTime.split(":").map(Number);
      const totalMinutes = hour * 60 + min + totalDuration;
      const endHour = Math.floor(totalMinutes / 60);
      const endMin = totalMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;

      console.log("Calculando horários:", {
        totalDuration,
        startTime: selectedTime,
        endTime
      });

      // Criar um booking para cada serviço selecionado
      const bookingPromises = selectedServices.map(async (service, index) => {
        const serviceStartMinutes = hour * 60 + min + (index > 0 ? selectedServices.slice(0, index).reduce((sum, s) => sum + s.duration_minutes, 0) : 0);
        const serviceEndMinutes = serviceStartMinutes + service.duration_minutes;
        const serviceStartHour = Math.floor(serviceStartMinutes / 60);
        const serviceStartMin = serviceStartMinutes % 60;
        const serviceEndHour = Math.floor(serviceEndMinutes / 60);
        const serviceEndMin = serviceEndMinutes % 60;
        
        const bookingData = {
          agenda_id: agenda.id,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          start_time: `${serviceStartHour.toString().padStart(2, "0")}:${serviceStartMin.toString().padStart(2, "0")}`,
          end_time: `${serviceEndHour.toString().padStart(2, "0")}:${serviceEndMin.toString().padStart(2, "0")}`,
          guest_name: validation.data.name,
          guest_email: validation.data.email,
          guest_phone: validation.data.phone,
          service_id: service.id,
          status: "pending",
        };
        
        console.log(`📝 Criando booking ${index + 1}:`, bookingData);
        console.log(`📧 Email sendo enviado: "${bookingData.guest_email}"`);
        console.log(`🔑 Supabase URL:`, import.meta.env.VITE_SUPABASE_URL);
        console.log(`🔑 Using anon key:`, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...');
        
        const result = await supabase
          .from("bookings")
          .insert(bookingData)
          .select()
          .single();
        
        console.log(`📊 Result for booking ${index + 1}:`, {
          success: !result.error,
          error: result.error,
          data: result.data
        });
        
        return result;
      });

      const bookingResults = await Promise.all(bookingPromises);
      console.log("Resultados dos bookings:", bookingResults);
      
      const firstBookingError = bookingResults.find(result => result.error);
      if (firstBookingError?.error) {
        console.error("❌ ERRO COMPLETO ao criar booking:", JSON.stringify(firstBookingError.error, null, 2));
        console.error("Código do erro:", firstBookingError.error.code);
        console.error("Mensagem do erro:", firstBookingError.error.message);
        console.error("Detalhes do erro:", firstBookingError.error.details);
        
        toast({
          title: "Erro ao criar agendamento",
          description: firstBookingError.error.message || "Erro desconhecido. Tente novamente.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const bookingData = bookingResults[0].data;
      console.log("Primeiro booking criado:", bookingData);

      // Notificar via webhook sobre novo agendamento
      try {
        console.log("Enviando notificação webhook...");
        await supabase.functions.invoke("notify-booking", {
          body: {
            booking_id: bookingData.id,
            event_type: "created",
          },
        });
        console.log("Webhook enviado com sucesso");
      } catch (webhookError) {
        console.error("Erro ao enviar webhook:", webhookError);
        // Não bloqueia o agendamento se o webhook falhar
      }

      setSuccess(true);
      console.log("=== AGENDAMENTO CONCLUÍDO COM SUCESSO ===");
      toast({
        title: "Agendamento realizado!",
        description: "Você receberá uma confirmação em breve.",
      });
    } catch (error: any) {
      console.error("=== ERRO NO AGENDAMENTO ===", error);
      toast({
        title: "Erro ao agendar",
        description: error.message || "Ocorreu um erro ao processar seu agendamento.",
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
            <div className="space-y-2">
              {selectedServices.map((service) => (
                <p key={service.id} className="font-bold text-xl">{service.name}</p>
              ))}
            </div>
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
              R$ {selectedServices.reduce((total, service) => total + Number(service.price), 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Professional Photo */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,transparent)]" />
        <div className="max-w-2xl mx-auto px-4 py-12 relative">
          <div className="text-center space-y-4 animate-fade-in">
            {/* Avatar sempre visível */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <Avatar className="h-24 w-24 border-4 border-background shadow-2xl relative">
                  {profile?.photo_url ? (
                    <AvatarImage src={profile.photo_url} alt={profile.full_name || agenda.title} />
                  ) : null}
                  <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                    {(profile?.full_name || agenda.title).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="inline-block">
              <div className="flex items-center gap-2 text-primary mb-2">
                <div className="h-px w-8 bg-primary/50" />
                <span className="text-sm font-medium tracking-wider uppercase">Agendamento Online</span>
                <div className="h-px w-8 bg-primary/50" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {profile?.full_name || agenda.title}
            </h1>
            {agenda.description && (
              <p className="text-lg text-muted-foreground max-w-md mx-auto">{agenda.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Step 1: Selecionar Serviços */}
        {services.length > 0 && (
          <div className="bg-card border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <span className="text-2xl">💼</span> Escolha até 2 serviços
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedServices.length}/2 serviços selecionados
            </p>
            <div className="grid gap-3">
              {services.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                const canSelect = selectedServices.length < 2 || isSelected;
                
                return (
                  <button
                    type="button"
                    key={service.id}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Clicou no serviço:', service.name, 'Selecionado:', isSelected);
                      
                      if (isSelected) {
                        const newServices = selectedServices.filter(s => s.id !== service.id);
                        console.log('Removendo serviço. Novos selecionados:', newServices);
                        setSelectedServices(newServices);
                        setSelectedDate(undefined);
                        setSelectedTime("");
                      } else if (selectedServices.length < 2) {
                        const newServices = [...selectedServices, service];
                        console.log('Adicionando serviço. Novos selecionados:', newServices);
                        setSelectedServices(newServices);
                        setSelectedDate(undefined);
                        setSelectedTime("");
                      }
                    }}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-lg"
                        : canSelect
                        ? "border-border hover:border-primary/50 hover:shadow-md cursor-pointer"
                        : "border-border opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                          isSelected ? "border-primary bg-primary" : "border-border"
                        }`}>
                          {isSelected && <span className="text-primary-foreground text-sm">✓</span>}
                        </div>
                        <div>
                          <p className="font-bold">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            ⏱️ {service.duration_minutes} minutos
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        R$ {service.price.toFixed(2)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedServices.length > 0 && (
              <div className="mt-4 pt-4 border-t bg-accent/50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">⏱️ Duração total:</span>
                  <span className="font-bold text-lg">
                    {selectedServices.reduce((total, s) => total + s.duration_minutes, 0)} min
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold">💰 Total:</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {selectedServices.reduce((total, s) => total + Number(s.price), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Selecionar Data */}
        {selectedServices.length > 0 && (
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
        {selectedDate && selectedServices.length > 0 && (
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
        {selectedTime && selectedServices.length > 0 && (
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
