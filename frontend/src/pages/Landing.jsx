import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Sparkles, PhoneCall, Bot, MessageCircle, 
  CheckCircle2, ArrowRight, ShieldCheck, Zap, Menu, X, Mail, Phone, MapPin,
  Play, Volume2, Calendar, TrendingUp, Clock, FileText, ChevronDown, ChevronUp,
  Layers, Sliders, BarChart3, Star, AlertCircle, Headphones, ArrowUpRight, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import PricingLeadCaptureModal from "@/components/PricingLeadCaptureModal";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";

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

  // Interactive Live Demo Tab State
  const [activeDemoTab, setActiveDemoTab] = useState("voice"); // voice | whatsapp | copilot | crm
  
  // Interactive ROI Calculator State
  const [monthlyLeads, setMonthlyLeads] = useState(350);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const nav = useNavigate();

  useEffect(() => {
    document.body.classList.add("dark-theme");
  }, []);

  const handleQuoteSubmit = (e) => {
    e.preventDefault();
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
        name: "ParshAgent AI",
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

  // ROI Calculations
  const hoursSaved = Math.round(monthlyLeads * 0.35);
  const extraDeals = Math.round(monthlyLeads * 0.08);
  const estimatedRevenueBoost = (extraDeals * 15000).toLocaleString("en-IN");

  const faqs = [
    {
      q: "Can the AI Voice Agent speak in natural Hindi or Hinglish?",
      a: "Yes! ParshAgent's voice models are specifically tuned for Indian business conversations. The agent speaks in fluid Hinglish, Hindi, and English with natural pauses, realistic breathing, and polite conversational tone."
    },
    {
      q: "How fast does ParshAgent call a lead after submission?",
      a: "Within 30 to 60 seconds. Research shows reaching a prospect within 5 minutes increases conversion rates by 391%. ParshAgent dials the moment a lead enters via Facebook Ads, website forms, or webhooks."
    },
    {
      q: "Does it connect to our official WhatsApp Business API?",
      a: "Yes. ParshAgent integrates directly with Meta's official WhatsApp Cloud API. You get a shared team inbox, automatic PDF/brochure dispatch, and automated conversational follow-ups."
    },
    {
      q: "Can human sales representatives take over live calls or chats?",
      a: "Absolutely. At any point, a human rep can jump in. The CRM provides full live transcripts, AI sentiment scoring, and AI Copilot suggestions so your team has complete context."
    },
    {
      q: "How does the pricing and minute billing work?",
      a: "Each plan comes with a generous pool of bundled AI voice minutes. If you exceed your plan's minutes, additional minutes are billed transparently with zero hidden fees."
    }
  ];

  return (
    <div className="min-h-screen bg-[#060713] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      <SEO 
        title="AI CRM & Sales Automation Platform for Indian Businesses | ParshAgent"
        description="ParshAgent is an AI-powered CRM and sales automation platform for Indian businesses. Automate outbound AI voice calls, WhatsApp campaigns, lead pipelines, and customer follow-ups from one platform."
        canonical="https://parshagent.com/"
      />

      {/* Grid background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:32px_32px] opacity-25 pointer-events-none z-0" />

      {/* Background ambient glowing orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-violet-600/10 to-transparent blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[35%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#060713]/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/images/ParshAgent_icon_only.png" alt="ParshAgent AI CRM Logo" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
            <span className="font-serif font-bold text-xl tracking-tight text-white">ParshAgent</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-indigo-400 transition-colors">How It Works</a>
            <a href="#live-demo" className="hover:text-indigo-400 transition-colors">Live Demo</a>
            <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
            <a href="#calculator" className="hover:text-indigo-400 transition-colors">ROI Calculator</a>
            <a href="#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3.5">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Button 
              onClick={() => setShowQuoteModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full px-4 text-xs font-semibold border border-white/10 h-9"
            >
              Get Custom Quote
            </Button>
            <Link to="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 text-xs font-semibold shadow-lg shadow-indigo-600/30 h-9">
                Start Free Trial
              </Button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-3 pb-6 bg-[#060713]/98 border-b border-white/10 space-y-3">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">How It Works</a>
            <a href="#live-demo" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">Live Demo</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">Features</a>
            <a href="#calculator" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">ROI Calculator</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-300">FAQ</a>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-center py-2 text-slate-300">
                Sign In
              </Link>
              <Button onClick={() => { setMobileMenuOpen(false); setShowQuoteModal(true); }} className="w-full bg-white/10 text-white border border-white/10">
                Get Custom Quote
              </Button>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-indigo-600 text-white">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-12 lg:pt-24 lg:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Live Engine Status Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-xs text-indigo-300 font-medium mb-8 backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Autonomous Sales Engine for Indian Businesses</span>
            <span className="text-indigo-400/50">|</span>
            <span className="text-indigo-200">⚡ 60s Lead Response</span>
          </div>

          {/* Core Story Headline */}
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
            Never Lose Another Lead. <br className="hidden sm:inline" />
            Close Deals Faster with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200">Autonomous AI Calling &amp; WhatsApp CRM</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            ParshAgent automatically calls new inquiries in <strong>fluid Hindi &amp; English</strong> within 60 seconds, qualifies their budget, sends instant WhatsApp quotations, and books appointments on your calendar.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-base px-8 py-6 rounded-full flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02]">
                Start 7-Day Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#live-demo" className="w-full sm:w-auto">
              <Button 
                className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white text-base px-8 py-6 rounded-full border border-white/10 flex items-center justify-center gap-2 backdrop-blur-md"
              >
                <Play className="h-4 w-4 text-indigo-400 fill-indigo-400" /> Watch Live Simulation
              </Button>
            </a>
          </div>

          {/* Social Proof Mini Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Official Meta WhatsApp API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Hindi, English &amp; Hinglish AI Voices</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Live Demo Simulation Showcase */}
      <section id="live-demo" className="py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Container Card with Glowing Border */}
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 sm:p-8 backdrop-blur-2xl shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-indigo-500/10 rounded-3xl filter blur-2xl opacity-40 pointer-events-none" />

            {/* Header & Tabs */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                  <Sparkles className="h-3.5 w-3.5" /> Live Product Experience
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">Experience The Autonomous Sales Journey</h3>
              </div>

              {/* Interactive Tabs */}
              <div className="flex flex-wrap gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10">
                <button
                  onClick={() => setActiveDemoTab("voice")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeDemoTab === "voice" 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <PhoneCall className="h-3.5 w-3.5" /> 1. Voice AI Call
                </button>
                <button
                  onClick={() => setActiveDemoTab("whatsapp")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeDemoTab === "whatsapp" 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> 2. WhatsApp Auto-Pilot
                </button>
                <button
                  onClick={() => setActiveDemoTab("copilot")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeDemoTab === "copilot" 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" /> 3. AI Sales Copilot
                </button>
                <button
                  onClick={() => setActiveDemoTab("crm")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeDemoTab === "crm" 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> 4. Live CRM Board
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="relative z-10 pt-6">

              {/* TAB 1: Voice AI Call */}
              {activeDemoTab === "voice" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950/40 to-slate-900/60 rounded-2xl p-6 border border-indigo-500/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse">
                          <PhoneCall className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">Active Call with Rajesh Sharma</div>
                          <div className="text-xs text-emerald-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> In Progress (00:42)
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        ⚡ 640ms Latency
                      </span>
                    </div>

                    {/* Audio Waveform Animation */}
                    <div className="bg-slate-950/80 rounded-xl p-4 flex items-center justify-center gap-1.5 h-16 border border-white/5">
                      <div className="w-1 bg-indigo-400 h-6 rounded-full animate-[bounce_1s_infinite_100ms]" />
                      <div className="w-1 bg-indigo-400 h-10 rounded-full animate-[bounce_1s_infinite_200ms]" />
                      <div className="w-1 bg-violet-400 h-12 rounded-full animate-[bounce_1s_infinite_300ms]" />
                      <div className="w-1 bg-indigo-300 h-8 rounded-full animate-[bounce_1s_infinite_150ms]" />
                      <div className="w-1 bg-violet-400 h-11 rounded-full animate-[bounce_1s_infinite_250ms]" />
                      <div className="w-1 bg-indigo-400 h-7 rounded-full animate-[bounce_1s_infinite_350ms]" />
                      <div className="w-1 bg-indigo-300 h-4 rounded-full animate-[bounce_1s_infinite_200ms]" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-400 block">Sentiment</span>
                        <span className="text-emerald-400 font-semibold">🔥 Hot Lead (94%)</span>
                      </div>
                      <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-400 block">Budget Inquired</span>
                        <span className="text-indigo-300 font-semibold">₹2.5 Lakhs</span>
                      </div>
                    </div>
                  </div>

                  {/* Transcript Preview */}
                  <div className="lg:col-span-7 bg-slate-950/90 rounded-2xl p-5 border border-white/10 space-y-3 font-sans text-sm">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                      <Headphones className="h-4 w-4 text-indigo-400" /> Real-time Hindi/English Live Transcript
                    </div>
                    
                    <div className="space-y-3 text-xs sm:text-sm">
                      <div className="flex gap-3 items-start">
                        <div className="h-6 w-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold shrink-0 text-xs">AI</div>
                        <div className="bg-indigo-950/40 border border-indigo-500/20 p-3 rounded-2xl rounded-tl-sm text-slate-200">
                          "Namaste Rajesh ji! ParshAgent se Kavya baat kar rahi hu. Aapne hamare Solar Installation solutions ke regarding inquire kiya tha?"
                        </div>
                      </div>

                      <div className="flex gap-3 items-start justify-end">
                        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tr-sm text-slate-200 text-right">
                          "Haan, hume 5kW system lagwana hai apne warehouse ke liye. Budget around ₹2.5 Lakhs hai."
                        </div>
                        <div className="h-6 w-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold shrink-0 text-xs">R</div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="h-6 w-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold shrink-0 text-xs">AI</div>
                        <div className="bg-indigo-950/40 border border-indigo-500/20 p-3 rounded-2xl rounded-tl-sm text-slate-200">
                          "Perfect Rajesh ji! Hamare paas subsidy benefit ke sath ready options hain. Main aapko WhatsApp par complete estimate bhej kar kal 3 PM meeting schedule kar rahi hu."
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WhatsApp Auto-Pilot */}
              {activeDemoTab === "whatsapp" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-5 space-y-4">
                    <h4 className="text-lg font-semibold text-white">Instant Omnichannel Dispatch</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      While the call concludes, ParshAgent triggers the official WhatsApp Business API to deliver tailored brochures, meeting confirmations, and payment links immediately.
                    </p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Auto-generates personalized PDF quote</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Syncs direct Google Calendar &amp; Zoom link</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Multi-agent shared team chat inbox</li>
                    </ul>
                  </div>

                  {/* Simulated WhatsApp Phone Frame */}
                  <div className="lg:col-span-7 bg-[#0b141a] rounded-2xl border border-emerald-500/20 p-5 space-y-3 font-sans shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">P</div>
                        <div>
                          <div className="font-semibold text-white text-xs">ParshAgent Verified Business</div>
                          <div className="text-[10px] text-emerald-400">Official WhatsApp Cloud API</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">10:42 AM</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="bg-[#1f2c34] p-3 rounded-xl max-w-[85%] text-slate-100 space-y-2">
                        <p>Namaste Rajesh ji! 🙏 Call par discuss karne ke liye dhanyawad.</p>
                        <div className="bg-[#111b21] p-2.5 rounded-lg border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-emerald-400" />
                            <div>
                              <div className="font-semibold text-white text-xs">5kW_Solar_Quotation.pdf</div>
                              <div className="text-[10px] text-slate-400">1.4 MB • Customized for Rajesh Sharma</div>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-300">Aapki discovery meeting <strong>Tomorrow @ 3:00 PM</strong> confirm ho gayi hai.</p>
                      </div>

                      <div className="flex gap-2">
                        <span className="bg-[#1f2c34] text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/20">
                          ✅ Confirm Time
                        </span>
                        <span className="bg-[#1f2c34] text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10">
                          📅 Reschedule
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AI Sales Copilot */}
              {activeDemoTab === "copilot" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-5 space-y-4">
                    <h4 className="text-lg font-semibold text-white">Live In-Call Whisper Intelligence</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      When your human reps take complex enterprise calls, AI Copilot listens in real time, detects customer hesitation, and displays immediate winning objection battlecards.
                    </p>
                    <div className="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-xl text-xs space-y-1">
                      <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-indigo-400" /> Objection Detected: "Pricing seems high"
                      </span>
                      <p className="text-slate-300">AI dynamically suggested: "Highlight Gujarat State Solar Subsidy of ₹78,000 to drop upfront costs."</p>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-slate-950/80 rounded-2xl p-5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                      <span className="text-slate-400 font-semibold uppercase">AI Copilot HUD</span>
                      <span className="text-emerald-400 font-medium">Listening to Call #1042</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-xl">
                        <div className="text-xs font-semibold text-indigo-300 mb-1">🎯 Live Pitch Suggestion</div>
                        <p className="text-xs text-slate-200">"Customer wants faster deployment. Mention our 7-day turnaround guarantee in Ahmedabad &amp; Surat."</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <span className="text-slate-400 block text-[11px]">Customer Intent</span>
                          <span className="text-emerald-400 font-semibold">92% Ready to Buy</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <span className="text-slate-400 block text-[11px]">Recommended Action</span>
                          <span className="text-indigo-300 font-semibold">Send Payment Link</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Live CRM Board */}
              {activeDemoTab === "crm" && (
                <div className="bg-slate-950/80 rounded-2xl p-5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white text-sm">Automated Sales Pipeline</h4>
                      <p className="text-xs text-slate-400">Leads categorized and moved automatically by AI voice &amp; chat outcomes.</p>
                    </div>
                    <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                      ⚡ 14 New Leads Auto-Qualified Today
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center justify-between font-semibold text-slate-300">
                        <span>New Inquiries (4)</span>
                        <span className="text-slate-500">60s Queue</span>
                      </div>
                      <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 space-y-1">
                        <div className="font-semibold text-white">Amit Patel • Ahmedabad</div>
                        <div className="text-[11px] text-slate-400">Solar Commercial • FB Lead Form</div>
                        <div className="text-[10px] text-indigo-400">Calling in 12s...</div>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-xl border border-indigo-500/30 space-y-2">
                      <div className="flex items-center justify-between font-semibold text-indigo-300">
                        <span>AI Qualified (8)</span>
                        <span className="text-indigo-400">🔥 Hot</span>
                      </div>
                      <div className="bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-500/20 space-y-1">
                        <div className="font-semibold text-white">Rajesh Sharma • Surat</div>
                        <div className="text-[11px] text-slate-300">Budget: ₹2.5L • Quote Dispatched</div>
                        <div className="text-[10px] text-emerald-400">Meeting Tomorrow @ 3 PM</div>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between font-semibold text-emerald-300">
                        <span>Deals Closing (6)</span>
                        <span className="text-emerald-400">₹8.4L Pipeline</span>
                      </div>
                      <div className="bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/20 space-y-1">
                        <div className="font-semibold text-white">Vikram Mehta • Vadodara</div>
                        <div className="text-[11px] text-slate-300">Payment Invoice Sent via WhatsApp</div>
                        <div className="text-[10px] text-emerald-300">Advance Paid via Razorpay</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* The Pain vs The Autonomous Solution (Why You Need This) */}
      <section id="how-it-works" className="py-20 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              <TrendingUp className="h-3.5 w-3.5" /> The High-Conversion Advantage
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Why Manual Follow-Ups Are Killing Your Sales
            </h2>
            <p className="mt-4 text-slate-400">
              In India, 68% of customers buy from the vendor who reaches out first. See how ParshAgent transforms lead conversion:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* The Old Broken Way */}
            <div className="rounded-3xl border border-rose-500/20 bg-rose-950/10 p-8 backdrop-blur-md space-y-6">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertCircle className="h-6 w-6 shrink-0" />
                <h3 className="text-xl font-semibold">The Traditional Broken Way</h3>
              </div>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>Leads sit in Excel sheets for 4 to 8 hours before a rep dials.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>Over 50% of outbound calls go to voicemail and are never retried.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>Sales reps spend 3 hours daily manually drafting WhatsApp messages.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>High sales rep turnover and inconsistent script delivery.</span>
                </li>
              </ul>
            </div>

            {/* The ParshAgent Autonomous Way */}
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/15 p-8 backdrop-blur-md space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-emerald-500/30 uppercase tracking-wider">
                4x Higher Conversion
              </div>
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <h3 className="text-xl font-semibold">The ParshAgent Autonomous Engine</h3>
              </div>
              <ul className="space-y-4 text-sm text-slate-200">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Instant 60-second AI Voice Call</strong> in fluid Hinglish / Hindi / English.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Zero-Drop Cadence</strong>: Auto-retries unanswered calls at smart intervals.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Instant WhatsApp Quotation</strong> &amp; Calendar meeting booking on autopilot.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>100% Consistent Pitch</strong> trained on your exact business knowledge.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI & Lead Impact Calculator */}
      <section id="calculator" className="py-20 bg-slate-950/40 border-t border-white/10 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              <Sliders className="h-3.5 w-3.5" /> Interactive Calculator
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">Calculate Your Estimated Revenue Boost</h2>
            <p className="mt-3 text-slate-400 text-sm">See how much time and revenue ParshAgent can unlock for your sales team.</p>
          </div>

          <div className="bg-[#0b0c19] border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-semibold text-slate-300">Monthly Inbound Leads Generated</label>
                <span className="text-2xl font-bold text-indigo-400">{monthlyLeads} leads/mo</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="3000" 
                step="50"
                value={monthlyLeads}
                onChange={(e) => setMonthlyLeads(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>50 leads</span>
                <span>1,500 leads</span>
                <span>3,000+ leads</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/10 text-center">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <div className="text-xs text-slate-400 uppercase font-semibold">Rep Hours Saved / Mo</div>
                <div className="text-3xl font-bold text-white mt-2">~{hoursSaved} hrs</div>
                <div className="text-[11px] text-slate-500 mt-1">Freeing up team for hot negotiations</div>
              </div>

              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <div className="text-xs text-slate-400 uppercase font-semibold">Lead Response Time</div>
                <div className="text-3xl font-bold text-emerald-400 mt-2">45 Seconds</div>
                <div className="text-[11px] text-slate-500 mt-1">Down from 4.5 hour manual average</div>
              </div>

              <div className="bg-indigo-950/40 p-5 rounded-2xl border border-indigo-500/30">
                <div className="text-xs text-indigo-300 uppercase font-semibold">Est. Extra Closed Deals</div>
                <div className="text-3xl font-bold text-indigo-300 mt-2">+{extraDeals} Deals</div>
                <div className="text-[11px] text-indigo-400/80 mt-1">~₹{estimatedRevenueBoost} monthly impact</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Suite Features Grid */}
      <section id="features" className="py-20 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Full-Suite AI CRM Capabilities</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Everything your business needs to scale lead qualification, telephony, and customer communications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 backdrop-blur-md hover:border-indigo-500/30 hover:bg-white/[0.07] transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <PhoneCall className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Outbound Voice Calling</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Deploy conversational AI voice agents to call customer leads in natural English and fluid Hinglish, answer questions, and qualify prospects automatically.
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 backdrop-blur-md hover:border-indigo-500/30 hover:bg-white/[0.07] transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">WhatsApp Cloud CRM</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Official Meta WhatsApp API integration. Trigger automated templates, dispatch quotations, and let your entire team collaborate from a unified shared inbox.
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 backdrop-blur-md hover:border-indigo-500/30 hover:bg-white/[0.07] transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Sales Copilot</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Real-time suggestion engine analyzing live calls and chat history to output winning objection responses and pitch suggestions for human reps.
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 backdrop-blur-md hover:border-indigo-500/30 hover:bg-white/[0.07] transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Automated Appointments</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Let AI check available calendar slots during live calls and book discovery meetings straight into Google Calendar with automated WhatsApp reminders.
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 backdrop-blur-md hover:border-indigo-500/30 hover:bg-white/[0.07] transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Visual Workflow Automation</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Set up automated follow-up sequences, task assignments, manager alerts, and webhook triggers with zero coding required.
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 backdrop-blur-md hover:border-indigo-500/30 hover:bg-white/[0.07] transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Conversation Analytics</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Automatic audio recording, full STT transcripts, sentiment breakdown, and lead scoring (Cold, Warm, Hot) on every single customer interaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-950/40 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Choose an AI calling plan built around monthly voice minutes, workflow automations, and support channels.
            </p>
          </div>

          {paymentError && (
            <div className="mb-6 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 text-center">
              {paymentError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {/* Starter */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-300">Starter</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">₹9,999</span>
                  <span className="ml-1 text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">For small businesses starting with AI voice calling.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 500 AI Voice Minutes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> AI Voice Receptionist</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Outbound AI Calling</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> WhatsApp Integration</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Call Recording &amp; STT</li>
                </ul>
              </div>
              <Button
                onClick={() => startCheckout("starter")}
                disabled={paymentLoading === "starter"}
                className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white text-xs h-10"
              >
                {paymentLoading === "starter" ? "Opening..." : "Get Started"}
              </Button>
            </div>

            {/* Growth */}
            <div className="rounded-2xl border border-indigo-500/50 bg-indigo-950/20 p-6 backdrop-blur-md flex flex-col justify-between relative">
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Most Popular</div>
              <div>
                <h3 className="text-lg font-semibold text-indigo-300">Growth</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">₹34,999</span>
                  <span className="ml-1 text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">For growing teams running high-volume sales outreach.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 2,500 AI Voice Minutes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Full Workflow Automation</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> WhatsApp Shared Inbox</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> AI Sales Copilot</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Priority Telephony Routing</li>
                </ul>
              </div>
              <Button
                onClick={() => startCheckout("growth")}
                disabled={paymentLoading === "growth"}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-10 shadow-lg shadow-indigo-600/30"
              >
                {paymentLoading === "growth" ? "Opening..." : "Upgrade to Growth"}
              </Button>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-300">Business</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">₹74,999</span>
                  <span className="ml-1 text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">For multi-team departments handling thousands of calls.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 6,000 AI Voice Minutes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Multi-Agent Voice Calling</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Custom CRM Integrations</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Advanced Reports &amp; SLA</li>
                </ul>
              </div>
              <Button
                onClick={() => startCheckout("business")}
                disabled={paymentLoading === "business"}
                className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white text-xs h-10"
              >
                {paymentLoading === "business" ? "Opening..." : "Get Started"}
              </Button>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-300">Enterprise</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">₹1.49L</span>
                  <span className="ml-1 text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">Enterprise-grade AI communication &amp; dedicated servers.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 10,000 AI Voice Minutes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Dedicated VPS / Infrastructure</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Custom LLM Model Fine-Tuning</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 24×7 Premium Account Manager</li>
                </ul>
              </div>
              <Button onClick={() => openContactSales("enterprise")} className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white text-xs h-10">Contact Sales</Button>
            </div>

            {/* Custom */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-300">Custom</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">Custom</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">For 20,000+ voice minutes or bespoke enterprise builds.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> 20,000+ Voice Minutes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Unlimited Integrations</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Dedicated Onboarding</li>
                </ul>
              </div>
              <Button onClick={() => openContactSales("custom")} className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white text-xs h-10">Contact Sales</Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 border-t border-white/10 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="mt-3 text-slate-400 text-sm">Everything you need to know about getting started with ParshAgent.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-slate-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="h-5 w-5 text-indigo-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />}
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-slate-950/40 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              <Sparkles className="h-3.5 w-3.5" /> Made for Indian Businesses
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Our Mission</h2>
            <p className="text-indigo-400 font-semibold mt-2 text-lg">"Automate follow-ups, humanize interactions, close contracts."</p>
            <p className="mt-6 text-slate-300 leading-relaxed">
              At ParshAgent, we bridge the gap between AI speed and genuine human-like sales conversations. 
              Our CRM platform combines state-of-the-art LLMs, ultra-fast speech recognition models, and unified communication channels so Indian businesses spend time closing qualified deals rather than manual outreach.
            </p>
            <div className="mt-8 flex gap-6">
              <div>
                <div className="text-3xl font-bold text-white">20k+</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">AI Calls Processed</div>
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
            <img src="/images/gauransh-founder.png" alt="Gauransh - Founder of ParshAgent" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent flex flex-col justify-end p-6 text-left">
              <h3 className="text-xl font-bold text-white">Gauransh</h3>
              <p className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">Founder, ParshAgent</p>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                "Our mission is to build highly conversational autonomous AI CRM products that accelerate sales for ambitious businesses in Ahmedabad, Gujarat, and across India."
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
                Have questions about AI calling plans, custom WhatsApp CRM integrations, or telephony setup for your team? Contact us.
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
              <form 
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  const form = e.target;
                  const name = form.name.value;
                  const email = form.email.value;
                  const message = form.message.value;
                  const subject = encodeURIComponent(`[ParshAgent Inquiry] Message from ${name}`);
                  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\n--\nSent via ParshAgent Contact Form`);
                  window.location.href = `mailto:support@parshwebcraft.in?subject=${subject}&body=${body}`;
                }} 
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                  <input type="text" name="name" required placeholder="Your Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                  <input type="email" name="email" required placeholder="you@company.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Message</label>
                  <textarea name="message" rows="4" required placeholder="How can we help your team?" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" /> Send Email to Support Desk
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Global Reusable Footer */}
      <Footer />

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
            <h3 className="font-serif text-2xl font-bold text-white mb-2">Request Custom CRM Quote</h3>
            <p className="text-sm text-slate-400 mb-6">Tell us about your business lead volume and voice caller requirements.</p>
            
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
                  <input type="email" required placeholder="john@company.com" 
                    value={quoteForm.email} onChange={e => setQuoteForm({...quoteForm, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company / Business Name</label>
                  <input type="text" required placeholder="ABC Enterprises" 
                    value={quoteForm.company} onChange={e => setQuoteForm({...quoteForm, company: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Requirements / Monthly Calls</label>
                  <textarea rows="3" placeholder="e.g. 2,000 monthly voice calls in Hinglish..." 
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
