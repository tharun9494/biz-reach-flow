import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, UserCircle, Search, Phone, LayoutDashboard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AppSidebar = () => {
  const { userName, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel = role === "admin" ? "Admin" : role === "lead_hunter" ? "Lead Hunter" : "Caller";
  const roleIcon = role === "admin" ? Shield : role === "lead_hunter" ? Search : Phone;
  const RoleIcon = roleIcon;
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

        <nav className="flex-1 p-4">
          <button
            onClick={() => navigate(dashPath)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              "hover:bg-[hsl(var(--sidebar-muted))]",
              "bg-[hsl(var(--sidebar-muted))] text-[hsl(var(--sidebar-accent))]"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>
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
        <button
          onClick={() => navigate(dashPath)}
          className="flex flex-col items-center gap-1 text-[hsl(var(--sidebar-accent))]"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
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
