import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Agenda } from "@/types/database";

interface AgendaCardProps {
  agenda: Agenda;
  onUpdate: () => void;
}

export const AgendaCard = ({ agenda, onUpdate }: AgendaCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-1">{agenda.title}</h3>
          {agenda.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {agenda.description}
            </p>
          )}
        </div>
        <Badge variant={agenda.is_active ? "default" : "secondary"}>
          {agenda.is_active ? "Ativa" : "Inativa"}
        </Badge>
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => navigate(`/agendas/${agenda.id}/config`)}
        >
          <Settings className="mr-2 h-4 w-4" />
          Configurar
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <ExternalLink className="mr-2 h-4 w-4" />
          Ver link
        </Button>
      </div>
    </div>
  );
};
