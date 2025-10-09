import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Zap, CheckCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Flash Agenda
          </h1>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Começar Grátis
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Agendamentos Rápidos e Simples
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Crie suas agendas personalizadas e comece a receber agendamentos em minutos.
            Sem complicação, sem mensalidades, totalmente gratuito.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 py-6">
            <Zap className="mr-2 h-5 w-5" />
            Criar Minha Agenda Grátis
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <Calendar className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Configure Seus Horários</h3>
            <p className="text-muted-foreground">
              Defina sua disponibilidade por dia da semana com horários flexíveis
            </p>
          </div>

          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <Clock className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Receba Agendamentos</h3>
            <p className="text-muted-foreground">
              Compartilhe seu link e comece a receber agendamentos instantaneamente
            </p>
          </div>

          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <CheckCircle className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Gerencie Facilmente</h3>
            <p className="text-muted-foreground">
              Confirme ou cancele agendamentos com apenas um clique
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-card rounded-lg border p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">Pronto para começar?</h3>
          <p className="text-muted-foreground mb-6">
            Junte-se a milhares de profissionais que já simplificaram seus agendamentos
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Criar Conta Gratuita
          </Button>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2025 Flash Agenda. Feito com ⚡ para simplificar sua vida.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
