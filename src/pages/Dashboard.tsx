import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Flash Agenda ⚡</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Bem-vindo ao Flash Agenda!</h2>
          <p className="text-muted-foreground mb-8">
            Gerencie suas agendas de forma rápida e eficiente.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Minhas Agendas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie e gerencie suas agendas personalizadas
              </p>
              <Button onClick={() => navigate("/agendas")}>Ver agendas</Button>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Agendamentos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Visualize todos os seus agendamentos
              </p>
              <Button variant="outline" onClick={() => navigate("/bookings")}>Ver agendamentos</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
