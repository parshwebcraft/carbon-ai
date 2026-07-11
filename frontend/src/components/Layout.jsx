import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ListTodo, Phone, MessageCircle,
  CalendarCheck2, FileText, Bot, UserCog, LogOut, Menu, X, Bell, PhoneCall, Sparkles, Briefcase,
  Sun, Moon,
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
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved !== null ? saved === "dark" : true;
  });

  useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <div className={cn("min-h-screen relative overflow-x-hidden transition-colors duration-300", isDark ? "text-slate-100" : "text-slate-900")}>
      {isDark && <StarryBackground />}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className={cn(
          "md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 transition-colors duration-300",
          isDark ? "glass-header text-slate-100" : "bg-white border-b border-indigo-100 text-slate-900"
        )}>
          <button
            data-testid="mobile-menu-toggle"
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
            className="p-2"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2 font-serif font-semibold text-lg">
            <Briefcase className={cn("h-5 w-5", isDark ? "text-indigo-400" : "text-indigo-700")} /> ParshWebCraft CRM
          </Link>
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
          </button>
        </header>

        <div className="flex flex-1">
          {/* Sidebar */}
          <aside
            data-testid="sidebar"
            className={cn(
              "fixed md:sticky md:top-0 z-40 md:z-auto h-screen w-64 shrink-0 flex flex-col transition-all duration-300",
              isDark ? "glass-sidebar text-slate-100" : "bg-white border-r border-indigo-100 text-slate-900",
              "transition-transform duration-200",
              open ? "translate-x-0 flex" : "-translate-x-full md:translate-x-0 md:flex hidden md:flex"
            )}
          >
            <div className={cn("px-5 h-16 flex items-center gap-2 shrink-0 border-b transition-colors duration-300", isDark ? "border-white/10" : "border-indigo-100")}>
              <Briefcase className={cn("h-6 w-6", isDark ? "text-indigo-400" : "text-indigo-700")} />
              <div className="leading-tight">
                <div className={cn("font-serif font-semibold text-lg", isDark ? "text-white" : "text-slate-900")}>ParshWebCraft</div>
                <div className={cn("text-[11px] uppercase tracking-wider", isDark ? "text-indigo-400" : "text-indigo-700")}>Web Agency</div>
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
                      "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors duration-200",
                      isActive
                        ? isDark
                          ? "bg-white/10 text-white border-r-2 border-indigo-500"
                          : "bg-indigo-50 text-indigo-900 border-r-2 border-indigo-700"
                        : isDark
                          ? "text-slate-400 hover:text-white hover:bg-white/5"
                          : "text-slate-700 hover:bg-indigo-50/60"
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
                      "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors duration-200",
                      isActive
                        ? isDark
                          ? "bg-white/10 text-white border-r-2 border-indigo-500"
                          : "bg-indigo-50 text-indigo-900 border-r-2 border-indigo-700"
                        : isDark
                          ? "text-slate-400 hover:text-white hover:bg-white/5"
                          : "text-slate-700 hover:bg-indigo-50/60"
                    )
                  }
                >
                  <UserCog className="h-4 w-4" /> Team
                </NavLink>
              )}
            </nav>
            <div className={cn("p-4 shrink-0 border-t transition-colors duration-300", isDark ? "border-white/10" : "border-indigo-100")}>
              <div className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>{user?.name}</div>
              <div className={cn("text-xs truncate", isDark ? "text-slate-400" : "text-slate-500")}>{user?.email}</div>
              <div className={cn("mt-1 text-[11px] uppercase tracking-wider", isDark ? "text-indigo-400" : "text-indigo-700")}>{user?.role}</div>
              <Button
                data-testid="logout-btn"
                variant="ghost"
                size="sm"
                className={cn(
                  "mt-3 w-full justify-start transition-colors duration-200",
                  isDark
                    ? "text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
                    : "text-slate-700 hover:text-rose-700 hover:bg-rose-50"
                )}
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
            <div className={cn(
              "hidden md:flex items-center justify-end gap-4 h-14 px-6 transition-colors duration-300 shrink-0",
              isDark ? "glass-header text-slate-200" : "bg-white border-b border-indigo-100 text-slate-700"
            )}>
              <button
                onClick={() => setIsDark(!isDark)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-indigo-50 text-slate-500 hover:text-indigo-700"
                )}
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
              </button>
              <Bell className={cn("h-4 w-4 cursor-pointer transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-indigo-700")} />
              <span className="text-sm">
                Welcome, <span className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>{user?.name?.split(" ")[0]}</span>
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
