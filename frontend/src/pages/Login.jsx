import { useState, useEffect } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import SEO from "@/components/SEO";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    document.body.classList.add("dark-theme");
  }, []);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (e) {
      setErr(errMsg(e, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070814] flex flex-col md:flex-row relative overflow-hidden">
      <SEO 
        title="Sign In to Your Sales Workspace | ParshAgent AI CRM"
        description="Access your ParshAgent CRM dashboard to manage AI calling campaigns, WhatsApp pipelines, customer leads, and automated sales workflows."
        canonical="https://parshagent.com/login"
      />
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Left panel - Motto & Branding (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-950/40 to-slate-950/60 p-12 lg:p-20 flex-col justify-between border-r border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <img src="/images/ParshAgent_icon_only.png" alt="ParshAgent Logo" className="h-9 w-auto object-contain" />
          <span className="font-serif font-semibold text-2xl tracking-tight text-white">ParshAgent</span>
        </div>

        <div className="space-y-6 max-w-md">
          <h2 className="font-serif text-4xl lg:text-5xl font-bold leading-tight text-white">
            Automate follow-ups, humanize interactions, close contracts.
          </h2>
          <p className="text-slate-400 leading-relaxed text-base">
            Power your sales team with autonomous callers, smart analytics, and interactive campaign pacing.
          </p>
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
              <span>Autonomous AI Voice Agent Calling (Hinglish/Hindi)</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
              <span>Meta WhatsApp Cloud Embedded Signup</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
              <span>Dedicated Multi-Tenant Private Workspace</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-500">
          © 2026 ParshAgent by ParshWebCraft. Next-gen Sales Pipelines.
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/images/ParshAgent_icon_only.png" alt="ParshAgent Logo" className="h-7 w-auto object-contain" />
              <span className="font-serif font-semibold text-lg text-white">ParshAgent</span>
            </div>
            <Link to="/" className="text-sm text-indigo-400 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
          </div>

          <div>
            <Link to="/" className="hidden md:inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-6">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <h1 className="text-3xl font-serif font-bold text-white">Sign In</h1>
            <p className="text-sm text-slate-400 mt-2">Sign in to your agency sales workspace to access calling campaigns.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" autoComplete="email" required
                placeholder="name@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" type="password" autoComplete="current-password" required
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>

            {err && (
              <div className="text-sm text-rose-300 bg-rose-950/20 border border-rose-900/50 rounded-lg px-3 py-2">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 text-base mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
