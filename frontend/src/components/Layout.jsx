import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ListTodo, Phone, MessageCircle,
  Gem, CalendarCheck2, FileText, Bot, UserCog, LogOut, Menu, X, Bell, PhoneCall, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallPrompt from "@/components/InstallPrompt";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/campaigns", label: "AI Calling", icon: PhoneCall },
  { to: "/copilot",   label: "AI Copilot", icon: Sparkles },
  { to: "/whatsapp",  label: "WhatsApp",   icon: MessageCircle },
  { to: "/products", label: "Products", icon: Gem },
  { to: "/appointments", label: "Appointments", icon: CalendarCheck2 },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/ai-logs", label: "AI Agent", icon: Bot },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FBF8F3] text-slate-900">
      {/* Mobile topbar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-amber-100">
        <button
          data-testid="mobile-menu-toggle"
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
          className="p-2"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link to="/" className="flex items-center gap-2 font-serif font-semibold text-lg">
          <Gem className="h-5 w-5 text-amber-700" /> Facets CRM
        </Link>
        <div className="w-9" />
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          data-testid="sidebar"
          className={cn(
            "fixed md:sticky md:top-0 z-40 md:z-auto h-screen w-64 shrink-0 bg-white border-r border-amber-100 flex-col",
            "transition-transform duration-200",
            open ? "translate-x-0 flex" : "-translate-x-full md:translate-x-0 md:flex hidden md:flex"
          )}
        >
          <div className="px-5 h-16 flex items-center gap-2 border-b border-amber-100">
            <Gem className="h-6 w-6 text-amber-700" />
            <div className="leading-tight">
              <div className="font-serif font-semibold text-lg">Facets CRM</div>
              <div className="text-[11px] uppercase tracking-wider text-amber-700">Jewellery</div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-3">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-5 py-2.5 text-sm font-medium",
                    isActive
                      ? "bg-amber-50 text-amber-900 border-r-2 border-amber-700"
                      : "text-slate-700 hover:bg-amber-50/60"
                  )
                }
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </NavLink>
            ))}
            {user?.role === "Admin" && (
              <NavLink
                to="/users"
                data-testid="nav-users"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-5 py-2.5 text-sm font-medium",
                    isActive
                      ? "bg-amber-50 text-amber-900 border-r-2 border-amber-700"
                      : "text-slate-700 hover:bg-amber-50/60"
                  )
                }
              >
                <UserCog className="h-4 w-4" /> Team
              </NavLink>
            )}
          </nav>
          <div className="border-t border-amber-100 p-4">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-amber-700">{user?.role}</div>
            <Button
              data-testid="logout-btn"
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-start text-slate-700 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => { logout(); nav("/login"); }}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </aside>

        {/* Overlay on mobile */}
        {open && (
          <button
            aria-label="Close menu"
            className="md:hidden fixed inset-0 z-30 bg-slate-900/30"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="hidden md:flex items-center justify-end gap-3 h-14 px-6 bg-white border-b border-amber-100">
            <Bell className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-700">
              Welcome, <span className="font-semibold">{user?.name?.split(" ")[0]}</span>
            </span>
          </div>
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      <InstallPrompt />
    </div>
  );
}
