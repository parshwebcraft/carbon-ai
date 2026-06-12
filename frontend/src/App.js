import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import RequireAuth from "@/components/RequireAuth";
import Layout from "@/components/Layout";

import Login from "@/pages/Login";
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

import "@/App.css";

function Authed({ children }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/offline" element={<Offline />} />
          <Route path="/" element={<Authed><Dashboard /></Authed>} />
          <Route path="/leads" element={<Authed><Leads /></Authed>} />
          <Route path="/leads/:id" element={<Authed><LeadDetail /></Authed>} />
          <Route path="/tasks" element={<Authed><Tasks /></Authed>} />
          <Route path="/calls" element={<Authed><Calls /></Authed>} />
          <Route path="/whatsapp" element={<Authed><Whatsapp /></Authed>} />
          <Route path="/products" element={<Authed><Products /></Authed>} />
          <Route path="/appointments" element={<Authed><Appointments /></Authed>} />
          <Route path="/quotations" element={<Authed><Quotations /></Authed>} />
          <Route path="/ai-logs" element={<Authed><AILogs /></Authed>} />
          <Route path="/campaigns" element={<Authed><Campaigns /></Authed>} />
          <Route path="/campaigns/:id" element={<Authed><CampaignDetail /></Authed>} />
          <Route path="/users" element={<Authed><Users /></Authed>} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
