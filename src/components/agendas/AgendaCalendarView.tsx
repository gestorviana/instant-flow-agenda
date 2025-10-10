import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, CheckCircle, XCircle, Phone, Mail } from "lucide-react";
import { format, startOfDay, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { Booking } from "@/types/database";

interface AgendaCalendarViewProps {
  userId: string;
}

export const AgendaCalendarView = ({ userId }: AgendaCalendarViewProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadBookings();
      
      // Realtime subscription
      const channel = supabase
        .channel('bookings-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings'
          },
          () => {
            loadBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const loadBookings = async () => {
    try {
      const { data: userAgendas } = await (supabase as any)
        .from("agendas")
        .select("id")
        .eq("user_id", userId);

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
          ),
          services (
            name,
            price,
            duration_minutes
          )
        `)
        .in("agenda_id", agendaIds)
        .gte("booking_date", format(startOfDay(new Date()), "yyyy-MM-dd"))
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar agendamentos:", error);
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
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Carregando agendamentos...</p>
        </CardContent>
      </Card>
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
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
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
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">{booking.guest_name}</p>
            </div>
            {booking.services && (
              <p className="text-sm text-primary font-medium mb-1">
                {booking.services.name} - R$ {Number(booking.services.price).toFixed(2)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{booking.agendas?.title}</p>
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

        <div className="space-y-1 mb-3 text-sm bg-muted/50 p-2 rounded-md">
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
    <div className="space-y-6">
      {bookings.length === 0 ? (
        <Card className="bg-gradient-to-br from-muted/50 to-muted/20">
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-semibold mb-2">Nenhum agendamento futuro</p>
            <p className="text-sm text-muted-foreground">
              Os novos agendamentos aparecerão aqui automaticamente
            </p>
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
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Calendar className="h-6 w-6" />
                  {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">
                      Nenhum agendamento para hoje
                    </p>
                  </div>
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
                    className={`transition-all duration-300 ${
                      isToday 
                        ? "bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 shadow-lg" 
                        : "hover:shadow-md"
                    }`}
                  >
                    <CardHeader className="pb-3">
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
                        <Badge variant="outline" className="text-base">
                          {dayBookings.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dayBookings.length === 0 ? (
                        <p className="text-muted-foreground text-center py-6 text-sm">
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
  );
};
