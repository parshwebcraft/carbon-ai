import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Shield, FileText, HelpCircle, ArrowUpRight } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#060713] relative z-10 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1 -ml-1">
              <img 
                src="/images/ParshAgent_icon_only.png" 
                alt="ParshAgent AI CRM Logo" 
                className="h-9 w-auto object-contain transition-transform group-hover:scale-105" 
              />
              <span className="font-serif font-bold text-2xl tracking-tight text-white">ParshAgent</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              AI-powered CRM, sales automation, lead management and business communication platform built for modern Indian businesses.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-indigo-400 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Operated by ParshWebCraft • Ahmedabad, India
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Product</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="/#features" className="hover:text-white transition-colors focus:outline-none focus:text-white">
                  CRM &amp; Lead Management
                </a>
              </li>
              <li>
                <a href="/#features" className="hover:text-white transition-colors focus:outline-none focus:text-white">
                  Sales Automation
                </a>
              </li>
              <li>
                <a href="/#features" className="hover:text-white transition-colors focus:outline-none focus:text-white">
                  WhatsApp Business Integration
                </a>
              </li>
              <li>
                <a href="/#live-demo" className="hover:text-white transition-colors focus:outline-none focus:text-white flex items-center gap-1">
                  AI Voice Simulation <ArrowUpRight className="h-3 w-3 text-indigo-400" />
                </a>
              </li>
              <li>
                <a href="/#calculator" className="hover:text-white transition-colors focus:outline-none focus:text-white">
                  ROI Calculator
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Legal &amp; Policy</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors focus:outline-none focus:text-white flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-400" /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="hover:text-white transition-colors focus:outline-none focus:text-white flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" /> Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="hover:text-white transition-colors focus:outline-none focus:text-white">
                  Disclaimer
                </Link>
              </li>
              <li>
                <Link to="/data-deletion" className="hover:text-white transition-colors focus:outline-none focus:text-white">
                  Data Deletion
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="hover:text-white transition-colors focus:outline-none focus:text-white">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Support</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/support" className="hover:text-white transition-colors focus:outline-none focus:text-white flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400" /> Help &amp; Support
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:support@parshwebcraft.in" 
                  className="hover:text-white transition-colors focus:outline-none focus:text-white flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-indigo-400" /> support@parshwebcraft.in
                </a>
              </li>
              <li>
                <a 
                  href="tel:+919521347419" 
                  className="hover:text-white transition-colors focus:outline-none focus:text-white flex items-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5 text-indigo-400" /> +91 95213 47419
                </a>
              </li>
              <li className="flex items-start gap-1.5 text-slate-400 text-xs pt-1">
                <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>Ahmedabad, Gujarat, India</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            &copy; {currentYear} <strong className="text-slate-300 font-semibold">ParshAgent by ParshWebCraft</strong>. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-slate-300 transition-colors focus:outline-none focus:text-white">
              Privacy
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-slate-300 transition-colors focus:outline-none focus:text-white">
              Terms
            </Link>
            <Link to="/cookie-policy" className="hover:text-slate-300 transition-colors focus:outline-none focus:text-white">
              Cookies
            </Link>
            <Link to="/support" className="hover:text-slate-300 transition-colors focus:outline-none focus:text-white">
              Support
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
