import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRealtimeErrorAlerts } from "@/hooks/useRealtimeErrorAlerts";
import { AIChat } from "@/components/AIChat";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pending from "./pages/Pending";
import Dashboard from "./pages/Dashboard";
import DashboardComercial from "./pages/DashboardComercial";
import DashboardAdministrativo from "./pages/DashboardAdministrativo";
import Atividades from "./pages/Atividades";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Componente wrapper para hooks que precisam estar dentro do QueryClientProvider
const AppContent = () => {
  useRealtimeErrorAlerts(); // Ativa monitoramento de erros em tempo real
  
  return (
    <BrowserRouter>
      <AIChat />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/pending" element={<Pending />} />
        <Route path="/" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/dashboard-comercial" element={<ProtectedRoute><AppLayout><DashboardComercial /></AppLayout></ProtectedRoute>} />
        <Route path="/dashboard-administrativo" element={<ProtectedRoute><AppLayout><DashboardAdministrativo /></AppLayout></ProtectedRoute>} />
        <Route path="/atividades" element={<ProtectedRoute><AppLayout><Atividades /></AppLayout></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><AppLayout><Configuracoes /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
