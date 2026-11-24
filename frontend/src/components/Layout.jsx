import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ListTodo, Phone, MessageCircle,
  CalendarCheck2, FileText, Bot, UserCog, LogOut, Menu, X, Bell, PhoneCall, Sparkles, Briefcase,
  Sun, Moon, Cpu, GitBranch, Layers, History, Plug, Sliders, Columns,
  CreditCard, Smartphone, Key, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallPrompt from "@/components/InstallPrompt";
import CrmDialer from "@/components/CrmDialer";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/campaigns", label: "Campaigns", icon: Send, badge: "AI" },
  { to: "/whatsapp",  label: "WhatsApp",   icon: MessageCircle },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/copilot",   label: "AI Copilot", icon: Sparkles },
  { to: "/kanban",    label: "Kanban",     icon: Columns },
  { to: "/wa-meta-manual", label: "Meta API Keys", icon: Key },

  { to: "/products", label: "Services", icon: Briefcase },
  { to: "/appointments", label: "Appointments", icon: CalendarCheck2 },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/ai-logs", label: "AI Agent", icon: Bot },
];

const AUTOMATION_NAV = [
  { to: "/automation", label: "Automation Dashboard", icon: Cpu, end: true },
  { to: "/automation/builder", label: "Workflow Builder", icon: GitBranch },
  { to: "/automation/templates", label: "Workflow Templates", icon: Layers },
  { to: "/automation/logs", label: "Automation Logs", icon: History },
  { to: "/automation/integrations", label: "Connected Integrations", icon: Plug },
  { to: "/automation/settings", label: "Automation Settings", icon: Sliders },
];

const GROWTH_NAV = [
  { to: "/campaigns", label: "Campaigns", icon: Send, badge: "LIVE" },
  { to: "/growth?tab=agents", label: "AI Agents", icon: Bot, badge: "NEW" },
  { to: "/growth?tab=templates", label: "Create Template", icon: Smartphone },
  { to: "/growth?tab=payments", label: "Payment Links", icon: CreditCard },
  { to: "/growth?tab=apps", label: "Apps", icon: Plug },
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
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved !== null ? saved === "dark" : true;
  });

  useEffect(() => {
    if (user && user.onboarding_completed === false && location.pathname !== "/onboarding") {
      nav("/onboarding");
    }
  }, [user, location.pathname, nav]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark", "dark-theme");
      localStorage.setItem("theme", "dark");
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0A111C');
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark", "dark-theme");
      localStorage.setItem("theme", "light");
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#4F46E5');
    }
  }, [isDark]);

  return (
    <div className={cn("h-screen w-screen overflow-hidden flex flex-col transition-colors duration-300", isDark ? "text-slate-100" : "text-slate-900")}>
      {isDark && <StarryBackground />}

      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Mobile topbar */}
        <header className={cn(
          "md:hidden shrink-0 z-30 flex items-center justify-between px-4 h-14 transition-colors duration-300",
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
          <Link to="/dashboard" className="flex items-center gap-2 font-serif font-semibold text-lg">
            <img src="/images/ParshAgent_icon_only.png" alt="ParshAgent Logo" className="h-7 w-auto object-contain mr-1" /> ParshAgent
          </Link>
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
          </button>
        </header>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside
            data-testid="sidebar"
            className={cn(
              "fixed md:static inset-y-0 left-0 z-40 md:z-auto h-full w-64 shrink-0 flex flex-col transition-all duration-300",
              isDark ? "glass-sidebar text-slate-100" : "bg-white border-r border-indigo-100 text-slate-900",
              "transition-transform duration-200",
              open ? "translate-x-0 flex" : "-translate-x-full md:translate-x-0 md:flex hidden md:flex"
            )}
          >
            <div className={cn("px-4 h-16 flex items-center gap-3 shrink-0 border-b transition-colors duration-300", isDark ? "border-white/10" : "border-indigo-100")}>
              <img src="/images/ParshAgent_icon_only.png" alt="ParshAgent Logo" className="h-8 w-8 object-contain shrink-0" />
              <div className="leading-tight overflow-hidden">
                <div className={cn("font-serif font-semibold text-sm truncate max-w-[155px]", isDark ? "text-white" : "text-slate-900")}>
                  {user?.company_name || "ParshAgent"}
                </div>
                <div className={cn("text-[10px] uppercase tracking-wider font-medium truncate", isDark ? "text-indigo-400" : "text-indigo-700")}>
                  {user?.role || "Admin"} • Workspace
                </div>
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
                      "flex items-center justify-between px-5 py-2.5 text-sm font-medium transition-colors duration-200",
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
                  <div className="flex items-center gap-3">
                    <n.icon className="h-4 w-4" /> {n.label}
                  </div>
                  {n.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300/40">
                      {n.badge}
                    </span>
                  )}
                </NavLink>
              ))}

              {/* AI & Growth Suite (Inspired by Alpha CRM) */}
              <div className={cn("px-5 py-2 text-[10px] font-bold uppercase tracking-wider mt-4 flex items-center justify-between", isDark ? "text-emerald-400" : "text-emerald-700")}>
                <span>AI & Growth</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">PRO</span>
              </div>
              {GROWTH_NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => {
                    const currentSearch = window.location.search;
                    const currentPath = window.location.pathname;
                    const isMatch = currentPath === "/growth" && n.to.includes(currentSearch || "tab=agents");
                    return cn(
                      "flex items-center justify-between px-5 py-2 text-sm font-medium transition-colors duration-200",
                      isMatch
                        ? isDark
                          ? "bg-white/10 text-white border-r-2 border-emerald-500"
                          : "bg-emerald-50 text-emerald-900 border-r-2 border-emerald-700"
                        : isDark
                          ? "text-slate-400 hover:text-white hover:bg-white/5"
                          : "text-slate-700 hover:bg-emerald-50/60"
                    );
                  }}
                >
                  <div className="flex items-center gap-3">
                    <n.icon className="h-4 w-4" /> {n.label}
                  </div>
                  {n.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                      {n.badge}
                    </span>
                  )}
                </NavLink>
              ))}

              {/* Automation Section */}
              <div className={cn("px-5 py-2 text-[10px] font-bold uppercase tracking-wider mt-4", isDark ? "text-indigo-400/80" : "text-indigo-700/80")}>
                Automation
              </div>
              {AUTOMATION_NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-5 py-2 text-sm font-medium transition-colors duration-200",
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
          <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
            <div className={cn(
              "hidden md:flex items-center justify-end gap-4 h-14 px-6 transition-colors duration-300 shrink-0 border-b",
              isDark ? "glass-header text-slate-200" : "bg-white border-indigo-100 text-slate-700"
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
            <div className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 lg:p-8 max-w-7xl w-full mx-auto z-10 min-w-0",
              location.pathname === "/whatsapp" && "flex flex-col overflow-hidden p-1.5 sm:p-3 lg:p-4 h-full"
            )}>
              {children}
            </div>
          </main>
        </div>
      </div>

      <InstallPrompt />
      <CrmDialer />
    </div>
  );
}
