import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Grid3x3 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AppLayout } from "@/components/layout/AppLayout";
import { format, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  status: string;
  booking_date: string;
  services: {
    name: string;
    price: number;
    duration_minutes: number;
  };
  agendas: {
    title: string;
  };
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    todayValue: 0,
    todayCount: 0,
    newClients: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const today = startOfDay(new Date());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
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
        setTodayBookings([]);
        setLoading(false);
        return;
      }

      const agendaIds = userAgendas.map((a: any) => a.id);

      const { data, error } = await (supabase as any)
        .from("bookings")
        .select(`
          *,
          services (name, price, duration_minutes),
          agendas (title)
        `)
        .in("agenda_id", agendaIds)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      
      const allBookings = data || [];
      setBookings(allBookings);
      
      const todayBookingsList = allBookings.filter((b: Booking) => 
        isSameDay(new Date(b.booking_date), today)
      );
      setTodayBookings(todayBookingsList);

      // Calcular estatísticas do dia
      const todayValue = todayBookingsList
        .filter((b: Booking) => b.status === 'confirmed')
        .reduce((sum: number, b: Booking) => sum + (b.services?.price || 0), 0);
      
      setStats({
        todayValue,
        todayCount: todayBookingsList.length,
        newClients: 0, // TODO: implementar lógica de novos clientes
      });
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

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getInitials = (name: string) => {
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'pending':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDuration = (start: string, end: string) => {
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    return endMinutes - startMinutes;
  };

  if (loading) {
    return (
      <AppLayout showBottomNav={true}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={true}>
      <div className="max-w-2xl mx-auto space-y-6 pb-6">
        {/* Header com notificação */}
        <div className="flex items-start justify-between">
          <div className="relative">
            <Bell className="h-6 w-6 text-foreground" />
            {stats.todayCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                {stats.todayCount}
              </Badge>
            )}
          </div>
          <div className="text-right">
            <p className="font-semibold text-lg">Hoje</p>
            <p className="text-sm text-muted-foreground">09:00 - 20:00</p>
          </div>
        </div>

        {/* Data */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold capitalize">
            {format(today, "EEE., dd MMM.", { locale: ptBR })}
          </h1>
          <span className="text-sm text-muted-foreground">
            {format(today, "HH:mm")} - {format(new Date(today.getTime() + 11 * 60 * 60 * 1000), "HH:mm")}
          </span>
        </div>

        {/* Cards de estatísticas */}
        <Card className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Valor</p>
              <p className="text-xl font-bold">{formatPrice(stats.todayValue)}</p>
            </div>
            <div className="border-l pl-4">
              <p className="text-xs text-muted-foreground uppercase mb-1">Agendamentos</p>
              <p className="text-xl font-bold">{stats.todayCount}</p>
            </div>
            <div className="border-l pl-4">
              <p className="text-xs text-muted-foreground uppercase mb-1">Novos Clientes</p>
              <p className="text-xl font-bold">{stats.newClients}</p>
            </div>
          </div>
        </Card>

        {/* Lista de agendamentos */}
        <div className="space-y-3">
          {todayBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
            </Card>
          ) : (
            todayBookings.map((booking) => (
              <Card key={booking.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  {/* Barra de status colorida */}
                  <div className={`w-1 h-16 rounded-full ${getStatusColor(booking.status)}`} />
                  
                  {/* Horário e duração */}
                  <div className="flex flex-col min-w-[70px]">
                    <span className="text-lg font-bold">{booking.start_time.substring(0, 5)}</span>
                    <span className="text-xs text-muted-foreground">
                      {getDuration(booking.start_time, booking.end_time)}min
                    </span>
                  </div>

                  {/* Informações do agendamento */}
                  <div className="flex-1">
                    <p className="font-semibold text-base">{booking.guest_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.services?.name} • {booking.agendas?.title}
                    </p>
                  </div>

                  {/* Avatar com iniciais */}
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                    {getInitials(booking.guest_name)}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Botão flutuante de adicionar */}
        <Button
          size="lg"
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg"
          onClick={() => navigate("/agendas")}
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Botão de visualização de grade */}
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-20 left-6 h-12 w-12 rounded-lg"
          onClick={() => navigate("/bookings")}
        >
          <Grid3x3 className="h-5 w-5" />
        </Button>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
