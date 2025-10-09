import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, TrendingDown, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ExpenseDialog } from "@/components/financial/ExpenseDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Financial = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    todayExpenses: 0,
    todayBalance: 0,
    monthEarnings: 0,
    monthExpenses: 0,
    monthBalance: 0,
  });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [completedBookings, setCompletedBookings] = useState<any[]>([]);
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
      loadFinancialData();
    }
  }, [user]);

  const loadFinancialData = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const firstDayOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

      // Buscar agendas do usuário
      const { data: userAgendas } = await (supabase as any)
        .from("agendas")
        .select("id")
        .eq("user_id", user!.id);

      const agendaIds = userAgendas?.map((a: any) => a.id) || [];

      // Buscar agendamentos finalizados
      const { data: bookings } = await (supabase as any)
        .from("bookings")
        .select(`
          *,
          services (
            name,
            price
          )
        `)
        .in("agenda_id", agendaIds)
        .eq("status", "confirmed");

      setCompletedBookings(bookings || []);

      // Calcular ganhos do dia
      const todayBookings = bookings?.filter((b: any) => b.booking_date === today) || [];
      const todayEarnings = todayBookings.reduce((sum: number, b: any) => sum + (b.services?.price || 0), 0);

      // Calcular ganhos do mês
      const monthBookings = bookings?.filter((b: any) => b.booking_date >= firstDayOfMonth) || [];
      const monthEarnings = monthBookings.reduce((sum: number, b: any) => sum + (b.services?.price || 0), 0);

      // Buscar despesas
      const { data: expensesData } = await (supabase as any)
        .from("expenses")
        .select("*")
        .eq("user_id", user!.id)
        .order("date", { ascending: false });

      setExpenses(expensesData || []);

      // Calcular despesas do dia
      const todayExpensesData = expensesData?.filter((e: any) => e.date === today) || [];
      const todayExpenses = todayExpensesData.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);

      // Calcular despesas do mês
      const monthExpensesData = expensesData?.filter((e: any) => e.date >= firstDayOfMonth) || [];
      const monthExpenses = monthExpensesData.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);

      setStats({
        todayEarnings,
        todayExpenses,
        todayBalance: todayEarnings - todayExpenses,
        monthEarnings,
        monthExpenses,
        monthBalance: monthEarnings - monthExpenses,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
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

  if (loading) {
    return (
      <AppLayout>
        <p>Carregando...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Financeiro">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ganhos Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(stats.todayEarnings)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatPrice(stats.todayExpenses)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.todayBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPrice(stats.todayBalance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Acumulado Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.monthBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPrice(stats.monthBalance)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Button
          onClick={() => setExpenseDialogOpen(true)}
          className="w-full"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nova Despesa
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Despesas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma despesa registrada
              </p>
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 10).map((expense) => (
                  <div
                    key={expense.id}
                    className="flex justify-between items-center p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.category} • {format(new Date(expense.date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <p className="font-semibold text-red-600">
                      -{formatPrice(expense.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ganhos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {completedBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum atendimento finalizado
              </p>
            ) : (
              <div className="space-y-2">
                {completedBookings.slice(0, 10).map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex justify-between items-center p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{booking.services?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.guest_name} • {format(new Date(booking.booking_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <p className="font-semibold text-green-600">
                      +{formatPrice(booking.services?.price || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSuccess={loadFinancialData}
      />
    </AppLayout>
  );
};

export default Financial;
