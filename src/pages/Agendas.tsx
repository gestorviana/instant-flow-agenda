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
import { AppLayout } from "@/components/layout/AppLayout";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <AppLayout title="Agendas">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Minhas Agendas</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie suas agendas de atendimento
            </p>
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            size="lg"
            className="rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {agendas.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma agenda criada</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Crie sua primeira agenda para começar
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar primeira agenda
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {agendas.map((agenda) => (
              <AgendaCard key={agenda.id} agenda={agenda} onUpdate={loadAgendas} />
            ))}
          </div>
        )}
      </div>

      <CreateAgendaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadAgendas}
      />
    </AppLayout>
  );
};

export default Agendas;
