import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const plan = params.get("plan") || "selected";

  return (
    <div className="min-h-screen bg-[#070814] text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/30 p-8 text-center backdrop-blur-md">
        <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto" />
        <h1 className="mt-5 font-serif text-3xl font-bold text-white">Payment Successful</h1>
        <p className="mt-3 text-slate-400">
          Your {plan} plan payment has been verified. Our team will activate your AI calling workspace shortly.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login">
            <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
              Sign In
            </Button>
          </Link>
          <Link to="/">
            <Button className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/10">
              Back Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

