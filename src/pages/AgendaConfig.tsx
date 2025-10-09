import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Agenda, Availability } from "@/types/database";
import { AvailabilityForm } from "@/components/availability/AvailabilityForm";
import { AvailabilityList } from "@/components/availability/AvailabilityList";
import { LunchBreakConfig } from "@/components/availability/LunchBreakConfig";

const AgendaConfig = () => {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
    if (user && id) {
      loadAgenda();
      loadAvailability();
    }
  }, [user, id]);

  const loadAgenda = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("agendas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      if (data.user_id !== user?.id) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta agenda.",
          variant: "destructive",
        });
        navigate("/agendas");
        return;
      }

      setAgenda(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar agenda",
        description: error.message,
        variant: "destructive",
      });
      navigate("/agendas");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("availability")
        .select("*")
        .eq("agenda_id", id)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setAvailability(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar disponibilidade",
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

  if (!agenda) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/agendas")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">{agenda.title}</h2>
            <p className="text-muted-foreground">
              Configure os horários disponíveis para agendamento
            </p>
          </div>

          <div className="space-y-6">
            {showForm ? (
              <AvailabilityForm
                agendaId={id!}
                onSuccess={() => {
                  loadAvailability();
                  setShowForm(false);
                }}
                onCancel={() => setShowForm(false)}
              />
            ) : (
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Horários Disponíveis</h3>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar horário
                </Button>
              </div>
            )}

            <AvailabilityList
              availability={availability}
              onUpdate={loadAvailability}
            />

            <LunchBreakConfig agenda={agenda} onUpdate={loadAgenda} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AgendaConfig;
