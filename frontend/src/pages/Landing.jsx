import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Briefcase, Sparkles, PhoneCall, Bot, MessageCircle, 
  CheckCircle2, ArrowRight, ShieldCheck, Zap, Menu, X, Mail, Phone, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import PricingLeadCaptureModal from "@/components/PricingLeadCaptureModal";

const checkoutPlans = {
  starter: "Starter",
  growth: "Growth",
  business: "Business / Professional",
};

function loadRazorpayCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showPricingLeadModal, setShowPricingLeadModal] = useState(false);
  const [pricingLeadPlan, setPricingLeadPlan] = useState("custom");
  const [paymentLoading, setPaymentLoading] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [quoteForm, setQuoteForm] = useState({ name: "", email: "", company: "", requirements: "" });
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    document.body.classList.add("dark-theme");
  }, []);

  const handleQuoteSubmit = (e) => {
    e.preventDefault();
    // Simply mock success
    setQuoteSuccess(true);
    setTimeout(() => {
      setShowQuoteModal(false);
      setQuoteSuccess(false);
      setQuoteForm({ name: "", email: "", company: "", requirements: "" });
    }, 2000);
  };

  const openContactSales = (planId) => {
    setPricingLeadPlan(planId);
    setShowPricingLeadModal(true);
  };

  const startCheckout = async (planId) => {
    setPaymentLoading(planId);
    setPaymentError("");
    try {
      await loadRazorpayCheckout();
      const { data } = await api.post("/payments/create-order", { plan_id: planId });
      const razorpay = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "ParshCall AI",
        description: data.description,
        order_id: data.order_id,
        theme: { color: "#4f46e5" },
        handler: async (response) => {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentLoading("");
            nav(`/payment-success?plan=${encodeURIComponent(checkoutPlans[planId])}`);
          } catch (err) {
            setPaymentLoading("");
            setPaymentError(err?.response?.data?.detail || "Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading("");
            setPaymentError("Checkout was cancelled. You can try again whenever you are ready.");
          },
        },
      });
      razorpay.on("payment.failed", (response) => {
        setPaymentLoading("");
        setPaymentError(response?.error?.description || "Payment failed. Please try again.");
      });
      razorpay.open();
    } catch (err) {
      setPaymentLoading("");
      setPaymentError(err?.response?.data?.detail || err.message || "Could not start checkout. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#070814] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#070814]/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo-navbar.png" alt="ParshWebCraft Logo" className="h-7 object-contain" />
            <span className="font-serif font-semibold text-xl tracking-tight text-white">ParshWebCraft</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Button 
              onClick={() => setShowQuoteModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5"
            >
              Get Quote
            </Button>
            <Link to="/signup">
              <Button className="bg-white/10 hover:bg-white/20 text-white rounded-full px-5 border border-white/10">
                Sign Up
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-6 bg-[#070814]/95 border-b border-white/10 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">Features</a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">Services</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">Pricing</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">About</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">Contact</a>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-center py-2 text-slate-300">
                Sign In
              </Link>
              <Button onClick={() => { setMobileMenuOpen(false); setShowQuoteModal(true); }} className="w-full bg-indigo-600 text-white">
                Get Quote
              </Button>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-white/10 text-white border border-white/10">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 lg:pt-32 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-xs text-indigo-400 font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Next-Gen AI Lead Engagement CRM
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Empower Your Sales with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300">Autonomous AI Callers</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ParshWebCraft CRM orchestrates automated voice campaigns, AI Copilot assisted chats, and smart pipelines tailored for digital agencies and high-growth teams.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-base px-8 py-6 rounded-full flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              onClick={() => setShowQuoteModal(true)}
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white text-base px-8 py-6 rounded-full border border-white/10"
            >
              Get Custom Quote
            </Button>
          </div>

          {/* Glassmorphic Dashboard Preview */}
          <div className="mt-16 sm:mt-24 max-w-5xl mx-auto rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-xl shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-2xl filter blur-xl opacity-30 z-0 pointer-events-none" />
            <div className="relative z-10 rounded-xl overflow-hidden border border-white/5 shadow-inner">
              <div className="bg-slate-950/80 px-4 py-2 border-b border-white/5 flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/70" />
                <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <div className="w-1/3 bg-white/5 rounded h-4 mx-auto" />
              </div>
              <div className="bg-slate-950/50 aspect-[16/9] flex items-center justify-center p-8">
                <div className="text-center space-y-4 max-w-md">
                  <img src="/images/logo-main.png" alt="ParshWebCraft Logo" className="h-16 object-contain mx-auto animate-pulse" />
                  <h3 className="text-xl font-semibold text-white">ParshWebCraft CRM Workspace</h3>
                  <p className="text-sm text-slate-400">
                    Real-time dashboard mapping lead generation, automated voice campaign logging, and AI sales pipelines.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Powerful CRM Built for Scale</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Equip your sales ecosystem with features that automate follow-ups, qualify leads, and close deals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 backdrop-blur-md hover:border-white/10 hover:bg-white/10 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <PhoneCall className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Outbound Caller</h3>
              <p className="text-slate-400 leading-relaxed">
                Configure multilingual voices like Elliot (v2) to automatically call web agency leads in fluid Hinglish and convert them.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 backdrop-blur-md hover:border-white/10 hover:bg-white/10 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Sales Copilot</h3>
              <p className="text-slate-400 leading-relaxed">
                Real-time suggestion agent analyzing conversation history to output high-converting replies for active calls and chats.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 backdrop-blur-md hover:border-white/10 hover:bg-white/10 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">WhatsApp Pipelines</h3>
              <p className="text-slate-400 leading-relaxed">
                Connect your WhatsApp API to instantly trigger follow-up templates, log logs, and support multiple leads concurrently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-slate-950/40 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Full-Suite CRM Services</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              We help you integrate, customize, and optimize the AI workflow for your team's specific requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex gap-4">
                <Zap className="h-6 w-6 text-indigo-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Custom AI Model Training</h3>
                  <p className="text-slate-400 mt-1">We configure and fine-tune OpenAI and Deepgram models to fit your specific services, products, and speech accents.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <ShieldCheck className="h-6 w-6 text-indigo-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Voice & Telephony Architecture</h3>
                  <p className="text-slate-400 mt-1">Full outbound calling setup, custom phone number routing, and intelligent AI dialer settings tailored out-of-the-box.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-6 w-6 text-indigo-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Lead Generation Automations</h3>
                  <p className="text-slate-400 mt-1">Automatically sync leads from Facebook Ads, Google Sheets, or web forms directly into the CRM pipeline.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#070814]/60 p-8 backdrop-blur-xl space-y-6">
              <h3 className="text-2xl font-serif font-bold text-white">Why Digital Agencies Choose ParshWebCraft?</h3>
              <p className="text-slate-300 leading-relaxed">
                "Our agency CRM solved the follow-up bottleneck. The AI voice agent calls leads within 2 minutes of form submission, scheduling discovery calls automatically."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-600/30 flex items-center justify-center font-bold text-indigo-400">P</div>
                <div>
                  <div className="font-semibold text-white">ParshWebCraft Lead Team</div>
                  <div className="text-xs text-slate-500">Sales Operations</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Choose an AI calling plan built around monthly voice minutes, workflow automations, and support channels.
            </p>
          </div>

          {paymentError && (
            <div className="mb-6 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {paymentError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {/* Plan 1: Starter */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-300">Starter</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">₹9,999</span>
                  <span className="ml-1 text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">Perfect for small businesses starting with AI voice automation.</p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 500 AI Voice Minutes</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> AI Voice Receptionist</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> AI Outbound Calling</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> CRM & Lead Management</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> WhatsApp Business Integration</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> AI Chat Assistant</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Call Recording</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Basic Analytics</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Email Support</li>
                </ul>
              </div>
              <div>
                <p className="mt-4 text-xs text-slate-500 italic text-center">Additional AI Minutes billed separately.</p>
                <Button
                  onClick={() => startCheckout("starter")}
                  disabled={paymentLoading === "starter"}
                  className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-60"
                >
                  {paymentLoading === "starter" ? "Opening..." : "Get Started"}
                </Button>
              </div>
            </div>

            {/* Plan 2: Growth */}
            <div className="rounded-2xl border border-indigo-500/50 bg-indigo-950/20 p-6 backdrop-blur-md flex flex-col justify-between relative">
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">Most Popular</div>
              <div>
                <h3 className="text-lg font-semibold text-indigo-300">Growth</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">₹34,999</span>
                  <span className="ml-1 text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">Built for growing teams running sales and customer support.</p>
                <div className="mt-6 text-xs font-semibold text-indigo-400 tracking-wider uppercase mb-2">Everything in Starter PLUS</div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 2,500 AI Voice Minutes</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Workflow Automation</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Priority WhatsApp Credits</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Team Management</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Advanced Analytics</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> API Access</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Lead Scoring</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Multilingual AI</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Priority Support</li>
                </ul>
              </div>
              <div>
                <Button
                  onClick={() => startCheckout("growth")}
                  disabled={paymentLoading === "growth"}
                  className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
                >
                  {paymentLoading === "growth" ? "Opening..." : "Upgrade Now"}
                </Button>
              </div>
            </div>

            {/* Plan 3: Business / Professional */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-300">Business</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">₹74,999</span>
                  <span className="ml-1 text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">Designed for businesses handling high call volumes across multiple teams.</p>
                <div className="mt-6 text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">Everything in Growth PLUS</div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 6,000 AI Voice Minutes</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> AI Sales Agent</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> AI Customer Support Agent</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Gmail Integration</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Facebook Integration</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Instagram Integration</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Calendar Integration</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Custom Workflows</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Multi-location Management</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Advanced Reports</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> SLA Support</li>
                </ul>
              </div>
              <div>
                <Button
                  onClick={() => startCheckout("business")}
                  disabled={paymentLoading === "business"}
                  className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-60"
                >
                  {paymentLoading === "business" ? "Opening..." : "Get Started"}
                </Button>
              </div>
            </div>

            {/* Plan 4: Enterprise */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-300">Enterprise</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">₹1,49,999</span>
                  <span className="ml-1 text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">Enterprise-grade AI communication platform.</p>
                <div className="mt-6 text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">Everything in Business PLUS</div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 10,000 AI Voice Minutes Included</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Dedicated Infrastructure</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Custom LLM Training</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> White-label Deployment</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Private APIs</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> SSO</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Dedicated Success Manager</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Enterprise Security</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Custom Integrations</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 24×7 Premium Support</li>
                </ul>
              </div>
              <div>
                <Button onClick={() => openContactSales("enterprise")} className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white">Contact Sales</Button>
              </div>
            </div>

            {/* Plan 5: Custom */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-300">Custom</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">Custom</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">For 20,000+ voice minutes or bespoke enterprise services.</p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 20,000+ AI Voice Minutes</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Custom AI Infrastructure</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Unlimited Integrations</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Enterprise Consulting</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Dedicated Onboarding</li>
                  <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Custom Pricing</li>
                </ul>
              </div>
              <div>
                <Button onClick={() => openContactSales("custom")} className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white">Contact Sales</Button>
              </div>
            </div>
          </div>

          {/* Global Pricing Disclaimer Note */}
          <div className="mt-12 text-center text-xs text-slate-500 max-w-4xl mx-auto leading-relaxed border border-white/5 bg-slate-950/20 rounded-xl p-4 backdrop-blur-sm">
            Plans include bundled AI voice minutes. Additional AI voice minutes, telephony charges, WhatsApp conversations, and premium AI model usage are billed based on actual consumption. Enterprise customers can choose custom bundled usage plans.
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-slate-950/40 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Our Motto</h2>
            <p className="text-indigo-400 font-semibold mt-2 text-lg">"Automate follow-ups, humanize interactions, close contracts."</p>
            <p className="mt-6 text-slate-300 leading-relaxed">
              At ParshWebCraft, we believe in bridging the gap between raw AI speed and genuine sales conversations. 
              Our CRM integrates state-of-the-art LLMs, fast speech recognition models, and seamless Webhooks so your business spends time on final contract terms, not manual cold outreach.
            </p>
            <div className="mt-8 flex gap-6">
              <div>
                <div className="text-3xl font-bold text-white">20k+</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Calls Triggered</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">98%</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Accurate STT</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">4x</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Pipeline Growth</div>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full rounded-2xl border border-white/10 overflow-hidden relative aspect-[4/5] md:aspect-[4/3] bg-indigo-950/10 min-h-[350px]">
            <img src="/images/gauransh-founder.png" alt="Gauransh - Founder" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent flex flex-col justify-end p-6 text-left">
              <h3 className="text-xl font-bold text-white">Gauransh</h3>
              <p className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">Founder, ParshWebCraft</p>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                "Our mission is to build highly conversational autonomous software products that accelerate sales for digital agencies worldwide."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Get in Touch</h2>
              <p className="mt-4 text-slate-400 leading-relaxed">
                Have questions about pricing, API integrations, or scheduling custom agency AI setups? Drop us a message.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-slate-300">
                  <Mail className="h-5 w-5 text-indigo-400" />
                  <span>support@parshwebcraft.in</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Phone className="h-5 w-5 text-indigo-400" />
                  <span>+91 95213 47419</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <MapPin className="h-5 w-5 text-indigo-400" />
                  <span>Ahmedabad, Gujarat, India</span>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-8 backdrop-blur-md">
              <form onSubmit={(e) => { e.preventDefault(); alert("Message sent successfully!"); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                  <input type="text" required placeholder="Your Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                  <input type="email" required placeholder="you@company.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Message</label>
                  <textarea rows="4" required placeholder="How can we help you?" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl">Send Message</Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-slate-950/80 relative z-10 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center justify-center gap-2.5">
            <img src="/images/logo-navbar.png" alt="ParshWebCraft Logo" className="h-6 object-contain" />
            <span className="font-serif font-semibold text-lg text-white">ParshWebCraft</span>
          </div>
          <p>© 2026 ParshWebCraft. All rights reserved. Powering agency sales autonomously.</p>
        </div>
      </footer>

      {/* Get Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0d16] p-6 sm:p-8 relative">
            <button 
              onClick={() => setShowQuoteModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-serif text-2xl font-bold text-white mb-2">Request CRM Quote</h3>
            <p className="text-sm text-slate-400 mb-6">Tell us about your agency lead volume and voice caller requirements.</p>
            
            {quoteSuccess ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                <h4 className="text-lg font-semibold text-white">Quote Request Received!</h4>
                <p className="text-sm text-slate-400">Our sales representative will email you in 2 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input type="text" required placeholder="John Doe" 
                    value={quoteForm.name} onChange={e => setQuoteForm({...quoteForm, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Business Email</label>
                  <input type="email" required placeholder="john@agency.com" 
                    value={quoteForm.email} onChange={e => setQuoteForm({...quoteForm, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Agency Name</label>
                  <input type="text" required placeholder="XYZ Digital" 
                    value={quoteForm.company} onChange={e => setQuoteForm({...quoteForm, company: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Requirements / Monthly Calls</label>
                  <textarea rows="3" placeholder="e.g. 5000 voice calls per month, Hinglish..." 
                    value={quoteForm.requirements} onChange={e => setQuoteForm({...quoteForm, requirements: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl mt-2">Submit Request</Button>
              </form>
            )}
          </div>
        </div>
      )}
      <PricingLeadCaptureModal
        open={showPricingLeadModal}
        planId={pricingLeadPlan}
        onClose={() => {
          setShowPricingLeadModal(false);
          setPricingLeadPlan("custom");
        }}
      />
    </div>
  );
}
