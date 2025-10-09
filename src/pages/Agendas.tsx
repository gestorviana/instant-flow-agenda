import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { CreateAgendaDialog } from "@/components/agendas/CreateAgendaDialog";
import { AgendaCard } from "@/components/agendas/AgendaCard";
import type { Agenda } from "@/types/database";

const Agendas = () => {
  const [user, setUser] = useState<User | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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
      loadAgendas();
    }
  }, [user]);

  const loadAgendas = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("agendas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgendas(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar agendas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold cursor-pointer" onClick={() => navigate("/")}>
            Flash Agenda ⚡
          </h1>
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
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Minhas Agendas</h2>
              <p className="text-muted-foreground">
                Gerencie suas agendas de atendimento
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Agenda
            </Button>
          </div>

          {agendas.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma agenda criada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira agenda para começar a receber agendamentos
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira agenda
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {agendas.map((agenda) => (
                <AgendaCard key={agenda.id} agenda={agenda} onUpdate={loadAgendas} />
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateAgendaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadAgendas}
      />
    </div>
  );
};

export default Agendas;
