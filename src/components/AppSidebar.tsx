import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, UserCircle, Search, Phone, LayoutDashboard, Shield, Home, TrendingUp, Clock, BarChart3, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const AppSidebar = () => {
  const { userName, role, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [weeklyStats, setWeeklyStats] = useState({ leadsAdded: 0, hoursWorked: 0, daysWorked: 0 });

  // Calculate weekly stats
  useEffect(() => {
    if (!user) return;
    
    let totalLeads = 0;
    let totalHours = 0;
    let daysWorked = 0;
    
    // Get stats for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dateKey = date.toDateString();
      const savedStats = localStorage.getItem(`workStats_${user.uid}_${dateKey}`);
      
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        totalLeads += stats.leadsAdded || 0;
        totalHours += stats.hoursWorked || 0;
        if (stats.hoursWorked > 0) daysWorked++;
      }
    }
    
    setWeeklyStats({ leadsAdded: totalLeads, hoursWorked: totalHours, daysWorked });
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel = role === "admin" ? "Admin" : role === "lead_hunter" ? "Lead Hunter" : "Caller";
  const roleIcon = role === "admin" ? Shield : role === "lead_hunter" ? Search : Phone;
  const RoleIcon = roleIcon;
  const getHomePath = () => {
    if (role === "admin") return "/admin-home";
    if (role === "lead_hunter") return "/hunter-home";
    if (role === "caller") return "/caller"; // Callers go directly to dashboard
    return "/home";
  };
  const dashPath = role === "admin" ? "/admin" : role === "lead_hunter" ? "/hunter" : "/caller";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))]">
        <div className="p-6 border-b border-[hsl(var(--sidebar-muted))]">
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="h-6 w-6 text-[hsl(var(--sidebar-accent))]" />
            <h1 className="text-lg font-bold text-[hsl(var(--sidebar-accent))]">LeadFlow</h1>
          </div>
          <p className="text-xs text-[hsl(var(--sidebar-fg))/0.6]">Business Outreach CRM</p>
        </div>

        <div className="p-4 border-b border-[hsl(var(--sidebar-muted))]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[hsl(var(--sidebar-muted))] flex items-center justify-center">
              <UserCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[hsl(var(--sidebar-accent))]/20 text-[hsl(var(--sidebar-accent))]">
                <RoleIcon className="h-3 w-3" />
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-6">
          {/* Navigation */}
          <div className="space-y-2">
            {/* Show Home button only for admin and lead_hunter */}
            {role !== "caller" && (
              <button
                onClick={() => navigate(getHomePath())}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  "hover:bg-[hsl(var(--sidebar-muted))]",
                  location.pathname === getHomePath() && "bg-[hsl(var(--sidebar-muted))] text-[hsl(var(--sidebar-accent))]"
                )}
              >
                <Home className="h-4 w-4" />
                Home
              </button>
            )}
            <button
              onClick={() => navigate(dashPath)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                "hover:bg-[hsl(var(--sidebar-muted))]",
                location.pathname === dashPath && "bg-[hsl(var(--sidebar-muted))] text-[hsl(var(--sidebar-accent))]"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            {role === "lead_hunter" && (
              <button
                onClick={() => navigate("/performance")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  "hover:bg-[hsl(var(--sidebar-muted))]",
                  location.pathname === "/performance" && "bg-[hsl(var(--sidebar-muted))] text-[hsl(var(--sidebar-accent))]"
                )}
              >
                <Activity className="h-4 w-4" />
                Performance
              </button>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-[hsl(var(--sidebar-muted))]">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-[hsl(var(--sidebar-fg))] hover:text-[hsl(var(--sidebar-accent))] hover:bg-[hsl(var(--sidebar-muted))]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[hsl(var(--sidebar-bg))] border-t border-[hsl(var(--sidebar-muted))] flex items-center justify-around py-2 px-4">
        {/* Show Home button only for admin and lead_hunter */}
        {role !== "caller" && (
          <button
            onClick={() => navigate(getHomePath())}
            className={cn(
              "flex flex-col items-center gap-1",
              location.pathname === getHomePath() ? "text-[hsl(var(--sidebar-accent))]" : "text-[hsl(var(--sidebar-fg))/0.6]"
            )}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
        )}
        <button
          onClick={() => navigate(dashPath)}
          className={cn(
            "flex flex-col items-center gap-1",
            location.pathname === dashPath ? "text-[hsl(var(--sidebar-accent))]" : "text-[hsl(var(--sidebar-fg))/0.6]"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        {role === "lead_hunter" && (
          <button
            onClick={() => navigate("/performance")}
            className={cn(
              "flex flex-col items-center gap-1",
              location.pathname === "/performance" ? "text-[hsl(var(--sidebar-accent))]" : "text-[hsl(var(--sidebar-fg))/0.6]"
            )}
          >
            <Activity className="h-5 w-5" />
            <span className="text-[10px] font-medium">Performance</span>
          </button>
        )}
        <div className="flex flex-col items-center gap-1 text-[hsl(var(--sidebar-fg))/0.6]">
          <RoleIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium">{roleLabel}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-[hsl(var(--sidebar-fg))/0.6]"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </>
  );
};

export default AppSidebar;
