import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Availability } from "@/types/database";

interface AvailabilityListProps {
  availability: Availability[];
  onUpdate: () => void;
}

const daysOfWeekLabels = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const AvailabilityList = ({ availability, onUpdate }: AvailabilityListProps) => {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("availability")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Horário removido",
        description: "O horário foi removido com sucesso.",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao remover horário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (availability.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Nenhum horário configurado ainda.</p>
          <p className="text-sm mt-2">Adicione horários para começar a receber agendamentos.</p>
        </CardContent>
      </Card>
    );
  }

  const groupedByDay = availability.reduce((acc, item) => {
    if (!acc[item.day_of_week]) {
      acc[item.day_of_week] = [];
    }
    acc[item.day_of_week].push(item);
    return acc;
  }, {} as Record<number, Availability[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedByDay).map(([day, times]) => (
        <Card key={day}>
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3">{daysOfWeekLabels[parseInt(day)]}</h4>
            <div className="space-y-2">
              {times.map((time) => (
                <div
                  key={time.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {time.start_time.substring(0, 5)} - {time.end_time.substring(0, 5)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(time.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
