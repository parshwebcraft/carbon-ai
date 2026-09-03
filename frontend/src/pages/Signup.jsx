import { useState, useEffect } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Signup() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.body.classList.add("dark-theme");
  }, []);
  const [company, setCompany] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register(name, email, password);
      nav("/dashboard");
    } catch (e) {
      setErr(errMsg(e, "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070814] flex flex-col md:flex-row relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Left panel - Motto & Branding (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-950/40 to-slate-950/60 p-12 lg:p-20 flex-col justify-between border-r border-white/5 relative z-10">
        <div className="flex items-center gap-2.5">
          <img src="/images/logo-navbar.png" alt="ParshWebCraft Logo" className="h-7 object-contain" />
          <span className="font-serif font-semibold text-xl tracking-tight text-white">ParshWebCraft</span>
        </div>

        <div className="space-y-6 max-w-md">
          <h2 className="font-serif text-4xl lg:text-5xl font-bold leading-tight text-white">
            Automate follow-ups, humanize interactions, close contracts.
          </h2>
          <p className="text-slate-400 leading-relaxed text-base">
            Create an Admin profile for your agency instance to test real-time outbound voice campaigns, automated templates, and AI pipelines.
          </p>
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
              <span>Autonomous AI Voice Agent Calling</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
              <span>AI Copilot & Assist Dialers</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
              <span>Automated WhatsApp Campaigns</span>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-500">
          © 2026 ParshWebCraft. Next-gen Sales Pipelines.
        </div>
      </div>

      {/* Right panel - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/images/logo-navbar.png" alt="ParshWebCraft Logo" className="h-6 object-contain" />
              <span className="font-serif font-semibold text-lg text-white">ParshWebCraft</span>
            </div>
            <Link to="/" className="text-sm text-indigo-400 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
          </div>

          <div>
            <Link to="/" className="hidden md:inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-6">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <h1 className="text-3xl font-serif font-bold text-white">Create Admin Account</h1>
            <p className="text-sm text-slate-400 mt-2">Get started with your digital agency CRM workspace today.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name" type="text" required placeholder="John Doe"
                value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="company">Agency Name</Label>
              <Input
                id="company" type="text" required placeholder="XYZ Digital"
                value={company} onChange={(e) => setCompany(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email" type="email" required placeholder="john@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" type="password" required placeholder="••••••••"
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
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
