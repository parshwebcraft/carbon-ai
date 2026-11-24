import React from "react";
import { Link, useLocation } from "react-router-dom";
import Footer from "./Footer";
import { ArrowLeft, Shield, FileText, AlertCircle, Trash2, Cookie, HelpCircle } from "lucide-react";

export default function LegalLayout({ children, activePage, title, subtitle, lastUpdated = "October 16, 2026" }) {
  const location = useLocation();

  const legalNavLinks = [
    { name: "Privacy Policy", path: "/privacy-policy", icon: Shield },
    { name: "Terms & Conditions", path: "/terms-and-conditions", icon: FileText },
    { name: "Disclaimer", path: "/disclaimer", icon: AlertCircle },
    { name: "Cookie Policy", path: "/cookie-policy", icon: Cookie },
    { name: "Data Deletion", path: "/data-deletion", icon: Trash2 },
    { name: "Support", path: "/support", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#060713] text-slate-100 flex flex-col relative selection:bg-indigo-500 selection:text-white">
      {/* Background radial gradient texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:32px_32px] opacity-25 pointer-events-none z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-indigo-600/15 via-violet-600/10 to-transparent blur-[120px] pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#060713]/85 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1">
            <img src="/images/ParshAgent_icon_only.png" alt="ParshAgent AI CRM Logo" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
            <span className="font-serif font-bold text-xl tracking-tight text-white">ParshAgent</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link to="/" className="hover:text-indigo-400 transition-colors">Home</Link>
            <a href="/#features" className="hover:text-indigo-400 transition-colors">Features</a>
            <a href="/#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a>
            <Link to="/support" className="hover:text-indigo-400 transition-colors">Support</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 transition-colors">
              Sign In
            </Link>
            <Link to="/signup">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 py-2 text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500">
                Start Free Trial
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb / Back button */}
          <div className="mb-6">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors p-1 -ml-1 focus:outline-none focus:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to ParshAgent Homepage
            </Link>
          </div>

          {/* Page Title & Header */}
          <div className="border-b border-white/10 pb-6 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
              <span>Legal &amp; Compliance</span>
              <span>•</span>
              <span>Last Updated: {lastUpdated}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-base sm:text-lg text-slate-300 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Quick Legal Navigation Tabs */}
          <div className="mb-10 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-2 min-w-max">
              {legalNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || activePage === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Document Content */}
          <div className="prose prose-invert prose-indigo max-w-none text-slate-300 leading-relaxed space-y-8 text-sm sm:text-base">
            {children}
          </div>

        </div>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
