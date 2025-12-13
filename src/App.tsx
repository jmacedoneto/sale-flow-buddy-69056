import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { useRealtimeErrorAlerts } from "@/hooks/useRealtimeErrorAlerts";
import { AIChat } from "@/components/AIChat";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pending from "./pages/Pending";
import Dashboard from "./pages/Dashboard";
import DashboardComercial from "./pages/DashboardComercial";
import DashboardAdministrativo from "./pages/DashboardAdministrativo";
import Atividades from "./pages/Atividades";
import Configuracoes from "./pages/Configuracoes";
import NegociacoesPausadas from "./pages/NegociacoesPausadas";
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
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard-comercial" element={<ProtectedRoute><DashboardComercial /></ProtectedRoute>} />
        <Route path="/dashboard-administrativo" element={<ProtectedRoute><DashboardAdministrativo /></ProtectedRoute>} />
        <Route path="/atividades" element={<ProtectedRoute><Atividades /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
        <Route path="/negociacoes-pausadas" element={<ProtectedRoute><NegociacoesPausadas /></ProtectedRoute>} />
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
