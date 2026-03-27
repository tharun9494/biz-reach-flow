import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import HunterDashboard from "@/pages/HunterDashboard";
import CallerDashboard from "@/pages/CallerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const HomeRedirect = () => {
  const { user, role, loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "lead_hunter") return <Navigate to="/hunter" replace />;
  if (role === "caller") return <Navigate to="/caller" replace />;
  return <Navigate to="/login" replace />;
};

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/hunter" element={<ProtectedRoute allowedRole="lead_hunter"><HunterDashboard /></ProtectedRoute>} />
          <Route path="/caller" element={<ProtectedRoute allowedRole="caller"><CallerDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;
