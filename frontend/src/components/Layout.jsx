import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ListTodo, Phone, MessageCircle,
  CalendarCheck2, FileText, Bot, UserCog, LogOut, Menu, X, Bell, PhoneCall, Sparkles, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallPrompt from "@/components/InstallPrompt";
import CrmDialer from "@/components/CrmDialer";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/campaigns", label: "AI Calling", icon: PhoneCall },
  { to: "/copilot",   label: "AI Copilot", icon: Sparkles },
  { to: "/whatsapp",  label: "WhatsApp",   icon: MessageCircle },
  { to: "/products", label: "Services", icon: Briefcase },
  { to: "/appointments", label: "Appointments", icon: CalendarCheck2 },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/ai-logs", label: "AI Agent", icon: Bot },
];

function StarryBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = (canvas.width = window.innerWidth);
      height = (canvas.height = window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    const stars = [];
    const numStars = 80;
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.12 + 0.03,
        alpha: Math.random(),
        direction: Math.random() > 0.5 ? 1 : -1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129, 140, 248, ${star.alpha * 0.6})`;
        ctx.fill();

        star.y -= star.speed;
        star.alpha += star.direction * 0.008;

        if (star.alpha <= 0.05) {
          star.direction = 1;
        } else if (star.alpha >= 0.8) {
          star.direction = -1;
        }

        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen text-slate-100 relative overflow-x-hidden">
      <StarryBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 glass-header text-slate-100">
          <button
            data-testid="mobile-menu-toggle"
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
            className="p-2"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2 font-serif font-semibold text-lg">
            <Briefcase className="h-5 w-5 text-indigo-400" /> ParshWebCraft CRM
          </Link>
          <div className="w-9" />
        </header>

        <div className="flex flex-1">
          {/* Sidebar */}
          <aside
            data-testid="sidebar"
            className={cn(
              "fixed md:sticky md:top-0 z-40 md:z-auto h-screen w-64 shrink-0 glass-sidebar flex flex-col text-slate-100",
              "transition-transform duration-200",
              open ? "translate-x-0 flex" : "-translate-x-full md:translate-x-0 md:flex hidden md:flex"
            )}
          >
            <div className="px-5 h-16 flex items-center gap-2 border-b border-white/10 shrink-0">
              <Briefcase className="h-6 w-6 text-indigo-400" />
              <div className="leading-tight">
                <div className="font-serif font-semibold text-lg text-white">ParshWebCraft</div>
                <div className="text-[11px] uppercase tracking-wider text-indigo-400">Web Agency</div>
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
                      "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/10 text-white border-r-2 border-indigo-500"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
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
                      "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/10 text-white border-r-2 border-indigo-500"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )
                  }
                >
                  <UserCog className="h-4 w-4" /> Team
                </NavLink>
              )}
            </nav>
            <div className="border-t border-white/10 p-4 shrink-0">
              <div className="text-sm font-medium text-white">{user?.name}</div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-indigo-400">{user?.role}</div>
              <Button
                data-testid="logout-btn"
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
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
              className="md:hidden fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
          )}

          {/* Main */}
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="hidden md:flex items-center justify-end gap-3 h-14 px-6 glass-header text-slate-200 shrink-0">
              <Bell className="h-4 w-4 text-slate-400 hover:text-white cursor-pointer transition-colors" />
              <span className="text-sm text-slate-300">
                Welcome, <span className="font-semibold text-white">{user?.name?.split(" ")[0]}</span>
              </span>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1 z-10">{children}</div>
          </main>
        </div>
      </div>

      <InstallPrompt />
      <CrmDialer />
    </div>
  );
}
