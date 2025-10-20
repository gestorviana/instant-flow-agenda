import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Search, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Agenda {
  id: string;
  title: string;
  user_id: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  active: boolean;
}

interface Profile {
  full_name: string | null;
}

function formatCurrencyBRL(value: number | null | undefined) {
  if (value == null) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ServiceSelect() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [professionalName, setProfessionalName] = useState<string>("");
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Carregar agenda, serviços e perfil
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // Buscar agenda
        const { data: ag, error: agErr } = await supabase
          .from("agendas")
          .select("id, title, user_id")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();
        if (agErr) throw agErr;
        if (!ag) throw new Error("Agenda não encontrada.");
        if (!mounted) return;
        setAgenda(ag as Agenda);

        // Buscar serviços
        const { data: servs, error: sErr } = await supabase
          .from("services")
          .select("id, name, description, duration_minutes, price, active")
          .eq("user_id", ag.user_id)
          .order("name", { ascending: true });
        if (sErr) throw sErr;
        if (!mounted) return;
        setAllServices((servs || []) as Service[]);

        // Buscar nome do profissional
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", ag.user_id)
          .single();
        if (!pErr && profile) {
          setProfessionalName(profile.full_name || "Profissional");
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Erro ao carregar serviços.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (slug) load();
    return () => { mounted = false; };
  }, [slug]);

  // Filtrar serviços
  useEffect(() => {
    let filtered = allServices;
    
    // Filtro ativo/inativo
    if (!showInactive) {
      filtered = filtered.filter(s => s.active);
    }
    
    // Filtro de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(term) || 
        (s.description && s.description.toLowerCase().includes(term))
      );
    }
    
    setFilteredServices(filtered);
  }, [allServices, searchTerm, showInactive]);

  function handleSelectService(service: Service) {
    navigate(`/agendar/${slug}/${service.id}`);
  }

  // ====== RENDER ======
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando serviços…</div>
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Agenda não encontrada.</p>
          <button 
            onClick={() => navigate("/")} 
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <button 
            onClick={() => navigate("/")} 
            className="p-1.5 hover:bg-muted rounded-lg transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Escolha um serviço</h1>
            <p className="text-xs text-muted-foreground">{professionalName}</p>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar serviço..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Toggle Ativos/Todos */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => setShowInactive(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              !showInactive 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setShowInactive(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showInactive 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Todos
          </button>
        </div>

        {/* Lista de serviços */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum serviço encontrado." : "Nenhum serviço disponível."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                onClick={() => handleSelectService(service)}
                className="w-full text-left p-4 rounded-xl border bg-card hover:shadow-lg hover:border-primary transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition">
                        {service.name}
                      </h3>
                      {service.active && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                          Ativo
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrencyBRL(service.price)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
