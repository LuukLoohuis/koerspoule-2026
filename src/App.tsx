import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemaProvider } from "@/contexts/ThemaContext";
import Layout from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import TeamBuilder from "./pages/TeamBuilder";
import Results from "./pages/Results";
import MijnPeloton from "./pages/MijnPeloton";
import Rules from "./pages/Rules";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Legal from "./pages/Legal";
import AdminV3 from "./pages/AdminV3";
import GiroPoule2026 from "./pages/GiroPoule2026";
import TourDeFrancePoule2026 from "./pages/TourDeFrancePoule2026";
import Preview from "./pages/Preview";
import InstagramExport from "./pages/InstagramExport";
import Uitschrijven from "./pages/Uitschrijven";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error: unknown) => {
        const err = error as { code?: string; cause?: { code?: string } } | null;
        const code = err?.code ?? err?.cause?.code;
        // Permission denied / RLS / unique violation: nooit retryen
        if (code === "42501" || code === "PGRST301" || code === "23505") return false;
        return failureCount < 1;
      },
    },
    mutations: { retry: 0 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <ThemaProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/team-samenstellen" element={<TeamBuilder />} />
              <Route path="/uitslagen" element={<Results />} />
              <Route path="/mijn-peloton" element={<MijnPeloton />} />
              <Route path="/karavaan" element={<MijnPeloton />} />
              <Route path="/regels" element={<Rules />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/juridisch" element={<Legal />} />
              <Route path="/preview" element={<Preview />} />
              <Route path="/giro-italia-poule-2026" element={<GiroPoule2026 />} />
              <Route path="/tour-de-france-poule-2026" element={<TourDeFrancePoule2026 />} />
              <Route path="/tour-de-france-poule" element={<TourDeFrancePoule2026 />} />
              <Route path="/tourspel" element={<TourDeFrancePoule2026 />} />
              <Route path="/wielerpoule-tour-de-france" element={<TourDeFrancePoule2026 />} />
              <Route path="/uitschrijven" element={<Uitschrijven />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminV3 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instagram-export"
                element={
                  <ProtectedRoute requireAdmin>
                    <InstagramExport />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
          </ThemaProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
