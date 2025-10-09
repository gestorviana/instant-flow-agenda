import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AppLayout } from "@/components/layout/AppLayout";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAgendas: 0,
    activeAgendas: 0,
    totalBookings: 0,
    pendingBookings: 0,
    todayEarnings: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

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
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const { data: agendas } = await (supabase as any)
        .from("agendas")
        .select("id, is_active")
        .eq("user_id", user!.id);

      const agendaIds = agendas?.map((a: any) => a.id) || [];
      
      const { data: bookings } = await (supabase as any)
        .from("bookings")
        .select(`
          id, 
          status,
          booking_date,
          services (price)
        `)
        .in("agenda_id", agendaIds);

      // Calcular ganhos do dia
      const today = new Date().toISOString().split('T')[0];
      const todayBookings = bookings?.filter((b: any) => 
        b.booking_date === today && b.status === 'confirmed'
      ) || [];
      const todayEarnings = todayBookings.reduce((sum: number, b: any) => 
        sum + (b.services?.price || 0), 0
      );

      setStats({
        totalAgendas: agendas?.length || 0,
        activeAgendas: agendas?.filter((a: any) => a.is_active).length || 0,
        totalBookings: bookings?.length || 0,
        pendingBookings: bookings?.filter((b: any) => b.status === "pending").length || 0,
        todayEarnings,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <AppLayout>
        <p>Carregando...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Flash Agenda ⚡">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Ganhos Estimados Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {formatPrice(stats.todayEarnings)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Com base nos atendimentos finalizados
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Agendas
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAgendas}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeAgendas} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Agendamentos
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                Total recebidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pendentes
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingBookings}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando confirmação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Confirmados
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalBookings - stats.pendingBookings}
              </div>
              <p className="text-xs text-muted-foreground">
                Já confirmados
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
