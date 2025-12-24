import { ChuvinhaFab } from "@/components/ChuvinhaFab";
import { IOSTabBar } from "@/components/IOSTabBar";
import { PayablesNotifier } from "@/components/PayablesNotifier";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGate } from "@/components/RoleGate";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { MonthFilterProvider } from "@/hooks/useMonthFilter";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Pages
import Auth from "./pages/Auth";
import CarroSom from "./pages/CarroSom";
import Chat from "./pages/Chat";
import ContasAPagar from "./pages/ContasAPagar";
import Dashboard from "./pages/Dashboard";
import Despesas from "./pages/Despesas";
import Funcionario from "./pages/Funcionario";
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
        {!isSupabaseConfigured ? (
          <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-xl border bg-card p-5 text-card-foreground">
              <div className="text-base font-semibold">Configuração pendente</div>
              <div className="mt-2 text-sm text-muted-foreground">
                O Supabase não está configurado. No Netlify, adicione as variáveis de ambiente e redeploy.
              </div>
              <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                <div className="font-medium">Obrigatórias</div>
                <div className="mt-1 font-mono">VITE_SUPABASE_URL</div>
                <div className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Origem atual: <span className="font-mono">{window.location.origin}</span>
              </div>
            </div>
          </div>
        ) : (
          <BrowserRouter>
            <AuthProvider>
              <MonthFilterProvider>
                <div className="min-h-screen bg-background">
                  <PayablesNotifier />
                  <Routes>
                    <Route path="/auth" element={<Auth />} />

                    <Route
                      path="/funcionario"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin", "employee"]} redirectTo="/auth">
                            <Funcionario />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <Dashboard />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/melhores"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <MelhoresDoAno />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/midias"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <GestaoMidias />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/premio"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <PremioExcelencia />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/carro-som"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <CarroSom />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/factus"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <RevistaFactus />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/saude"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <RevistaSaude />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/servicos"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <ServicosVariados />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/despesas"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <Despesas />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/contas-a-pagar"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <ContasAPagar />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin"]} redirectTo="/funcionario">
                            <Chat />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/perfil"
                      element={
                        <ProtectedRoute>
                          <RoleGate allow={["admin", "employee"]} redirectTo="/auth">
                            <Profile />
                          </RoleGate>
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Routes>
                    <Route path="/auth" element={null} />
                    <Route path="*" element={<IOSTabBar />} />
                  </Routes>

                  <ChuvinhaFab />
                </div>
              </MonthFilterProvider>
            </AuthProvider>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
