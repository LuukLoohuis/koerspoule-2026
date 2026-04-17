import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import TeamBuilder from "./pages/TeamBuilder";
import Results from "./pages/Results";
import MijnPeloton from "./pages/MijnPeloton";
import Rules from "./pages/Rules";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Legal from "./pages/Legal";
import Admin from "./pages/Admin";
import AdminV2 from "./pages/AdminV2";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/team-samenstellen"
              element={
                <ProtectedRoute>
                  <TeamBuilder />
                </ProtectedRoute>
              }
            />
            <Route path="/uitslagen" element={<Results />} />
            <Route path="/mijn-peloton" element={<MijnPeloton />} />
            <Route path="/regels" element={<Rules />} />
            <Route path="/login" element={<Login />} />
            <Route path="/juridisch" element={<Legal />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/v2"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminV2 />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
