import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import WhatsAppConnectModal from "@/components/WhatsAppConnectModal";
import {
  Building2, CreditCard, Bot, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, ShieldCheck, Sparkles, Phone, MessageSquare, Zap, Globe,
  Check, Lock, ChevronRight, X, Smartphone, Landmark, Wallet
} from "lucide-react";
import SEO from "@/components/SEO";

function loadRazorpaySdk() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();

  // Wizard state: 1 = Profile, 2 = Plan/Payment, 3 = Voice Agent, 4 = Ready
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);

  // Step 1: Profile state
  const [companyName, setCompanyName] = useState(user?.company_name || "");
  const [industry, setIndustry] = useState("Digital Agency & IT Services");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");

  // Step 2: Subscription & Payment state
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [sandboxModalOpen, setSandboxModalOpen] = useState(false);
  const [sandboxOrderData, setSandboxOrderData] = useState(null);
  const [sandboxPaymentMethod, setSandboxPaymentMethod] = useState("upi");
  const [sandboxProcessing, setSandboxProcessing] = useState(false);

  // Step 3: Voice Agent state
  const [agentName, setAgentName] = useState("Priya - AI Senior Sales Rep");
  const [agentLanguage, setAgentLanguage] = useState("Hinglish");
  const [businessPitch, setBusinessPitch] = useState(
    "We provide high-impact web development, digital advertising, and automated AI CRM solutions to help growing businesses scale revenue."
  );

  useEffect(() => {
    document.body.classList.add("dark-theme");
    // Fetch fresh onboarding status
    api.get("/onboarding/status")
      .then(res => {
        const d = res.data;
        if (d.company_name) setCompanyName(d.company_name);
        if (d.industry) setIndustry(d.industry);
        if (d.website) setWebsite(d.website);
        if (d.phone) setPhone(d.phone);
        if (d.voice_agent_name) setAgentName(d.voice_agent_name);
        if (d.voice_language) setAgentLanguage(d.voice_language);
        if (d.voice_pitch) setBusinessPitch(d.voice_pitch);

        if (d.onboarding_step === "subscription") setStep(2);
        else if (d.onboarding_step === "voice_agent") setStep(3);
        else if (d.onboarding_completed) nav("/dashboard");
      })
      .catch(() => {});
  }, [nav]);

  // Handle Step 1 Save
  async function handleProfileSubmit(e) {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("Please enter your company / workspace name");
      return;
    }
    setLoading(true);
    try {
      await api.post("/onboarding/profile", {
        company_name: companyName,
        industry,
        website,
        phone,
      });
      toast.success("Workspace profile saved!");
      setStep(2);
    } catch (err) {
      toast.error(errMsg(err, "Failed to save profile"));
    } finally {
      setLoading(false);
    }
  }

  // Handle Step 2 Payment / Subscription
  async function handleStartRazorpayCheckout() {
    setPaymentBusy(true);
    try {
      const { data } = await api.post("/payments/create-order", { plan_id: selectedPlan });
      setSandboxOrderData(data);

      // If test order or dummy test key, open the sandbox modal directly to prevent checkout.js 400 Bad Request
      if (data.is_test || data.order_id?.startsWith("order_test_") || data.key_id?.startsWith("rzp_test_1DP5mm")) {
        setSandboxModalOpen(true);
        setPaymentBusy(false);
        return;
      }

      await loadRazorpaySdk();
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "ParshAgent AI",
        description: `₹9,999/mo Starter AI Telephony Plan for ${companyName || "Your Agency"}`,
        order_id: data.order_id,
        theme: { color: "#4f46e5" },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: phone || user?.phone,
        },
        handler: async (response) => {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id || data.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || "test_signature",
            });
            await api.post("/onboarding/plan", {
              plan_id: selectedPlan,
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id || data.order_id,
            });
            setPaymentSuccess(true);
            toast.success("Subscription activated successfully!");
            setTimeout(() => setStep(3), 1000);
          } catch (e) {
            toast.error(errMsg(e, "Payment verification error"));
          } finally {
            setPaymentBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentBusy(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (res) => {
        setPaymentBusy(false);
        // Fall back to sandbox modal if Razorpay modal fails
        setSandboxModalOpen(true);
      });
      rzp.open();
    } catch (err) {
      setPaymentBusy(false);
      // Fallback to sandbox test modal
      setSandboxModalOpen(true);
    }
  }

  // Handle Sandbox payment authorization
  async function handleSandboxPaymentSuccess() {
    setSandboxProcessing(true);
    const orderId = sandboxOrderData?.order_id || `order_test_${Date.now()}`;
    const payId = `pay_test_${Date.now()}`;
    try {
      await api.post("/payments/verify", {
        razorpay_order_id: orderId,
        razorpay_payment_id: payId,
        razorpay_signature: "test_signature",
      });
      await api.post("/onboarding/plan", {
        plan_id: selectedPlan,
        payment_id: payId,
        order_id: orderId,
      });
      setPaymentSuccess(true);
      toast.success("Test Payment Successful! Subscription Activated.");
      setSandboxModalOpen(false);
      setTimeout(() => setStep(3), 600);
    } catch (e) {
      toast.error(errMsg(e, "Payment verification failed"));
    } finally {
      setSandboxProcessing(false);
      setPaymentBusy(false);
    }
  }

  // Handle Trial activation bypass
  async function handleActivateTrial() {
    setPaymentBusy(true);
    try {
      await api.post("/onboarding/plan", {
        plan_id: selectedPlan,
        payment_id: `trial_${Date.now()}`,
        order_id: `trial_${Date.now()}`,
      });
      setPaymentSuccess(true);
      toast.success("7-Day Free Trial Activated!");
      setTimeout(() => setStep(3), 600);
    } catch (err) {
      toast.error(errMsg(err, "Trial activation failed"));
    } finally {
      setPaymentBusy(false);
    }
  }

  // Handle Step 3 AI Voice Agent setup
  async function handleVoiceAgentSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/onboarding/voice-agent", {
        agent_name: agentName,
        language: agentLanguage,
        business_pitch: businessPitch,
        caller_id: phone,
      });
      await refreshUser();
      setStep(4);
      toast.success("AI Voice Agent deployed!");
      setTimeout(() => nav("/dashboard"), 1800);
    } catch (err) {
      toast.error(errMsg(err, "Failed to complete onboarding"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070814] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      <SEO 
        title="Workspace Onboarding | ParshAgent AI CRM"
        description="Set up your company profile, subscription plan, and conversational AI voice calling agent."
      />

      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/10 blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-white/5 backdrop-blur-md bg-[#070814]/80 py-4 px-6 sm:px-10 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <img src="/images/ParshAgent_icon_only.png" alt="ParshAgent Logo" className="h-8 w-auto object-contain" />
          <span className="font-serif font-bold text-lg text-white">ParshAgent</span>
          <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            Workspace Onboarding
          </span>
        </div>
        <div className="text-xs text-slate-400">
          Logged in as <strong className="text-white">{user?.email}</strong>
        </div>
      </header>

      {/* Main Wizard Area */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 relative z-10 flex-1 flex flex-col justify-center">
        
        {/* Step Indicator Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-xl mx-auto relative mb-3">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 -z-0" />
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-indigo-500 transition-all duration-500 -translate-y-1/2 -z-0"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />

            {[
              { num: 1, label: "Workspace Profile", icon: Building2 },
              { num: 2, label: "Subscription", icon: CreditCard },
              { num: 3, label: "AI Calling Agent", icon: Bot },
              { num: 4, label: "Dashboard", icon: CheckCircle2 },
            ].map((s) => {
              const active = step === s.num;
              const done = step > s.num;
              const Icon = s.icon;
              return (
                <div key={s.num} className="flex flex-col items-center relative z-10">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      done
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                        : active
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-600/40"
                        : "bg-slate-900 border border-slate-700 text-slate-500"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[11px] mt-2 font-medium hidden sm:block ${active ? "text-white" : "text-slate-500"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= STEP 1: WORKSPACE PROFILE ================= */}
        {step === 1 && (
          <Card className="bg-[#0b0c1b] border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
            <div className="space-y-2 mb-6">
              <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20">Step 1 of 3</Badge>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">Setup Your Business Workspace</h2>
              <p className="text-sm text-slate-400">
                Configure your agency or business details to create a secure, isolated tenant environment.
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <Label htmlFor="companyName" className="text-xs text-slate-300 font-semibold">
                  Company / Agency Name <span className="text-rose-400">*</span>
                </Label>
                <Input
                  id="companyName"
                  required
                  placeholder="e.g. Gyan Technologies / Apex Real Estate"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1.5 bg-slate-900/60 border-white/10 text-white h-11"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry" className="text-xs text-slate-300 font-semibold">
                    Primary Industry
                  </Label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900/60 border border-white/10 text-white text-sm rounded-md px-3 h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Digital Agency & IT Services">Digital Agency & IT Services</option>
                    <option value="Real Estate & Property">Real Estate & Property</option>
                    <option value="Jewellery & Luxury Retail">Jewellery & Luxury Retail</option>
                    <option value="Education & EdTech">Education & EdTech</option>
                    <option value="Healthcare & Clinics">Healthcare & Clinics</option>
                    <option value="Financial Services & Insurance">Financial Services & Insurance</option>
                    <option value="Automotive & Dealerships">Automotive & Dealerships</option>
                    <option value="Other Commercial Services">Other Commercial Services</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-xs text-slate-300 font-semibold">
                    Contact Phone / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 bg-slate-900/60 border-white/10 text-white h-11"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website" className="text-xs text-slate-300 font-semibold">
                  Official Website (Optional)
                </Label>
                <Input
                  id="website"
                  placeholder="https://yourcompany.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-1.5 bg-slate-900/60 border-white/10 text-white h-11"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-11 text-sm font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Continue to Plan Selection <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ================= STEP 2: SUBSCRIPTION & AUTOPAY GATE ================= */}
        {step === 2 && (
          <Card className="bg-[#0b0c1b] border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
            <div className="space-y-2 mb-6">
              <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20">Step 2 of 3</Badge>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">Choose Your AI Telephony Plan</h2>
              <p className="text-sm text-slate-400">
                Activate your autonomous AI calling minutes and WhatsApp automations. Autopay setup via Razorpay.
              </p>
            </div>

            {/* Plan Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div 
                onClick={() => setSelectedPlan("starter")}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                  selectedPlan === "starter"
                    ? "bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-slate-900/40 border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white text-base">Starter AI Telephony</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Ideal for small teams & growing businesses</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                    Recommended
                  </Badge>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold text-white">₹9,999</span>
                  <span className="ml-1 text-xs text-slate-400">/ month</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> 500 Outbound AI Voice Minutes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Hinglish & Hindi Conversational Models</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Official WhatsApp Cloud API Suite</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Call Recording & AI Sentiment Scoring</li>
                </ul>
              </div>

              <div 
                onClick={() => setSelectedPlan("growth")}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                  selectedPlan === "growth"
                    ? "bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-slate-900/40 border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white text-base">Growth Powerhouse</h3>
                    <p className="text-xs text-slate-400 mt-0.5">High-volume sales outreach & multi-agents</p>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold text-white">₹34,999</span>
                  <span className="ml-1 text-xs text-slate-400">/ month</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> 2,500 Outbound AI Voice Minutes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Priority Telephony Routing</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Multi-Agent Voice Calling Teams</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Full Automation & Workflow Triggers</li>
                </ul>
              </div>
            </div>

            {/* Payment Actions */}
            <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> 256-Bit Razorpay Test Checkout</span>
                <span>Cancel Anytime</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleStartRazorpayCheckout}
                  disabled={paymentBusy}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-11 text-sm font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {paymentBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Pay with Razorpay Test Mode (₹9,999)
                </Button>
                <Button
                  variant="outline"
                  onClick={handleActivateTrial}
                  disabled={paymentBusy}
                  className="border-white/10 hover:bg-white/10 text-slate-200 h-11 text-sm font-semibold"
                >
                  <Sparkles className="h-4 w-4 mr-2 text-amber-400" />
                  Start 7-Day Free Trial
                </Button>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-slate-400">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>
          </Card>
        )}

        {/* ================= STEP 3: AI VOICE CALLING SETUP ================= */}
        {step === 3 && (
          <Card className="bg-[#0b0c1b] border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
            <div className="space-y-2 mb-6">
              <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20">Step 3 of 3</Badge>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">Configure Your AI Calling Agent</h2>
              <p className="text-sm text-slate-400">
                Customize your outbound conversational caller identity, voice language, and knowledge pitch.
              </p>
            </div>

            <form onSubmit={handleVoiceAgentSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agentName" className="text-xs text-slate-300 font-semibold">
                    AI Agent Name & Persona
                  </Label>
                  <Input
                    id="agentName"
                    required
                    placeholder="e.g. Priya - Senior Sales Rep"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="mt-1.5 bg-slate-900/60 border-white/10 text-white h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="agentLanguage" className="text-xs text-slate-300 font-semibold">
                    Spoken Language Mode
                  </Label>
                  <select
                    id="agentLanguage"
                    value={agentLanguage}
                    onChange={(e) => setAgentLanguage(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900/60 border border-white/10 text-white text-sm rounded-md px-3 h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Hinglish">Hinglish (Natural Hindi + English Blend)</option>
                    <option value="Hindi">Pure Hindi (Polite & Professional)</option>
                    <option value="English">Indian Professional English</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="businessPitch" className="text-xs text-slate-300 font-semibold">
                  What Does Your Business Offer? (Agent Knowledge Pitch)
                </Label>
                <Textarea
                  id="businessPitch"
                  rows={3}
                  required
                  placeholder="Describe your core products, services, pricing guidelines, or appointment booking rules..."
                  value={businessPitch}
                  onChange={(e) => setBusinessPitch(e.target.value)}
                  className="mt-1.5 bg-slate-900/60 border-white/10 text-white text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Your AI voice agent will use this exact context when dialing prospects to answer queries and qualify leads.
                </p>
              </div>

              {/* Optional WhatsApp Connect Pill */}
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Connect WhatsApp Business API</h4>
                    <p className="text-xs text-slate-400">Send instant follow-ups via Meta Cloud API after each call.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWaModalOpen(true)}
                  className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs"
                >
                  Connect Now
                </Button>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-slate-400">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 h-11 text-sm font-semibold shadow-lg shadow-emerald-600/30"
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Finish Setup & Launch Workspace <Check className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ================= STEP 4: CELEBRATION / READY ================= */}
        {step === 4 && (
          <Card className="bg-[#0b0c1b] border-white/10 p-10 rounded-3xl shadow-2xl text-center space-y-5 backdrop-blur-xl">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-white">Your Workspace is Live!</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Welcome to <strong className="text-white">{companyName}</strong>. Your tenant space is completely isolated, secured, and ready for outbound calling.
            </p>
            <div className="pt-3">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-400" />
              <p className="text-xs text-slate-500 mt-2">Redirecting to your fresh dashboard...</p>
            </div>
          </Card>
        )}
      </main>

      {/* Razorpay Sandbox Test Checkout Modal */}
      {sandboxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b0c1b] border border-indigo-500/30 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative ring-1 ring-white/10">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center font-bold text-white text-lg">
                  ₹
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm tracking-wide">Razorpay Checkout</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Sandbox Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{companyName || "Your Agency"}</p>
                </div>
              </div>
              <button
                onClick={() => setSandboxModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Monthly Autopay Amount</p>
                  <p className="text-2xl font-bold text-white mt-0.5">
                    ₹9,999<span className="text-xs text-slate-400 font-normal"> / month</span>
                  </p>
                </div>
                <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-xs py-1">
                  Starter AI Plan
                </Badge>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Choose Test Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "upi", label: "UPI Autopay", icon: Smartphone },
                    { id: "card", label: "Cards", icon: CreditCard },
                    { id: "netbanking", label: "NetBanking", icon: Landmark },
                  ].map((m) => {
                    const active = sandboxPaymentMethod === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSandboxPaymentMethod(m.id)}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          active
                            ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                            : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[11px] font-medium">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simulated details */}
              {sandboxPaymentMethod === "upi" && (
                <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Test UPI ID:</span>
                    <span className="font-mono text-indigo-300 font-medium">success@razorpay</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Payer Name:</span>
                    <span>{user?.name || "Customer"}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Recurring Frequency:</span>
                    <span className="text-emerald-400 font-medium">Monthly Autopay</span>
                  </div>
                </div>
              )}

              {sandboxPaymentMethod === "card" && (
                <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400 font-sans">Test Card Number:</span>
                    <span className="text-indigo-300">4111 •••• •••• 1111</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400 font-sans">Expiry / CVV:</span>
                    <span>12/28 • 123</span>
                  </div>
                </div>
              )}

              {sandboxPaymentMethod === "netbanking" && (
                <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Test Bank:</span>
                    <span className="text-indigo-300 font-semibold">HDFC Bank (Sandbox)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400 font-medium">Auto-approve on Click</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={handleSandboxPaymentSuccess}
                disabled={sandboxProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-sm font-semibold shadow-lg shadow-indigo-600/40 rounded-xl mt-2"
              >
                {sandboxProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Simulating Razorpay Webhook & Verification...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />
                    Authorize Test Payment (₹9,999)
                  </>
                )}
              </Button>

              <div className="pt-2 text-center space-y-1">
                <p className="text-[11px] text-slate-400">
                  🔒 Razorpay Test Environment • No real money charged
                </p>
                <button
                  type="button"
                  onClick={handleActivateTrial}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                >
                  Or activate 7-Day Free Trial without payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded WhatsApp modal */}
      <WhatsAppConnectModal
        open={waModalOpen}
        onOpenChange={setWaModalOpen}
        onConnected={() => toast.success("WhatsApp connected to your workspace!")}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-600">
        © 2026 ParshAgent AI Telephony Platform • All customer workspaces are encrypted &amp; isolated
      </footer>
    </div>
  );
}
