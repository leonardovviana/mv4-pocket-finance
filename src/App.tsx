import { IOSTabBar } from "@/components/IOSTabBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { MonthFilterProvider } from "@/hooks/useMonthFilter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Pages
import Auth from "./pages/Auth";
import CarroSom from "./pages/CarroSom";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Despesas from "./pages/Despesas";
import GestaoMidias from "./pages/GestaoMidias";
import MelhoresDoAno from "./pages/MelhoresDoAno";
import NotFound from "./pages/NotFound";
import PremioExcelencia from "./pages/PremioExcelencia";
import Profile from "./pages/Profile";
import RevistaFactus from "./pages/RevistaFactus";
import RevistaSaude from "./pages/RevistaSaude";
import ServicosVariados from "./pages/ServicosVariados";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="mv4-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <MonthFilterProvider>
              <div className="min-h-screen bg-background">
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/melhores" element={<ProtectedRoute><MelhoresDoAno /></ProtectedRoute>} />
                  <Route path="/midias" element={<ProtectedRoute><GestaoMidias /></ProtectedRoute>} />
                  <Route path="/premio" element={<ProtectedRoute><PremioExcelencia /></ProtectedRoute>} />
                  <Route path="/carro-som" element={<ProtectedRoute><CarroSom /></ProtectedRoute>} />
                  <Route path="/factus" element={<ProtectedRoute><RevistaFactus /></ProtectedRoute>} />
                  <Route path="/saude" element={<ProtectedRoute><RevistaSaude /></ProtectedRoute>} />
                  <Route path="/servicos" element={<ProtectedRoute><ServicosVariados /></ProtectedRoute>} />
                  <Route path="/despesas" element={<ProtectedRoute><Despesas /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                  <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Routes>
                  <Route path="/auth" element={null} />
                  <Route path="*" element={<IOSTabBar />} />
                </Routes>
              </div>
            </MonthFilterProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
