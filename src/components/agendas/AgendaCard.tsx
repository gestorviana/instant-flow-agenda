import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Edit, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EditAgendaDialog } from "./EditAgendaDialog";
import { DeleteAgendaDialog } from "./DeleteAgendaDialog";
import type { Agenda } from "@/types/database";

interface AgendaCardProps {
  agenda: Agenda;
  onUpdate: () => void;
}

export const AgendaCard = ({ agenda, onUpdate }: AgendaCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <EditAgendaDialog
        agenda={agenda}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onUpdate}
      />
      <DeleteAgendaDialog
        agenda={agenda}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={onUpdate}
      />
      <div className="p-6 border rounded-2xl hover:border-primary/50 transition-all bg-card">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1">{agenda.title}</h3>
            {agenda.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {agenda.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={agenda.is_active ? "default" : "secondary"}
              className="rounded-full"
            >
              {agenda.is_active ? "Ativa" : "Inativa"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      
        <Button 
          size="lg"
          className="w-full rounded-xl"
          onClick={() => navigate(`/agendas/${agenda.id}/config`)}
        >
          <Settings className="mr-2 h-5 w-5" />
          Configurar Agenda
        </Button>
      </div>
    </>
  );
};
