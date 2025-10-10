import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DownloadN8nFlows = () => {
  const flows = [
    {
      name: "Fluxo Completo - Agendamentos WhatsApp",
      file: "n8n-workflow-completo.json",
      description: "Sistema completo de notificações WhatsApp para agendamentos"
    },
    {
      name: "Viana Dropz - IA e Automação",
      file: "n8n-workflow-viana-dropz.json",
      description: "Fluxo com OpenAI, processamento de áudio/imagem e Redis"
    }
  ];

  const downloadFlow = async (filename: string) => {
    try {
      const response = await fetch(`/${filename}`);
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Fluxos n8n Disponíveis</h2>
      <div className="grid gap-4">
        {flows.map((flow) => (
          <Card key={flow.file} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{flow.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{flow.description}</p>
              </div>
              <Button
                onClick={() => downloadFlow(flow.file)}
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar JSON
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DownloadN8nFlows;
