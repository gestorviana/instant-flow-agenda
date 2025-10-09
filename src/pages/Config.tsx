import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Copy, Webhook, Bell, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const Config = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [agenda, setAgenda] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [reminders, setReminders] = useState<number[]>([30]);
  const [reminderMessage, setReminderMessage] = useState("");
  const [saving, setSaving] = useState(false);
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
      loadProfile();
      loadAgenda();
      loadSettings();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAgenda = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("agendas")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setAgenda(data);
    } catch (error: any) {
      console.error("Erro ao carregar agenda:", error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("settings")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Se não existe, cria um novo
        const { data: newSettings, error: insertError } = await (supabase as any)
          .from("settings")
          .insert({ user_id: user!.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        setSettings(newSettings);
        setWebhookUrl(newSettings?.webhook_url || "");
        setReminders(newSettings?.reminders_minutes || [30]);
        setReminderMessage(newSettings?.reminder_message || "Olá! Este é um lembrete do seu agendamento.");
      } else {
        setSettings(data);
        setWebhookUrl(data?.webhook_url || "");
        setReminders(data?.reminders_minutes || [30]);
        setReminderMessage(data?.reminder_message || "Olá! Este é um lembrete do seu agendamento.");
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload para Supabase Storage (você precisará criar o bucket 'avatars')
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({ photo_url: data.publicUrl })
        .eq("id", user!.id);

      if (updateError) throw updateError;

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });

      loadProfile();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const copyLink = () => {
    if (agenda?.slug) {
      const url = `${window.location.origin}/agendar/${agenda.slug}`;
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
      });
    }
  };

  const saveWebhook = async () => {
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("settings")
        .update({ webhook_url: webhookUrl })
        .eq("user_id", user!.id);

      if (error) throw error;

      toast({
        title: "Webhook configurado!",
        description: "A URL do webhook foi salva com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar webhook",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveReminders = async () => {
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("settings")
        .update({ 
          reminders_minutes: reminders,
          reminder_message: reminderMessage 
        })
        .eq("user_id", user!.id);

      if (error) throw error;

      toast({
        title: "Lembretes configurados!",
        description: "As configurações de lembrete foram salvas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar lembretes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = (minutes: number) => {
    if (reminders.includes(minutes)) {
      setReminders(reminders.filter(m => m !== minutes));
    } else {
      setReminders([...reminders, minutes]);
    }
  };

  const testWebhook = async () => {
    try {
      setSaving(true);
      
      const testData = {
        event_type: "test",
        booking: {
          id: "test-booking-id",
          guest_name: "Cliente Teste",
          guest_phone: "(11) 99999-9999",
          booking_date: new Date().toISOString().split('T')[0],
          start_time: "10:00",
          end_time: "11:00",
        },
        agenda: {
          title: agenda?.title || "Sua Agenda",
        },
        service: {
          name: "Serviço Teste",
          price: 50.00,
          duration_minutes: 60,
        }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        toast({
          title: "Webhook testado com sucesso!",
          description: "Verifique seu n8n para ver se recebeu os dados de teste.",
        });
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao testar webhook",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <p>Carregando...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Configurações">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil do Profissional</CardTitle>
            <CardDescription>
              Configure suas informações públicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.photo_url} />
                  <AvatarFallback>
                    {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90"
                >
                  <Camera className="h-4 w-4" />
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={profile?.full_name || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={profile?.phone || ""} disabled />
            </div>

            {agenda?.slug && (
              <div className="space-y-2">
                <Label>Link Público</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/agendar/${agenda.slug}`}
                    readOnly
                  />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Integração Webhook n8n
            </CardTitle>
            <CardDescription>
              Receba notificações automáticas de novos agendamentos e mudanças de status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook">URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook"
                  placeholder="https://seu-n8n.app/webhook/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <Button onClick={saveWebhook} disabled={saving}>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole aqui a URL do webhook do seu n8n. Você receberá notificações quando:
                <br />• Novo agendamento for criado
                <br />• Status de agendamento for alterado (confirmado/cancelado)
              </p>
              <Button 
                onClick={testWebhook} 
                variant="outline" 
                className="w-full mt-2"
                disabled={!webhookUrl || saving}
              >
                🧪 Testar Webhook
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Lembretes Automáticos
            </CardTitle>
            <CardDescription>
              Configure quando você quer ser notificado antes dos agendamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reminder-message">Mensagem do Lembrete</Label>
                <Textarea
                  id="reminder-message"
                  placeholder="Escreva a mensagem que será enviada como lembrete..."
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será enviada aos clientes nos horários selecionados abaixo.
                  Você pode incluir informações como nome do serviço, data e horário.
                </p>
              </div>

              <Label>Enviar lembrete:</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reminder-15"
                    checked={reminders.includes(15)}
                    onCheckedChange={() => toggleReminder(15)}
                  />
                  <label htmlFor="reminder-15" className="text-sm cursor-pointer">
                    15 minutos antes
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reminder-30"
                    checked={reminders.includes(30)}
                    onCheckedChange={() => toggleReminder(30)}
                  />
                  <label htmlFor="reminder-30" className="text-sm cursor-pointer">
                    30 minutos antes
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reminder-60"
                    checked={reminders.includes(60)}
                    onCheckedChange={() => toggleReminder(60)}
                  />
                  <label htmlFor="reminder-60" className="text-sm cursor-pointer">
                    1 hora antes
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reminder-1440"
                    checked={reminders.includes(1440)}
                    onCheckedChange={() => toggleReminder(1440)}
                  />
                  <label htmlFor="reminder-1440" className="text-sm cursor-pointer">
                    1 dia antes
                  </label>
                </div>
              </div>
              <Button onClick={saveReminders} disabled={saving} className="w-full">
                <Check className="h-4 w-4 mr-2" />
                Salvar Configurações de Lembrete
              </Button>
              <p className="text-xs text-muted-foreground">
                Os lembretes serão enviados via webhook n8n (configure a URL acima)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Config;
