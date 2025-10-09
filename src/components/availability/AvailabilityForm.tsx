import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AvailabilityFormProps {
  agendaId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const daysOfWeek = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

export const AvailabilityForm = ({ agendaId, onSuccess, onCancel }: AvailabilityFormProps) => {
  const [dayOfWeek, setDayOfWeek] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hasLunchBreak, setHasLunchBreak] = useState(false);
  const [lunchStart, setLunchStart] = useState("");
  const [lunchEnd, setLunchEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!dayOfWeek || !startTime || !endTime) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      if (startTime >= endTime) {
        throw new Error("O horário de início deve ser anterior ao horário de término");
      }

      if (hasLunchBreak) {
        if (!lunchStart || !lunchEnd) {
          throw new Error("Preencha os horários de almoço");
        }
        if (lunchStart >= lunchEnd) {
          throw new Error("O horário de início do almoço deve ser anterior ao término");
        }
        if (lunchStart < startTime || lunchEnd > endTime) {
          throw new Error("O horário de almoço deve estar dentro do horário de trabalho");
        }

        // Criar dois horários: manhã e tarde
        const { error: error1 } = await (supabase as any).from("availability").insert({
          agenda_id: agendaId,
          day_of_week: parseInt(dayOfWeek),
          start_time: startTime,
          end_time: lunchStart,
        });

        if (error1) throw error1;

        const { error: error2 } = await (supabase as any).from("availability").insert({
          agenda_id: agendaId,
          day_of_week: parseInt(dayOfWeek),
          start_time: lunchEnd,
          end_time: endTime,
        });

        if (error2) throw error2;
      } else {
        // Criar um único horário
        const { error } = await (supabase as any).from("availability").insert({
          agenda_id: agendaId,
          day_of_week: parseInt(dayOfWeek),
          start_time: startTime,
          end_time: endTime,
        });

        if (error) throw error;
      }

      toast({
        title: "Horário adicionado!",
        description: "O horário foi configurado com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar horário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adicionar Horário Disponível</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="day">Dia da semana</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Horário de início</Label>
              <Input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Horário de término</Label>
              <Input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="lunch"
              checked={hasLunchBreak}
              onCheckedChange={(checked) => setHasLunchBreak(checked as boolean)}
            />
            <Label htmlFor="lunch" className="cursor-pointer">
              Incluir horário de almoço
            </Label>
          </div>

          {hasLunchBreak && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
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
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar horário"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
