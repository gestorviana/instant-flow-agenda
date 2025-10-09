import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Zap, CheckCircle, Link2, Settings, Bell } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
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
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl lg:text-7xl font-bold mb-6">
              Agendar nunca foi tão{" "}
              <span className="text-primary">fácil!</span>
            </h2>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Compartilhe um link e receba agendamentos pelo WhatsApp. 
              Sem complicação, sem mensalidades. 100% gratuito.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 py-6 h-auto">
              <Zap className="mr-2 h-5 w-5" />
              Criar Minha Agenda Grátis
            </Button>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl lg:text-4xl font-bold text-center mb-4">
              Seu cliente marca um horário com você em apenas 3 passos:
            </h3>
            <p className="text-center text-muted-foreground mb-12">
              Simples, rápido e direto pelo WhatsApp
            </p>

            <div className="space-y-6">
              {/* Passo 1 */}
              <div className="bg-card border rounded-lg p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl lg:text-3xl font-bold text-primary">1.</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl lg:text-2xl font-semibold mb-2 flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-primary" />
                      Acessar o Link de Agendamento
                    </h4>
                    <p className="text-muted-foreground">
                      Seu cliente acessa o link de agendamento personalizado da sua empresa pelo WhatsApp.
                    </p>
                  </div>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="bg-card border rounded-lg p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl lg:text-3xl font-bold text-primary">2.</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl lg:text-2xl font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Escolher o Serviço, Dia e Horário
                    </h4>
                    <p className="text-muted-foreground">
                      Seleciona o serviço desejado, escolhe o dia e o horário disponível que melhor se encaixa na agenda dele.
                    </p>
                  </div>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="bg-card border rounded-lg p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl lg:text-3xl font-bold text-primary">3.</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl lg:text-2xl font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Confirmar e Pronto!
                    </h4>
                    <p className="text-muted-foreground">
                      Preenche nome, email e telefone. Agendamento criado! Você recebe a notificação e confirma o horário.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos Principais */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-3xl lg:text-4xl font-bold text-center mb-12">
              Tudo que você precisa para gerenciar seus agendamentos
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Configure Seus Horários</h4>
                <p className="text-muted-foreground text-sm">
                  Defina disponibilidade por dia da semana, horários flexíveis e intervalo de almoço
                </p>
              </div>

              <div className="p-6 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Múltiplas Agendas</h4>
                <p className="text-muted-foreground text-sm">
                  Crie várias agendas diferentes para diferentes serviços ou locais
                </p>
              </div>

              <div className="p-6 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Gestão de Serviços</h4>
                <p className="text-muted-foreground text-sm">
                  Cadastre seus serviços com duração e valores para facilitar os agendamentos
                </p>
              </div>

              <div className="p-6 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Confirme com 1 Clique</h4>
                <p className="text-muted-foreground text-sm">
                  Receba notificações e confirme ou cancele agendamentos instantaneamente
                </p>
              </div>

              <div className="p-6 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Link2 className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Link Personalizado</h4>
                <p className="text-muted-foreground text-sm">
                  Compartilhe seu link único pelo WhatsApp, redes sociais ou site
                </p>
              </div>

              <div className="p-6 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">100% Gratuito</h4>
                <p className="text-muted-foreground text-sm">
                  Sem mensalidades, sem taxas escondidas. Totalmente gratuito para sempre
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-3xl lg:text-4xl font-bold mb-4">
              Pronto para simplificar seus agendamentos?
            </h3>
            <p className="text-xl text-muted-foreground mb-8">
              Junte-se a centenas de profissionais que já transformaram sua forma de agendar
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 py-6 h-auto">
              <Zap className="mr-2 h-5 w-5" />
              Começar Agora - É Grátis
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Flash Agenda. Feito com ⚡ para simplificar sua vida.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
