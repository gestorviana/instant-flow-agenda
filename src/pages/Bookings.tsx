import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Clock, Mail, Phone, User as UserIcon, CheckCircle, XCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Booking } from "@/types/database";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const Bookings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    try {
      const { data: userAgendas } = await (supabase as any)
        .from("agendas")
        .select("id")
        .eq("user_id", user!.id);

      if (!userAgendas || userAgendas.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const agendaIds = userAgendas.map((a: any) => a.id);

      const { data, error } = await (supabase as any)
        .from("bookings")
        .select(`
          *,
          agendas (
            title
          )
        `)
        .in("agenda_id", agendaIds)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar agendamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await (supabase as any)
        .from("bookings")
        .update({ status })
        .eq("id", bookingId);

      if (error) throw error;

      // Notificar via webhook
      try {
        await supabase.functions.invoke("notify-booking", {
          body: {
            booking_id: bookingId,
            event_type: status === "confirmed" ? "confirmed" : "cancelled",
          },
        });
      } catch (webhookError) {
        console.error("Erro ao enviar webhook:", webhookError);
      }

      toast({
        title: "Status atualizado",
        description: `Agendamento ${status === "confirmed" ? "confirmado" : "cancelado"}.`,
      });

      loadBookings();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const today = startOfDay(new Date());
  const todayBookings = bookings.filter((b: any) => 
    isSameDay(new Date(b.booking_date), today)
  );

  const weekStart = startOfWeek(today, { locale: ptBR });
  const weekEnd = endOfWeek(today, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const weekBookings = bookings.filter((b: any) => {
    const bookingDate = new Date(b.booking_date);
    return bookingDate >= weekStart && bookingDate <= weekEnd;
  });

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((b: any) => isSameDay(new Date(b.booking_date), day));
  };

  const BookingCard = ({ booking }: { booking: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-bold text-lg">
                {booking.start_time.substring(0, 5)}
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="text-muted-foreground">
                {booking.end_time.substring(0, 5)}
              </span>
            </div>
            <p className="font-semibold">{booking.guest_name}</p>
            <p className="text-sm text-muted-foreground">{booking.agendas?.title}</p>
          </div>
          <Badge
            variant={
              booking.status === "confirmed"
                ? "default"
                : booking.status === "cancelled"
                ? "destructive"
                : "secondary"
            }
            className="ml-2"
          >
            {booking.status === "confirmed"
              ? "Confirmado"
              : booking.status === "cancelled"
              ? "Cancelado"
              : "Pendente"}
          </Badge>
        </div>

        <div className="space-y-1 mb-3 text-sm">
          <p className="flex items-center gap-2">
            <Mail className="h-3 w-3 text-muted-foreground" />
            {booking.guest_email}
          </p>
          {booking.guest_phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-muted-foreground" />
              {booking.guest_phone}
            </p>
          )}
        </div>

        {booking.status === "pending" && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => updateStatus(booking.id, "confirmed")}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => updateStatus(booking.id, "cancelled")}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Agendamentos</h2>
            <p className="text-muted-foreground">
              Visualize e gerencie seus agendamentos do dia e da semana
            </p>
          </div>

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum agendamento ainda</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="today" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="today" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Hoje ({todayBookings.length})
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Semana ({weekBookings.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="today" className="space-y-4">
                <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {todayBookings.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhum agendamento para hoje
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {todayBookings.map((booking: any) => (
                          <BookingCard key={booking.id} booking={booking} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="week" className="space-y-4">
                <div className="grid gap-4">
                  {weekDays.map((day) => {
                    const dayBookings = getBookingsForDay(day);
                    const isToday = isSameDay(day, today);
                    
                    return (
                      <Card 
                        key={day.toString()} 
                        className={isToday ? "bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20" : ""}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-5 w-5" />
                              <span className="capitalize">
                                {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                              </span>
                              {isToday && (
                                <Badge variant="secondary" className="ml-2">Hoje</Badge>
                              )}
                            </div>
                            <Badge variant="outline">{dayBookings.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {dayBookings.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4 text-sm">
                              Nenhum agendamento
                            </p>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                              {dayBookings.map((booking: any) => (
                                <BookingCard key={booking.id} booking={booking} />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default Bookings;
