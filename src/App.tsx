import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Agendas from "./pages/Agendas";
import AgendaConfig from "./pages/AgendaConfig";
import PublicBooking from "./pages/PublicBooking";
import Bookings from "./pages/Bookings";
import Services from "./pages/Services";
import Financial from "./pages/Financial";
import Config from "./pages/Config";
import Clients from "./pages/Clients";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/agendas" element={<Agendas />} />
          <Route path="/agendas/:id/config" element={<AgendaConfig />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/servicos" element={<Services />} />
          <Route path="/financeiro" element={<Financial />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/config" element={<Config />} />
          <Route path="/agendar/:slug/:serviceId" element={<PublicBooking />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
