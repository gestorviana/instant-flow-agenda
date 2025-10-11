import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, Briefcase, DollarSign, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Calendar, label: "Agendamentos", path: "/" },
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: Briefcase, label: "Serviços", path: "/servicos" },
    { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
    { icon: Settings, label: "Config", path: "/config" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive && "scale-110")} />
              <span className={cn("text-[10px] font-medium", !isActive && "opacity-0")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
