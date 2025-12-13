import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { IOSTabBar } from "@/components/IOSTabBar";

// Pages
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
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<MelhoresDoAno />} />
              <Route path="/midias" element={<GestaoMidias />} />
              <Route path="/premio" element={<PremioExcelencia />} />
              <Route path="/carro-som" element={<CarroSom />} />
              <Route path="/factus" element={<RevistaFactus />} />
              <Route path="/saude" element={<RevistaSaude />} />
              <Route path="/servicos" element={<ServicosVariados />} />
              <Route path="/despesas" element={<Despesas />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <IOSTabBar />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
