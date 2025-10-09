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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Copy } from "lucide-react";

const Config = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [agenda, setAgenda] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
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
            <CardTitle>Notificações</CardTitle>
            <CardDescription>
              Configure lembretes de agendamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em breve: configure lembretes 15/30/60 minutos antes dos atendimentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integração Webhook</CardTitle>
            <CardDescription>
              Conecte com n8n ou outras automações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em breve: configure webhooks para receber eventos em tempo real
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Config;
