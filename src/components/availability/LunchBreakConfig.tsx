import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Coffee } from "lucide-react";
import type { Agenda } from "@/types/database";

interface LunchBreakConfigProps {
  agenda: Agenda;
  onUpdate: () => void;
}

export const LunchBreakConfig = ({ agenda, onUpdate }: LunchBreakConfigProps) => {
  const [lunchStart, setLunchStart] = useState(agenda.lunch_break_start || "");
  const [lunchEnd, setLunchEnd] = useState(agenda.lunch_break_end || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);

    try {
      if (lunchStart && lunchEnd && lunchStart >= lunchEnd) {
        throw new Error("O horário de início deve ser anterior ao horário de término");
      }

      const { error } = await (supabase as any)
        .from("agendas")
        .update({
          lunch_break_start: lunchStart || null,
          lunch_break_end: lunchEnd || null,
        })
        .eq("id", agenda.id);

      if (error) throw error;

      toast({
        title: "Horário de almoço atualizado!",
        description: lunchStart && lunchEnd 
          ? "O intervalo de almoço foi configurado com sucesso."
          : "O intervalo de almoço foi removido.",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setLunchStart("");
    setLunchEnd("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Coffee className="h-5 w-5" />
          <CardTitle>Horário de Almoço</CardTitle>
        </div>
        <CardDescription>
          Configure um intervalo de almoço que será aplicado a todos os dias com horários disponíveis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lunch-start">Início do almoço</Label>
            <Input
              id="lunch-start"
              type="time"
              value={lunchStart}
              onChange={(e) => setLunchStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lunch-end">Fim do almoço</Label>
            <Input
              id="lunch-end"
              type="time"
              value={lunchEnd}
              onChange={(e) => setLunchEnd(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          {(lunchStart || lunchEnd) && (
            <Button type="button" variant="outline" onClick={handleClear}>
              Limpar
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
