import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gem, Loader2 } from "lucide-react";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@facetscrm.com");
  const [password, setPassword] = useState("password123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(errMsg(e, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FBF8F3] to-[#F3E9D7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-100 border border-amber-200">
            <Gem className="h-7 w-7 text-amber-700" />
          </div>
          <h1 className="mt-4 font-serif text-3xl text-slate-900">Facets Lifestyle CRM</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in to your jewellery sales workspace</p>
        </div>
        <form
          data-testid="login-form"
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 sm:p-8"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                data-testid="login-email"
                id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                data-testid="login-password"
                id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            {err && (
              <div data-testid="login-error" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                {err}
              </div>
            )}
            <Button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-amber-700 hover:bg-amber-800 h-11 text-base"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign in
            </Button>
          </div>
          <div className="mt-6 text-xs text-slate-500 text-center">
            Demo admin: <code className="text-slate-700">admin@facetscrm.com</code> / <code className="text-slate-700">password123</code>
          </div>
        </form>
      </div>
    </div>
  );
}
