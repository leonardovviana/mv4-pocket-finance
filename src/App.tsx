import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { IOSTabBar } from "@/components/IOSTabBar";

// Pages
import Auth from "./pages/Auth";
import MelhoresDoAno from "./pages/MelhoresDoAno";
import GestaoMidias from "./pages/GestaoMidias";
import PremioExcelencia from "./pages/PremioExcelencia";
import CarroSom from "./pages/CarroSom";
import RevistaFactus from "./pages/RevistaFactus";
import RevistaSaude from "./pages/RevistaSaude";
import ServicosVariados from "./pages/ServicosVariados";
import Despesas from "./pages/Despesas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="mv4-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><MelhoresDoAno /></ProtectedRoute>} />
                <Route path="/midias" element={<ProtectedRoute><GestaoMidias /></ProtectedRoute>} />
                <Route path="/premio" element={<ProtectedRoute><PremioExcelencia /></ProtectedRoute>} />
                <Route path="/carro-som" element={<ProtectedRoute><CarroSom /></ProtectedRoute>} />
                <Route path="/factus" element={<ProtectedRoute><RevistaFactus /></ProtectedRoute>} />
                <Route path="/saude" element={<ProtectedRoute><RevistaSaude /></ProtectedRoute>} />
                <Route path="/servicos" element={<ProtectedRoute><ServicosVariados /></ProtectedRoute>} />
                <Route path="/despesas" element={<ProtectedRoute><Despesas /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Routes>
                <Route path="/auth" element={null} />
                <Route path="*" element={<IOSTabBar />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
