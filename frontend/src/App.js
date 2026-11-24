import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import RequireAuth from "@/components/RequireAuth";
import Layout from "@/components/Layout";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import Disclaimer from "@/pages/Disclaimer";
import Support from "@/pages/Support";
import DataDeletion from "@/pages/DataDeletion";
import CookiePolicy from "@/pages/CookiePolicy";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import LeadDetail from "@/pages/LeadDetail";
import Tasks from "@/pages/Tasks";
import Calls from "@/pages/Calls";
import Whatsapp from "@/pages/Whatsapp";
import Products from "@/pages/Products";
import Appointments from "@/pages/Appointments";
import Quotations from "@/pages/Quotations";
import AILogs from "@/pages/AILogs";
import Users from "@/pages/Users";
import Offline from "@/pages/Offline";
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import Copilot from "@/pages/Copilot";
import AiGrowth from "@/pages/AiGrowth";
import MetaWhatsApp from "@/pages/MetaWhatsApp";

import AutomationDashboard from "@/pages/AutomationDashboard";
import WorkflowBuilder from "@/pages/WorkflowBuilder";
import WorkflowTemplates from "@/pages/WorkflowTemplates";
import AutomationLogs from "@/pages/AutomationLogs";
import ConnectedIntegrations from "@/pages/ConnectedIntegrations";
import AutomationSettings from "@/pages/AutomationSettings";

import "@/App.css";


function Authed({ children }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  );
}

function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [location]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <PageTracker />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/offline" element={<Offline />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/support" element={<Support />} />
          <Route path="/data-deletion" element={<DataDeletion />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/dashboard" element={<Authed><Dashboard /></Authed>} />
          <Route path="/leads" element={<Authed><Leads /></Authed>} />
          <Route path="/leads/:id" element={<Authed><LeadDetail /></Authed>} />
          <Route path="/tasks" element={<Authed><Tasks /></Authed>} />
          <Route path="/calls" element={<Authed><Calls /></Authed>} />
          <Route path="/whatsapp" element={<Authed><Whatsapp /></Authed>} />
          <Route path="/kanban" element={<Authed><Whatsapp /></Authed>} />
          <Route path="/wa-meta-manual" element={<Authed><MetaWhatsApp /></Authed>} />
          <Route path="/meta-whatsapp" element={<Authed><MetaWhatsApp /></Authed>} />
          <Route path="/products" element={<Authed><Products /></Authed>} />
          <Route path="/appointments" element={<Authed><Appointments /></Authed>} />
          <Route path="/quotations" element={<Authed><Quotations /></Authed>} />
          <Route path="/ai-logs" element={<Authed><AILogs /></Authed>} />
          <Route path="/campaigns" element={<Authed><Campaigns /></Authed>} />
          <Route path="/campaigns/:id" element={<Authed><CampaignDetail /></Authed>} />
          <Route path="/copilot" element={<Authed><Copilot /></Authed>} />
          <Route path="/growth" element={<Authed><AiGrowth /></Authed>} />
          <Route path="/users" element={<Authed><Users /></Authed>} />
          
          {/* Automation Routes */}
          <Route path="/automation" element={<Authed><AutomationDashboard /></Authed>} />
          <Route path="/automation/builder" element={<Authed><WorkflowBuilder /></Authed>} />
          <Route path="/automation/builder/:id" element={<Authed><WorkflowBuilder /></Authed>} />
          <Route path="/automation/templates" element={<Authed><WorkflowTemplates /></Authed>} />
          <Route path="/automation/logs" element={<Authed><AutomationLogs /></Authed>} />
          <Route path="/automation/integrations" element={<Authed><ConnectedIntegrations /></Authed>} />
          <Route path="/automation/settings" element={<Authed><AutomationSettings /></Authed>} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
