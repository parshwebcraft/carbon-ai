import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { dateTime, errMsg, relative, inr, dateShort } from "@/lib/format";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import WhatsAppConnectModal from "@/components/WhatsAppConnectModal";
import {
  MessageCircle, Send, Sparkles, Loader2, Brain, Target,
  TrendingUp, AlertTriangle, ChevronRight, RefreshCw, Paperclip,
  Smile, Mic, Search, Download, Info, Check, CheckCheck, X, Phone,
  User, Calendar, CreditCard, ArrowRight, LayoutGrid, Columns,
  Plus, Tag, Filter, Globe, ChevronDown, Clock, ShieldCheck,
  FileText, Image as ImageIcon, CornerDownLeft, Sparkle, ExternalLink,
  ChevronLeft, Settings, Layers, MessageSquare, ArrowUpRight, ArrowDownLeft,
  Bot, Video, MousePointerClick, ListOrdered
} from "lucide-react";

// Reusable WhatsApp Icon SVG
function WhatsAppIcon({ className = "w-4 h-4 text-emerald-500" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.668-.699c.969.585 1.761.884 2.792.884h.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.77-5.769-5.77zm3.364 8.163c-.144.406-.837.774-1.173.824-.312.046-.713.075-2.285-.575-1.921-.795-3.155-2.751-3.25-2.879-.096-.128-.773-1.03-.773-1.964s.484-1.396.657-1.588c.173-.192.38-.24.507-.24.127 0 .254.001.365.006.117.006.275-.045.43.329.16.386.545 1.332.593 1.428.048.096.08.208.016.335-.064.127-.096.208-.192.32-.096.112-.202.25-.289.336-.096.096-.197.2-.085.392.112.192.497.82 1.066 1.327.733.653 1.352.855 1.544.951.192.096.304.08.416-.048.112-.128.48-.56.608-.752.128-.192.256-.16.432-.096.176.064 1.118.528 1.31.624.192.096.32.144.368.224.048.08.048.464-.096.87zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.306A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.154c-1.636 0-3.153-.473-4.436-1.288l-.318-.202-2.96.776.79-2.885-.221-.352A8.116 8.116 0 013.846 12c0-4.496 3.658-8.154 8.154-8.154 4.496 0 8.154 3.658 8.154 8.154 0 4.496-3.658 8.154-8.154 8.154z"/>
    </svg>
  );
}

// Deep navy harmonious avatar color generation based on name
const AVATAR_COLORS = [
  "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50",
  "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50",
  "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
  "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
  "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900/50",
  "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-900/50",
  "bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-900/50",
  "bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900/50",
];

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  if (!name) return "WA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Canned quick replies with '/' slash shortcut
const QUICK_REPLIES = [
  { slash: "/pricing", title: "Pricing & Packages", text: "Hi! Our services start at: Web Development from ₹15,000, Custom Software from ₹35,000, and SEO/Marketing from ₹8,000/mo. Would you like a customized proposal for your requirements?" },
  { slash: "/bank", title: "Bank Account Details", text: "Here are our official bank account details:\nAccount Name: ParshWebCraft Technologies\nBank: HDFC Bank\nA/C No: 50200084729103\nIFSC: HDFC0001234\nBranch: Udaipur" },
  { slash: "/upi", title: "UPI Payment Details", text: "You can make payment directly via UPI to:\nUPI ID: 919830580730@upi\n(ParshWebCraft Technologies) - Please share the payment screenshot once done!" },
  { slash: "/meeting", title: "Schedule Discovery Call", text: "Would you be free for a quick 10-minute discovery call tomorrow at 3:00 PM or 5:00 PM to discuss the roadmap and timeline?" },
  { slash: "/portfolio", title: "Portfolio & Case Studies", text: "You can explore our recent live projects and case studies here: https://parshagent.com - Let me know which industry style appeals to you most!" },
  { slash: "/followup", title: "Gentle Follow-up", text: "Hi! Hope you are having a wonderful week. Just following up on our previous conversation. Did you get a chance to review the details we shared?" },
  { slash: "/audit", title: "Free Website & SEO Audit", text: "We are currently offering a complimentary 20-point digital & performance audit for your brand. Shall I run it for your website?" },
];

const KANBAN_COLUMNS = [
  { id: "Needs human", label: "Needs human", color: "bg-rose-500", pillBg: "bg-rose-50 dark:bg-[#2C151B] text-rose-700 dark:text-[#FB7185] border-rose-200 dark:border-[#4C1D24]", dot: "bg-rose-500" },
  { id: "Unlabeled", label: "Unlabeled", color: "bg-slate-400", pillBg: "bg-slate-100 dark:bg-[#162232] text-slate-700 dark:text-[#94A3B8] border-slate-200 dark:border-[#1E2D40]", dot: "bg-slate-400" },
  { id: "Follow Up", label: "Follow Up", color: "bg-amber-500", pillBg: "bg-amber-50 dark:bg-[#291E0D] text-amber-700 dark:text-[#FBBF24] border-amber-200 dark:border-[#4B3312]", dot: "bg-amber-500" },
  { id: "Won", label: "Closed / Won", color: "bg-emerald-500", pillBg: "bg-emerald-50 dark:bg-[#062D24] text-emerald-700 dark:text-[#34D399] border-emerald-200 dark:border-[#0E5343]", dot: "bg-emerald-500" },
];

export default function Whatsapp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialView = searchParams.get("view") || (location.pathname.includes("kanban") ? "kanban" : "inbox");
  const [viewMode, setViewMode] = useState(initialView); // 'inbox' | 'kanban'


  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(() => {
    const leadParam = searchParams.get("lead");
    return leadParam ? parseInt(leadParam, 10) : null;
  });
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    const leadParam = searchParams.get("lead");
    if (leadParam) {
      const parsed = parseInt(leadParam, 10);
      if (!isNaN(parsed) && parsed !== activeId) {
        setActiveId(parsed);
      }
    }
  }, [searchParams]);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'unread' | 'read'
  const [channelFilter, setChannelFilter] = useState("all"); // 'all' | 'whatsapp' | 'instagram' | 'messenger'
  const [dateFilter, setDateFilter] = useState("Lifetime"); // 'TODAY' | 'Yesterday' | 'Last 7 Days' | 'Last 30 Days' | 'This Month' | 'Lifetime'

  // Meta WhatsApp Embedded Signup state
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [waStatus, setWaStatus] = useState(null);

  function loadWaStatus() {
    api.get("/whatsapp/connection-status")
      .then(r => setWaStatus(r.data))
      .catch(() => {});
  }

  useEffect(() => {
    loadWaStatus();
  }, []);

  // Right Drawer & Tab state
  const [rightDrawerOpen, setRightDrawerOpen] = useState(() => {
    return typeof window !== "undefined" && window.innerWidth >= 1280;
  });
  const [drawerTab, setDrawerTab] = useState("ai"); // 'ai' | 'bot' | 'meeting' | 'translate' | 'payment' | 'followup' | 'lead'

  // AI Bot Pause / Resume state
  const [aiBotBusy, setAiBotBusy] = useState(false);

  // Meeting scheduler state
  const [meetDateTime, setMeetDateTime] = useState(() => {
    const d = new Date(Date.now() + 3600000 * 24);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [meetDuration, setMeetDuration] = useState(30);
  const [meetTitle, setMeetTitle] = useState("Discovery & Demo Call");
  const [meetBusy, setMeetBusy] = useState(false);

  // AI State
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);

  // Translation State
  const [translateTarget, setTranslateTarget] = useState("English");
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState("");

  // Payment Link Generator State
  const [paymentAmount, setPaymentAmount] = useState("500");
  const [paymentPurpose, setPaymentPurpose] = useState("Advance Booking / Retainer");
  const [paymentBusy, setPaymentBusy] = useState(false);

  // Follow-up task scheduler state
  const [followupTitle, setFollowupTitle] = useState("Follow up regarding requirements");
  const [followupDate, setFollowupDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [followupPriority, setFollowupPriority] = useState("Medium");
  const [followupBusy, setFollowupBusy] = useState(false);

  // Lead quick edit state
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingLead, setSavingLead] = useState(false);

  // Slash commands and emoji picker state
  const [slashOpen, setSlashOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [inThreadSearch, setInThreadSearch] = useState(false);
  const [threadSearchTerm, setThreadSearchTerm] = useState("");

  // Rich media engine & attachments state
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const docInputRef = useRef(null);
  const imgInputRef = useRef(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [leadQuotes, setLeadQuotes] = useState([]);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [newQuoteAmount, setNewQuoteAmount] = useState("25000");
  const [newQuoteNotes, setNewQuoteNotes] = useState("");
  const [quoteSendingId, setQuoteSendingId] = useState(null);

  // Interactive Quick-Reply Buttons (CTA) state
  const [interactiveModalOpen, setInteractiveModalOpen] = useState(false);
  const [interactiveHeader, setInteractiveHeader] = useState("ParshWebCraft Solutions");
  const [interactiveBody, setInteractiveBody] = useState("Hi! Thanks for connecting with ParshWebCraft. How would you like to proceed with your project?");
  const [interactiveFooter, setInteractiveFooter] = useState("Tap an option below");
  const [interactiveButtons, setInteractiveButtons] = useState([
    { id: "btn_call", title: "📅 Book a Call" },
    { id: "btn_proposal", title: "📑 Get Proposal" },
    { id: "btn_human", title: "👤 Talk to Human" },
  ]);
  const [interactiveSending, setInteractiveSending] = useState(false);

  const INTERACTIVE_PRESETS = [
    {
      name: "Discovery & Next Steps",
      header: "ParshWebCraft Solutions",
      body: "Hi! Thanks for connecting with ParshWebCraft. How would you like to proceed with your project?",
      footer: "Tap an option below",
      buttons: [
        { id: "btn_call", title: "📅 Book a Call" },
        { id: "btn_proposal", title: "📑 Get Proposal" },
        { id: "btn_human", title: "👤 Talk to Human" },
      ],
    },
    {
      name: "Proposal Review",
      header: "Proposal Review",
      body: "We have prepared your quotation. Please let us know how you would like to proceed:",
      footer: "ParshWebCraft Commercials",
      buttons: [
        { id: "btn_accept", title: "✅ Accept Quote" },
        { id: "btn_call", title: "📞 Schedule Call" },
        { id: "btn_human", title: "❓ Have Questions" },
      ],
    },
    {
      name: "Agency Services",
      header: "Our Core Offerings",
      body: "Which service category would you like to explore for your business today?",
      footer: "Tailored Growth Engines",
      buttons: [
        { id: "btn_brochure", title: "📑 Agency Profile" },
        { id: "btn_call", title: "📅 Book Demo Call" },
        { id: "btn_human", title: "👤 Talk to Expert" },
      ],
    },
  ];

  // Interactive List Menu (Up to 10 Options) state
  const [listModalOpen, setListModalOpen] = useState(false);
  const [listHeader, setListHeader] = useState("ParshWebCraft Solutions");
  const [listBody, setListBody] = useState("Welcome to ParshWebCraft! Explore our core web engineering, AI sales agents, and custom growth suites below:");
  const [listFooter, setListFooter] = useState("Select any service for details");
  const [listButtonText, setListButtonText] = useState("View Services");
  const [listSections, setListSections] = useState([
    {
      title: "Web & E-Commerce",
      rows: [
        { id: "item_starter_web", title: "Starter Website", description: "5-page high-speed responsive site" },
        { id: "item_corporate_portal", title: "Corporate Portal", description: "Custom branding, CMS & SEO" },
        { id: "item_ecommerce_store", title: "E-Commerce Store", description: "Shopify / Custom MERN with payment gateway" },
      ],
    },
    {
      title: "AI & Automation",
      rows: [
        { id: "item_whatsapp_ai", title: "WhatsApp AI Sales Suite", description: "24/7 autonomous qualification agent" },
        { id: "item_voice_ai", title: "AI Voice Specialist", description: "Human-grade inbound & outbound caller" },
        { id: "item_custom_saas", title: "Custom SaaS Web App", description: "Next.js + Python full-stack application" },
      ],
    },
    {
      title: "Next Steps",
      rows: [
        { id: "item_discovery_call", title: "📅 Book Discovery Call", description: "15-min strategy call with Gauransh" },
        { id: "item_brochure", title: "📑 Agency Profile PDF", description: "Instant credentials & brochure" },
      ],
    },
  ]);
  const [listSending, setListSending] = useState(false);

  const LIST_MENU_PRESETS = [
    {
      name: "ParshWebCraft Full Services (8 Items)",
      header: "ParshWebCraft Solutions",
      body: "Welcome to ParshWebCraft! Explore our core web engineering, AI sales agents, and custom growth suites below:",
      footer: "Select any service for details",
      buttonText: "View Services",
      sections: [
        {
          title: "Web & E-Commerce",
          rows: [
            { id: "item_starter_web", title: "Starter Website", description: "5-page high-speed responsive site" },
            { id: "item_corporate_portal", title: "Corporate Portal", description: "Custom branding, CMS & SEO" },
            { id: "item_ecommerce_store", title: "E-Commerce Store", description: "Shopify / Custom MERN store" },
          ],
        },
        {
          title: "AI & Automation",
          rows: [
            { id: "item_whatsapp_ai", title: "WhatsApp AI Sales Suite", description: "24/7 autonomous qualification agent" },
            { id: "item_voice_ai", title: "AI Voice Caller Specialist", description: "Human-grade inbound & outbound caller" },
            { id: "item_custom_saas", title: "Custom SaaS Web App", description: "Next.js + Python full-stack app" },
          ],
        },
        {
          title: "Consultation & Next Steps",
          rows: [
            { id: "item_discovery_call", title: "📅 Book Discovery Call", description: "15-min strategy call with Gauransh" },
            { id: "item_brochure", title: "📑 Agency Profile PDF", description: "Instant credentials & brochure" },
          ],
        },
      ],
    },
    {
      name: "Website Packages",
      header: "Website Packages",
      body: "Choose the package that best fits your business goals and scale:",
      footer: "Transparent agency pricing",
      buttonText: "Select Package",
      sections: [
        {
          title: "Tier Packages",
          rows: [
            { id: "item_starter_web", title: "Starter Package", description: "5-page site, fast turnaround (4-7 days)" },
            { id: "item_corporate_portal", title: "Business Portal", description: "Custom UI, CMS & SEO (10-14 days)" },
            { id: "item_ecommerce_store", title: "E-Commerce Store", description: "Full store, cart & payment gateway" },
            { id: "item_custom_saas", title: "Custom Enterprise SaaS", description: "Full-stack tailored web application" },
          ],
        },
      ],
    },
    {
      name: "AI Automation Suite",
      header: "AI Sales Automation",
      body: "Eliminate manual sales follow-ups with our autonomous voice and WhatsApp bots:",
      footer: "Zero 3rd-party recurring fees",
      buttonText: "Explore AI Bots",
      sections: [
        {
          title: "AI Solutions",
          rows: [
            { id: "item_whatsapp_ai", title: "Meta WhatsApp AI Bot", description: "Instant qualification & PDF proposals" },
            { id: "item_voice_ai", title: "AI Voice Specialist", description: "Inbound & outbound call handling" },
            { id: "item_discovery_call", title: "Book Live AI Demo", description: "Real-time voice & chat demo" },
          ],
        },
      ],
    },
  ];

  // Interactive CTA URL & Action Button state
  const [ctaModalOpen, setCtaModalOpen] = useState(false);
  const [ctaHeader, setCtaHeader] = useState("ParshWebCraft Solutions");
  const [ctaBody, setCtaBody] = useState("Tap below to explore our live production portfolio, client web apps, and design case studies:");
  const [ctaDisplayText, setCtaDisplayText] = useState("🌐 View Portfolio");
  const [ctaUrl, setCtaUrl] = useState("https://parshwebcraft.com");
  const [ctaFooter, setCtaFooter] = useState("Parsh Web Craft Studio");
  const [ctaSending, setCtaSending] = useState(false);

  const CTA_URL_PRESETS = [
    {
      name: "Live Portfolio & Work",
      header: "ParshWebCraft Portfolio",
      body: "Explore our recent client deliverables, live web apps, and design case studies in real-time:",
      displayText: "🌐 View Portfolio",
      url: "https://parshwebcraft.com",
      footer: "Parsh Web Craft Studio",
    },
    {
      name: "Direct Founder Connect / WhatsApp",
      header: "Founder Priority Line",
      body: "Need to discuss technical scope or pricing directly? Tap below to connect with Gauransh on his direct WhatsApp line:",
      displayText: "📞 Chat with Founder",
      url: "https://wa.me/919521347419",
      footer: "Direct Priority Line",
    },
    {
      name: "Secure Payment / Token Advance",
      header: "Secure Project Invoice",
      body: "Ready to kick off your project? You can securely process your advance token deposit via Razorpay below:",
      displayText: "💳 Pay Advance Token",
      url: "https://pages.razorpay.com/parshwebcraft",
      footer: "100% Encrypted & Instant Receipt",
    },
    {
      name: "Schedule 15-Min Discovery Call",
      header: "Schedule Discovery",
      body: "Pick a convenient 15-minute slot on our calendar for a one-on-one architecture and requirements call:",
      displayText: "📅 Book 15-Min Slot",
      url: "https://calendly.com/parshwebcraft",
      footer: "Google Meet / Phone Call",
    },
  ];

  // Dialogs
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [leadSearchResults, setLeadSearchResults] = useState([]);
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [leadSearchTerm, setLeadSearchTerm] = useState("");

  const chatScrollRef = useRef(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const userScrolledUpRef = useRef(false);
  const lastActiveIdRef = useRef(null);
  const [mobileShowChat, setMobileShowChat] = useState(() => {
    const leadParam = searchParams.get("lead");
    return !!leadParam;
  });
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  // On active lead change, reset scroll position
  useEffect(() => {
    if (activeId !== lastActiveIdRef.current) {
      lastActiveIdRef.current = activeId;
      userScrolledUpRef.current = false;
      setUserScrolledUp(false);
    }
  }, [activeId]);

  // Handle manual user scrolling inside the chat window
  const handleChatScroll = (e) => {
    const el = e.currentTarget;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // User is considered scrolled up if more than 70px away from the bottom
    const isUp = distanceFromBottom > 70;
    userScrolledUpRef.current = isUp;
    setUserScrolledUp(isUp);
  };

  const scrollToBottomSmooth = () => {
    userScrolledUpRef.current = false;
    setUserScrolledUp(false);
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  // Load conversations
  function loadConvos() {
    api.get("/whatsapp/conversations")
      .then(r => {
        setConversations(prev => {
          if (selectedLead && !r.data.some(c => c.lead_id === selectedLead.lead_id)) {
            return [selectedLead, ...r.data];
          }
          return r.data;
        });
        if (!activeId && r.data.length > 0) {
          setActiveId(r.data[0].lead_id);
        }
      })
      .catch(e => toast.error(errMsg(e)));
  }

  useEffect(() => {
    loadConvos();
  }, []);

  // Ensure active lead exists even if they have 0 prior WhatsApp messages
  useEffect(() => {
    if (activeId) {
      const existsInList = conversations.some(c => c.lead_id === activeId);
      const isSelected = selectedLead && selectedLead.lead_id === activeId;
      if (!existsInList && !isSelected) {
        api.get(`/leads/${activeId}`).then(r => {
          const ld = r.data;
          const newConvoItem = {
            lead_id: ld.id,
            lead_name: ld.name,
            lead_phone: ld.phone,
            lead_status: ld.status || "Unlabeled",
            lead_source: ld.source || "WhatsApp",
            lead_email: ld.email || "",
            lead_city: ld.city || "",
            lead_budget: ld.budget || 0,
            lead_notes: ld.notes || "",
            last_message: "",
            last_direction: "in",
            last_at: new Date().toISOString(),
            count: 0,
            unread_count: 0,
          };
          setSelectedLead(newConvoItem);
          setConversations(prev => {
            if (prev.some(c => c.lead_id === ld.id)) return prev;
            return [newConvoItem, ...prev];
          });
        }).catch(() => {});
      }
    }
  }, [activeId, conversations, selectedLead]);

  // Poll conversation & active thread every 3 seconds
  useEffect(() => {
    if (activeId) {
      userScrolledUpRef.current = false;
      setUserScrolledUp(false);
      api.get(`/whatsapp/${activeId}`).then(r => setMsgs(r.data)).catch(() => {});
      setAiAnalysis(null);
      setAiSuggestions([]);
      setTranslatedText("");
    }
    const interval = setInterval(() => {
      api.get("/whatsapp/conversations")
        .then(r => {
          setConversations(prev => {
            if (selectedLead && !r.data.some(c => c.lead_id === selectedLead.lead_id)) {
              return [selectedLead, ...r.data];
            }
            return r.data;
          });
        })
        .catch(() => {});
      if (activeId) {
        api.get(`/whatsapp/${activeId}`).then(r => {
          setMsgs(prev => {
            if (prev.length === r.data.length && prev.length > 0) {
              const pLast = prev[prev.length - 1];
              const nLast = r.data[r.data.length - 1];
              if (
                pLast &&
                nLast &&
                pLast.id === nLast.id &&
                pLast.status === nLast.status &&
                pLast.media_url === nLast.media_url &&
                pLast.message === nLast.message
              ) {
                return prev; // keep identical reference so no re-render or effect triggered
              }
            }
            return r.data;
          });
        }).catch(() => {});
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeId, selectedLead]);

  // Scroll to bottom only if user hasn't scrolled up
  useEffect(() => {
    if (chatScrollRef.current && !userScrolledUpRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [msgs]);

  const active = useMemo(() => {
    const fromConvo = conversations.find(c => c.lead_id === activeId);
    if (fromConvo) return fromConvo;
    if (selectedLead && selectedLead.lead_id === activeId) return selectedLead;
    return null;
  }, [conversations, activeId, selectedLead]);


  // Sync active lead data into edit state
  useEffect(() => {
    if (active) {
      setEditStatus(active.lead_status || "Unlabeled");
      setEditNotes(active.lead_notes || "");
    }
  }, [active]);

  // Change view mode & sync URL
  function handleViewMode(mode) {
    setViewMode(mode);
    setSearchParams({ view: mode });
  }

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.lead_name || "").toLowerCase().includes(q);
        const matchPhone = (c.lead_phone || "").toLowerCase().includes(q);
        const matchMsg = (c.last_message || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchMsg) return false;
      }
      // Status
      if (statusFilter === "unread") {
        if (!c.unread_count || c.unread_count === 0) return false;
      } else if (statusFilter === "read") {
        if (c.unread_count && c.unread_count > 0) return false;
      }
      // Channel
      if (channelFilter === "whatsapp") {
        // all current conversations are whatsapp
      } else if (channelFilter === "instagram" || channelFilter === "messenger") {
        return false;
      }
      return true;
    });
  }, [conversations, searchQuery, statusFilter, channelFilter]);

  // Unread total counter
  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, curr) => acc + (curr.unread_count > 0 ? 1 : 0), 0);
  }, [conversations]);

  // Send message
  async function handleSend(customText = null) {
    const textToSend = customText !== null ? customText : text;
    if (!textToSend.trim() || !activeId) return;

    try {
      const { data } = await api.post(`/whatsapp/send-external/${activeId}`, { text: textToSend });
      if (customText === null) setText("");
      setSlashOpen(false);

      const r = await api.get(`/whatsapp/${activeId}`);
      setMsgs(r.data);
      loadConvos();

      if (data.delivered_via_cloud) {
        toast.success("Sent via WhatsApp Cloud API");
      } else {
        toast.success("Message recorded in thread");
      }
    } catch (e) {
      toast.error(errMsg(e, "Failed to send message"));
    }
  }

  // Handle slash commands in input
  function handleInputChange(e) {
    const val = e.target.value;
    setText(val);
    if (val.startsWith("/") && val.length <= 12) {
      setSlashOpen(true);
    } else {
      setSlashOpen(false);
    }
  }

  function applyQuickReply(replyText) {
    setText(replyText);
    setSlashOpen(false);
  }

  // AI Suggest Replies
  async function fetchAiSuggestions() {
    if (!activeId) return;
    setAiBusy(true);
    try {
      const { data } = await api.post(`/ai/whatsapp-reply-suggestions/${activeId}`);
      if (data.suggestions && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
        toast.success("3 AI reply suggestions generated");
      } else {
        // fallback to single reply
        const fallback = await api.post(`/ai/whatsapp-reply/${activeId}`);
        setAiSuggestions([fallback.data.reply]);
      }
    } catch (e) {
      toast.error(errMsg(e, "AI suggestion error"));
    } finally {
      setAiBusy(false);
    }
  }

  // AI Summarize & Deep Analysis
  async function fetchAiSummary() {
    if (!activeId) return;
    setAnalysing(true);
    try {
      const { data } = await api.post(`/ai/whatsapp-analyse/${activeId}`);
      setAiAnalysis(data);
      toast.success("Conversation analysis ready");
    } catch (e) {
      toast.error(errMsg(e, "AI analysis error"));
    } finally {
      setAnalysing(false);
    }
  }

  // Translate Customer Messages
  async function handleTranslate() {
    const lastCustomerMsg = [...msgs].reverse().find(m => m.direction === "in");
    if (!lastCustomerMsg) {
      toast.error("No customer message found to translate");
      return;
    }
    setTranslating(true);
    try {
      const { data } = await api.post("/ai/translate", {
        text: lastCustomerMsg.message,
        target_lang: translateTarget,
      });
      setTranslatedText(data.translated);
      toast.success(`Translated to ${translateTarget}`);
    } catch (e) {
      toast.error(errMsg(e, "Translation failed"));
    } finally {
      setTranslating(false);
    }
  }

  // Generate and Send Payment Link
  async function handleSendPaymentLink() {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setPaymentBusy(true);
    const amountVal = inr(Number(paymentAmount));
    const payMsg = `Payment request: ₹${paymentAmount} for "${paymentPurpose}". Pay securely here: https://rzp.io/l/parsh-${activeId}-${Date.now().toString().slice(-4)}`;
    try {
      await handleSend(payMsg);
      toast.success(`Payment link for ₹${paymentAmount} sent on WhatsApp!`);
      setPaymentPurpose("Advance Retainer / Milestone");
    } catch (e) {
      toast.error(errMsg(e, "Failed to send payment link"));
    } finally {
      setPaymentBusy(false);
    }
  }

  // Schedule Follow-up Task
  async function handleCreateFollowup() {
    if (!followupTitle.trim()) {
      toast.error("Enter a task title");
      return;
    }
    setFollowupBusy(true);
    try {
      await api.post("/tasks", {
        lead_id: activeId,
        title: followupTitle,
        description: `Scheduled follow-up via WhatsApp CRM for ${active?.lead_name || 'lead'}`,
        due_date: new Date(followupDate).toISOString(),
        priority: followupPriority,
        status: "Open"
      });
      toast.success("Follow-up task scheduled successfully!");
    } catch (e) {
      toast.error(errMsg(e, "Failed to schedule follow-up"));
    } finally {
      setFollowupBusy(false);
    }
  }

  // Save Lead Updates
  async function handleSaveLead() {
    if (!activeId) return;
    setSavingLead(true);
    try {
      await api.patch(`/whatsapp/lead-status/${activeId}`, { status: editStatus });
      toast.success("Lead status updated");
      loadConvos();
    } catch (e) {
      toast.error(errMsg(e, "Failed to update lead"));
    } finally {
      setSavingLead(false);
    }
  }

  // Toggle AI Bot pause/resume for active chat
  async function handleToggleAiBot(paused, reason = null) {
    if (!activeId) return;
    setAiBotBusy(true);
    try {
      const res = await api.post(`/whatsapp/leads/${activeId}/toggle-ai-bot`, {
        paused,
        reason: reason || (paused ? "Manually paused by agent" : null)
      });
      toast.success(res.data.detail || (paused ? "AI bot paused for this chat" : "AI bot resumed"));
      setConversations(prev => prev.map(c => c.lead_id === activeId ? { ...c, ai_bot_paused: paused, ai_bot_handover_reason: reason } : c));
      const ms = await api.get(`/whatsapp/${activeId}`);
      setMsgs(ms.data);
    } catch (e) {
      toast.error(errMsg(e, "Failed to toggle AI bot status"));
    } finally {
      setAiBotBusy(false);
    }
  }

  // Schedule Google Meet & send via WhatsApp
  async function handleScheduleMeeting() {
    if (!activeId) return;
    if (!meetDateTime) {
      toast.error("Please select a date and time");
      return;
    }
    setMeetBusy(true);
    try {
      await api.post(`/whatsapp/leads/${activeId}/schedule-meeting`, {
        meeting_time: meetDateTime,
        duration: Number(meetDuration),
        title: meetTitle.trim() || "Discovery Call"
      });
      toast.success("Google Meet scheduled & invite sent on WhatsApp!");
      const ms = await api.get(`/whatsapp/${activeId}`);
      setMsgs(ms.data);
      loadConvos();
    } catch (e) {
      toast.error(errMsg(e, "Failed to schedule meeting"));
    } finally {
      setMeetBusy(false);
    }
  }

  // Delete single message
  async function deleteMsg(msgId) {
    if (!window.confirm("Delete this message?")) return;
    try {
      await api.delete(`/whatsapp/${msgId}`);
      toast.success("Message deleted");
      const r = await api.get(`/whatsapp/${activeId}`);
      setMsgs(r.data);
      loadConvos();
    } catch (e) {
      toast.error(errMsg(e, "Failed to delete message"));
    }
  }

  // Delete thread
  async function deleteThread(leadId) {
    if (!window.confirm("Delete this entire conversation thread?")) return;
    try {
      await api.delete(`/whatsapp/thread/${leadId}`);
      toast.success("Conversation cleared");
      setMsgs([]);
      loadConvos();
    } catch (e) {
      toast.error(errMsg(e, "Failed to clear conversation"));
    }
  }

  // Export transcript
  function exportTranscript() {
    if (!msgs.length || !active) return;
    const lines = msgs.map(m => {
      const sender = m.direction === "out" ? "You (Agent)" : active.lead_name;
      return `[${dateTime(m.created_at)}] ${sender}:\n${m.message}\n`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `WhatsApp_${active.lead_name.replace(/\s+/g, "_")}_transcript.txt`;
    a.click();
    toast.success("Transcript downloaded");
  }

  // Handle file attachment upload & instant send via WhatsApp Cloud API
  async function onFileSelected(e, mediaType) {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    e.target.value = "";
    setAttachMenuOpen(false);

    const toastId = toast.loading(`Uploading ${file.name}…`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/whatsapp/upload-media", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.loading("Sending via WhatsApp Cloud API…", { id: toastId });
      await api.post(`/whatsapp/send-media/${activeId}`, {
        media_type: uploadRes.data.media_type,
        media_url: uploadRes.data.media_url,
        filename: uploadRes.data.filename,
        caption: text.trim() || undefined,
      });

      setText("");
      toast.success("Attachment delivered via WhatsApp!", { id: toastId });
      const r = await api.get(`/whatsapp/${activeId}`);
      setMsgs(r.data);
      loadConvos();
    } catch (err) {
      toast.error(errMsg(err, "Failed to upload or send attachment"), { id: toastId });
    }
  }

  // Send Agency Brochure PDF via WhatsApp
  async function handleSendBrochure() {
    if (!activeId) return;
    setAttachMenuOpen(false);
    const toastId = toast.loading("Delivering Agency Brochure PDF…");
    try {
      const brochureUrl = "https://api.parshagent.com/uploads/brochures/ParshWebCraft_Services_Overview.pdf";
      await api.post(`/whatsapp/send-media/${activeId}`, {
        media_type: "document",
        media_url: brochureUrl,
        filename: "ParshWebCraft_Services_Overview.pdf",
        caption: "ParshWebCraft Technologies - Official Agency Profile & Services Overview",
      });
      toast.success("Agency brochure delivered via WhatsApp!", { id: toastId });
      const r = await api.get(`/whatsapp/${activeId}`);
      setMsgs(r.data);
      loadConvos();
    } catch (err) {
      toast.error(errMsg(err, "Failed to send agency brochure"), { id: toastId });
    }
  }

  // Open Quotation selector dialog for current lead
  async function openQuotationDialog() {
    if (!activeId) return;
    setAttachMenuOpen(false);
    setQuoteModalOpen(true);
    setQuoteLoading(true);
    try {
      const res = await api.get(`/quotations?lead_id=${activeId}`);
      setLeadQuotes(res.data || []);
    } catch (err) {
      toast.error(errMsg(err, "Failed to load quotations"));
    } finally {
      setQuoteLoading(false);
    }
  }

  // Deliver existing quotation PDF via WhatsApp
  async function handleSendQuotation(quoteId) {
    setQuoteSendingId(quoteId);
    try {
      await api.post(`/quotations/${quoteId}/send-whatsapp`);
      toast.success("Quotation PDF sent directly to lead via WhatsApp!");
      setQuoteModalOpen(false);
      const r = await api.get(`/whatsapp/${activeId}`);
      setMsgs(r.data);
      loadConvos();
    } catch (err) {
      toast.error(errMsg(err, "Failed to send quotation via WhatsApp"));
    } finally {
      setQuoteSendingId(null);
    }
  }

  // Quick generate & send new quotation PDF
  async function handleCreateAndSendQuotation() {
    if (!activeId || !newQuoteAmount) return;
    setQuoteSendingId("new");
    try {
      const createRes = await api.post("/quotations", {
        lead_id: activeId,
        amount: parseFloat(newQuoteAmount) || 0,
        status: "Draft",
        notes: newQuoteNotes || undefined,
      });
      const newQuote = createRes.data;
      await api.post(`/quotations/${newQuote.id}/send-whatsapp`);
      toast.success(`Quotation #${newQuote.quotation_number} generated & delivered via WhatsApp!`);
      setQuoteModalOpen(false);
      setNewQuoteNotes("");
      const r = await api.get(`/whatsapp/${activeId}`);
      setMsgs(r.data);
      loadConvos();
    } catch (err) {
      toast.error(errMsg(err, "Failed to generate & send quotation"));
    } finally {
      setQuoteSendingId(null);
    }
  }

  // Apply Interactive Preset
  function applyInteractivePreset(preset) {
    setInteractiveHeader(preset.header || "");
    setInteractiveBody(preset.body || "");
    setInteractiveFooter(preset.footer || "");
    setInteractiveButtons(preset.buttons.map(b => ({ ...b })));
  }

  // Add button to interactive list (max 3)
  function addInteractiveButton() {
    if (interactiveButtons.length >= 3) return;
    setInteractiveButtons(prev => [
      ...prev,
      { id: `btn_${prev.length + 1}`, title: `Option ${prev.length + 1}` }
    ]);
  }

  // Remove button from interactive list
  function removeInteractiveButton(idx) {
    if (interactiveButtons.length <= 1) return;
    setInteractiveButtons(prev => prev.filter((_, i) => i !== idx));
  }

  // Update button in interactive list
  function updateInteractiveButton(idx, field, value) {
    setInteractiveButtons(prev => prev.map((btn, i) => {
      if (i !== idx) return btn;
      return { ...btn, [field]: value };
    }));
  }

  // Send Interactive Quick-Reply CTA message
  async function handleSendInteractive() {
    if (!activeId) return;
    if (!interactiveBody.trim()) {
      toast.error("Please enter a message body");
      return;
    }
    if (!interactiveButtons || interactiveButtons.length === 0) {
      toast.error("At least 1 button is required");
      return;
    }
    for (let i = 0; i < interactiveButtons.length; i++) {
      const b = interactiveButtons[i];
      if (!b.title || !b.title.trim()) {
        toast.error(`Button ${i + 1} title cannot be empty`);
        return;
      }
      if (b.title.trim().length > 20) {
        toast.error(`Button "${b.title}" exceeds 20 characters limit`);
        return;
      }
    }

    setInteractiveSending(true);
    try {
      await api.post(`/whatsapp/send-interactive/${activeId}`, {
        body: interactiveBody.trim(),
        buttons: interactiveButtons.map(b => ({
          id: b.id || `btn_${Math.random().toString(36).substring(7)}`,
          title: b.title.trim().slice(0, 20),
        })),
        header: interactiveHeader.trim() || undefined,
        footer: interactiveFooter.trim() || undefined,
      });
      toast.success("Interactive Quick-Reply CTA delivered to customer WhatsApp!");
      setInteractiveModalOpen(false);
      const r = await api.get(`/whatsapp/${activeId}`);
      setMsgs(r.data);
      loadConvos();
    } catch (err) {
      toast.error(errMsg(err, "Failed to deliver interactive CTA"));
    } finally {
      setInteractiveSending(false);
    }
  }

  // Apply List Preset
  function applyListPreset(preset) {
    setListHeader(preset.header || "");
    setListBody(preset.body || "");
    setListFooter(preset.footer || "");
    setListButtonText(preset.buttonText || "View Services");
    setListSections(preset.sections.map(s => ({
      title: s.title,
      rows: s.rows.map(r => ({ ...r }))
    })));
  }

  // Add row to a section
  function addRowToSection(secIdx) {
    const totalRows = listSections.reduce((acc, s) => acc + s.rows.length, 0);
    if (totalRows >= 10) {
      toast.error("Maximum 10 total items allowed across all sections by WhatsApp");
      return;
    }
    setListSections(prev => prev.map((sec, i) => {
      if (i !== secIdx) return sec;
      return {
        ...sec,
        rows: [
          ...sec.rows,
          { id: `item_${Math.random().toString(36).substring(7)}`, title: `Item ${sec.rows.length + 1}`, description: "" }
        ]
      };
    }));
  }

  // Remove row from a section
  function removeRowFromSection(secIdx, rowIdx) {
    setListSections(prev => prev.map((sec, i) => {
      if (i !== secIdx) return sec;
      return {
        ...sec,
        rows: sec.rows.filter((_, rI) => rI !== rowIdx)
      };
    }));
  }

  // Update row in a section
  function updateRowInSection(secIdx, rowIdx, field, value) {
    setListSections(prev => prev.map((sec, i) => {
      if (i !== secIdx) return sec;
      return {
        ...sec,
        rows: sec.rows.map((row, rI) => {
          if (rI !== rowIdx) return row;
          return { ...row, [field]: value };
        })
      };
    }));
  }

  // Add new section
  function addListSection() {
    if (listSections.length >= 10) return;
    setListSections(prev => [
      ...prev,
      {
        title: `Section ${prev.length + 1}`,
        rows: [
          { id: `item_${prev.length + 1}_1`, title: "New Service", description: "Service details" }
        ]
      }
    ]);
  }

  // Remove section
  function removeListSection(secIdx) {
    if (listSections.length <= 1) return;
    setListSections(prev => prev.filter((_, i) => i !== secIdx));
  }

  // Send Interactive List Menu
  async function handleSendList() {
    if (!activeId) return;
    if (!listBody.trim()) {
      toast.error("Please enter a message body");
      return;
    }
    if (!listButtonText.trim()) {
      toast.error("Please enter a button title (e.g. 'View Services')");
      return;
    }
    const totalRows = listSections.reduce((acc, s) => acc + s.rows.length, 0);
    if (totalRows === 0) {
      toast.error("Please add at least 1 menu item");
      return;
    }
    if (totalRows > 10) {
      toast.error("Maximum 10 items allowed by WhatsApp Cloud API");
      return;
    }

    // Validate rows
    for (let sI = 0; sI < listSections.length; sI++) {
      const sec = listSections[sI];
      if (!sec.title.trim()) {
        toast.error(`Section ${sI + 1} must have a title`);
        return;
      }
      for (let rI = 0; rI < sec.rows.length; rI++) {
        const row = sec.rows[rI];
        if (!row.title.trim()) {
          toast.error(`Item in Section "${sec.title}" must have a title`);
          return;
        }
        if (row.title.length > 24) {
          toast.error(`Title "${row.title}" exceeds 24 chars limit`);
          return;
        }
        if (row.description && row.description.length > 72) {
          toast.error(`Description for "${row.title}" exceeds 72 chars limit`);
          return;
        }
      }
    }

    setListSending(true);
    try {
      await api.post(`/whatsapp/send-list/${activeId}`, {
        body: listBody.trim(),
        button_text: listButtonText.trim().slice(0, 20),
        sections: listSections.map(s => ({
          title: s.title.trim().slice(0, 24),
          rows: s.rows.map(r => ({
            id: r.id || `item_${Math.random().toString(36).substring(7)}`,
            title: r.title.trim().slice(0, 24),
            description: r.description ? r.description.trim().slice(0, 72) : undefined,
          })),
        })),
        header: listHeader.trim() || undefined,
        footer: listFooter.trim() || undefined,
      });
      toast.success("Interactive List Menu delivered to customer WhatsApp!");
      setListModalOpen(false);
      const r = await api.get(`/whatsapp/${activeId}`);
      setMsgs(r.data);
      loadConvos();
    } catch (err) {
      toast.error(errMsg(err, "Failed to deliver List Menu"));
    } finally {
      setListSending(false);
    }
  }

  // Apply CTA Preset
  function applyCtaPreset(preset) {
    setCtaHeader(preset.header || "");
    setCtaBody(preset.body || "");
    setCtaDisplayText(preset.displayText || "Open Link");
    setCtaUrl(preset.url || "");
    setCtaFooter(preset.footer || "");
  }

  // Send Interactive CTA URL & Action Link
  async function handleSendCtaUrl() {
    if (!activeId) {
      toast.error("Please select a lead first");
      return;
    }
    if (!ctaBody.trim()) {
      toast.error("Body message cannot be empty");
      return;
    }
    if (!ctaDisplayText.trim()) {
      toast.error("Button label cannot be empty");
      return;
    }
    if (!ctaUrl.trim()) {
      toast.error("Target URL cannot be empty");
      return;
    }

    let targetUrl = ctaUrl.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    setCtaSending(true);
    try {
      await api.post(`/whatsapp/send-cta-url/${activeId}`, {
        body: ctaBody.trim(),
        display_text: ctaDisplayText.trim().slice(0, 20),
        url: targetUrl,
        header: ctaHeader.trim() || undefined,
        footer: ctaFooter.trim() || undefined,
      });
      toast.success("Interactive CTA Link delivered to customer WhatsApp!");
      setCtaModalOpen(false);
      const r = await api.get(`/whatsapp/${activeId}`);
      setMsgs(r.data);
      loadConvos();
    } catch (err) {
      toast.error(errMsg(err, "Failed to deliver CTA Link"));
    } finally {
      setCtaSending(false);
    }
  }

  // Render rich media cards (PDF, Image) or standard text with crystal-clear readability
  function renderBubbleContent(m, isOut) {
    // 0. Special Rich Meta Broadcast Template: Diwali 2026
    const isDiwaliTemplate = m.message && m.message.includes("template:parshwebcraft_diwali_2026");
    if (isDiwaliTemplate) {
      return (
        <div className="flex flex-col gap-2.5 max-w-[320px]">
          <div className="overflow-hidden rounded-xl border border-white/20 shadow-sm bg-black/10">
            <img
              src="/images/parshwebcraft_diwali_2026.png"
              alt="Diwali Wishes"
              className="w-full h-auto max-h-56 object-cover"
            />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1">
            <span>🪔</span>
            <span>WhatsApp Broadcast • Diwali Greeting</span>
          </div>
          <div className={`text-[13px] leading-relaxed whitespace-pre-wrap select-text font-normal ${isOut ? "text-white" : "text-slate-900"}`}>
            Wishing you and your family a very Happy &amp; Prosperous Diwali! 🪔✨
            {"\n\n"}
            May the divine light of diyas bring endless happiness, good health, and immense success to your business and home.
            {"\n\n"}
            Thank you for being an esteemed part of the ParshWebCraft journey!
            {"\n\n"}
            Warm regards,
            {"\n"}
            <strong>Gauransh &amp; Team ParshWebCraft 🌟</strong>
          </div>
          <div className="text-[10px] text-white/60 pt-1 border-t border-white/15">
            ParshWebCraft Technologies
          </div>
          <div className="pt-1 flex flex-col gap-1">
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-white/20 border border-white/30 text-white">
              <span>✨ Happy Diwali</span>
            </div>
          </div>
        </div>
      );
    }

    const isDoc = m.media_type === "document" || (m.message && m.message.includes("[DOCUMENT]"));
    const isImg = m.media_type === "image" || (m.message && m.message.includes("[IMAGE]"));
    const isVideo = m.media_type === "video" || (m.message && (m.message.includes("[VIDEO]") || m.message.startsWith("[Video]")));

    if (isDoc) {
      let filename = m.media_filename;
      let caption = m.media_caption;
      if (!filename && m.message) {
        const match = m.message.match(/\[DOCUMENT\]\s*([^\s-]+(?:\.[a-zA-Z0-9]+)?)/i);
        if (match) filename = match[1];
      }
      if (!caption && m.message) {
        const parts = m.message.split(" - ");
        if (parts.length > 1) caption = parts.slice(1).join(" - ");
      }
      filename = filename || "Document.pdf";

      return (
        <div className="flex flex-col gap-2">
          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${
            isOut ? "wa-doc-box-out" : "wa-doc-box-in"
          }`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
              isOut ? "bg-white text-[#005c4b]" : "bg-rose-100 text-rose-700"
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="text-xs font-bold truncate wa-doc-title" title={filename}>
                {filename}
              </div>
              <div className="text-[10px] font-medium wa-doc-sub">
                PDF Document
              </div>
            </div>
            {m.media_url && (
              <a
                href={m.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 shadow-2xs ${
                  isOut ? "wa-btn-doc" : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
                title="Open / Download Document"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          {caption && (
            <div className={`text-[13px] leading-relaxed whitespace-pre-wrap select-text font-medium ${
              isOut ? "text-white" : "text-slate-900"
            }`}>
              {caption}
            </div>
          )}
        </div>
      );
    }

    if (isImg) {
      let caption = m.media_caption;
      if (!caption && m.message) {
        const parts = m.message.split(" - ");
        if (parts.length > 1) caption = parts.slice(1).join(" - ");
      }

      return (
        <div className="flex flex-col gap-2">
          {m.media_url ? (
            <a href={m.media_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200">
              <img src={m.media_url} alt="Attachment" className="max-h-60 w-auto rounded-xl object-cover hover:opacity-95 transition-opacity" />
            </a>
          ) : (
            <div className={`flex items-center gap-2 p-2 rounded-lg ${isOut ? "bg-white/20" : "bg-slate-100"}`}>
              <ImageIcon className="w-4 h-4" />
              <span className="text-xs font-semibold">[Image Attachment]</span>
            </div>
          )}
          {caption && (
            <div className={`text-[13px] leading-relaxed whitespace-pre-wrap select-text font-medium ${
              isOut ? "text-white" : "text-slate-900"
            }`}>
              {caption}
            </div>
          )}
        </div>
      );
    }

    if (isVideo) {
      let caption = m.media_caption;
      if (!caption && m.message && !m.message.startsWith("[Video]")) {
        const parts = m.message.split(" - ");
        if (parts.length > 1) caption = parts.slice(1).join(" - ");
        else caption = m.message;
      }

      return (
        <div className="flex flex-col gap-2 min-w-[240px] max-w-[340px]">
          {m.media_url ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black/5 dark:bg-black/30 shadow-2xs">
              <video
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-72 rounded-xl object-contain bg-black"
                src={m.media_url}
              >
                Your browser does not support video playback.
              </video>
            </div>
          ) : (
            <div className={`flex items-center gap-2 p-2.5 rounded-lg ${isOut ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
              <Video className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold">[Video Attachment]</span>
            </div>
          )}
          {caption && (
            <div className={`text-[13px] leading-relaxed whitespace-pre-wrap select-text font-medium ${
              isOut ? "text-white" : "text-slate-900"
            }`}>
              {caption}
            </div>
          )}
        </div>
      );
    }

    const isAudio = m.media_type === "audio" || (m.message && m.message.includes("[Voice Note]"));
    if (isAudio) {
      return (
        <div className="flex flex-col gap-2 min-w-[260px] max-w-[320px]">
          {/* Audio Player Card */}
          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${
            isOut ? "bg-emerald-800/80 text-white" : "bg-slate-100 dark:bg-slate-800/90 text-slate-900 border border-slate-200 dark:border-white/10"
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
              isOut ? "bg-white text-[#005c4b]" : "bg-emerald-100 text-emerald-700"
            }`}>
              <Mic className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold flex items-center justify-between">
                <span>WhatsApp Voice Note</span>
                <span className="text-[9px] opacity-75 font-mono">OGG / OPUS</span>
              </div>
              {m.media_url ? (
                <audio
                  controls
                  className="w-full h-7 mt-1 rounded-md"
                  src={m.media_url}
                  preload="metadata"
                />
              ) : (
                <div className="text-[10px] text-slate-500 italic mt-0.5">Voice recording</div>
              )}
            </div>
          </div>

          {/* Transcribed Text Display */}
          {m.message && (
            <div className={`text-[12.5px] leading-relaxed whitespace-pre-wrap select-text font-medium p-1 ${
              isOut ? "text-white" : "text-slate-900 dark:text-slate-100"
            }`}>
              {m.message}
            </div>
          )}
        </div>
      );
    }


    // Check for interactive buttons, list payload, or CTA URL payload
    let buttonsList = null;
    let listPayload = null;
    let ctaPayload = null;
    let selectedReply = null;
    if (m.buttons_json) {
      try {
        const parsed = typeof m.buttons_json === "string" ? JSON.parse(m.buttons_json) : m.buttons_json;
        if (Array.isArray(parsed)) {
          buttonsList = parsed;
        } else if (parsed && parsed.sections) {
          listPayload = parsed;
        } else if (parsed && parsed.url) {
          ctaPayload = parsed;
        } else if (parsed && parsed.selected_title) {
          selectedReply = parsed.selected_title;
        }
      } catch (e) {
        // ignore parse error
      }
    }

    const isButtonReply = m.interactive_type === "button_reply";
    const isListReply = m.interactive_type === "list_reply";

    return (
      <div className="flex flex-col gap-1.5">
        {isButtonReply && (
          <div className="inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Interactive Option Selected</span>
          </div>
        )}

        {isListReply && (
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
            <span>📋 Selected from Services Menu</span>
          </div>
        )}

        <div className={`text-[13.5px] leading-relaxed whitespace-pre-wrap select-text font-normal ${
          isOut ? "text-white" : "text-slate-900"
        }`}>
          {m.message}
        </div>

        {/* Quick-Reply Buttons Stack */}
        {buttonsList && buttonsList.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/20 flex flex-col gap-1.5">
            {buttonsList.map((btn, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs ${
                  isOut
                    ? "bg-white/15 border border-white/30 text-white hover:bg-white/25"
                    : "bg-slate-100 border border-slate-200 text-slate-800 hover:bg-slate-200"
                }`}
              >
                <MousePointerClick className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">{btn.title || btn.id}</span>
              </div>
            ))}
          </div>
        )}

        {/* List Menu Box */}
        {listPayload && (
          <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-col gap-2">
            <div className={`p-2.5 rounded-xl border text-left shadow-2xs ${
              isOut ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">Interactive Menu</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isOut ? "bg-white/20 text-white" : "bg-teal-100 text-teal-800"
                }`}>
                  {listPayload.sections.reduce((acc, s) => acc + s.rows.length, 0)} Options
                </span>
              </div>
              <div className="text-xs font-bold mb-1.5 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-teal-300 shrink-0" />
                <span>☰ {listPayload.button_text || "View Services"}</span>
              </div>
              {listPayload.sections && listPayload.sections.length > 0 && (
                <div className="space-y-2 mt-2 pt-2 border-t border-white/15 text-[11px]">
                  {listPayload.sections.map((sec, sI) => (
                    <div key={sI} className="space-y-1">
                      <div className="font-bold text-[10px] uppercase opacity-75">{sec.title}</div>
                      <div className="pl-1.5 space-y-1">
                        {sec.rows.map((r, rI) => (
                          <div key={rI} className="flex items-baseline gap-1.5">
                            <span className="opacity-60 text-xs">•</span>
                            <div>
                              <span className="font-semibold">{r.title}</span>
                              {r.description && <span className="opacity-75 text-[10px] ml-1.5 font-normal">({r.description})</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA URL Action Link Card */}
        {ctaPayload && (
          <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-col gap-1.5">
            {ctaPayload.header && (
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-85 px-0.5">
                {ctaPayload.header}
              </div>
            )}
            <a
              href={ctaPayload.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer group ${
                isOut
                  ? "bg-white text-emerald-800 hover:bg-slate-50 hover:shadow-md"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate">{ctaPayload.display_text || "Open Link"}</span>
            </a>
            {ctaPayload.footer && (
              <div className="text-[10px] opacity-75 text-center mt-0.5">
                {ctaPayload.footer}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Search leads for New Chat dialog
  async function searchLeadsForChat(term) {
    setLeadSearchTerm(term);
    setLeadSearchLoading(true);
    try {
      const { data } = await api.get(`/leads?page_size=20&search=${encodeURIComponent(term)}`);
      setLeadSearchResults(data.items || []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLeadSearchLoading(false);
    }
  }

  // Move Kanban card between columns
  async function moveKanbanCard(leadId, targetCol) {
    // optimistic update
    setConversations(prev => prev.map(c => c.lead_id === leadId ? { ...c, lead_status: targetCol } : c));
    try {
      await api.patch(`/whatsapp/lead-status/${leadId}`, { status: targetCol });
      toast.success(`Moved to "${targetCol}"`);
    } catch (e) {
      toast.error(errMsg(e, "Failed to update column"));
      loadConvos();
    }
  }

  // Filter messages in thread if searching
  const displayedMsgs = useMemo(() => {
    if (!inThreadSearch || !threadSearchTerm.trim()) return msgs;
    const term = threadSearchTerm.toLowerCase();
    return msgs.filter(m => (m.message || "").toLowerCase().includes(term));
  }, [msgs, inThreadSearch, threadSearchTerm]);

  return (
    <div data-testid="whatsapp-page" className="space-y-2.5 sm:space-y-3 flex flex-col h-full min-h-0 w-full max-w-full overflow-hidden">
      {/* ── Top Bar: Alpha CRM Standard Header (Hidden on mobile when chat is open) ── */}
      <div className={`${mobileShowChat ? "hidden lg:flex" : "flex"} bg-white dark:bg-[#0F1926] rounded-2xl border border-slate-200/80 dark:border-[#1E2D40] p-2.5 sm:px-4 sm:py-2.5 shadow-xs flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0 w-full max-w-full overflow-hidden`}>
        {/* Row 1 on mobile: Title + View Switcher */}
        <div className="flex items-center justify-between gap-2 min-w-0 w-full md:w-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 dark:bg-[#062D24] flex items-center justify-center text-emerald-600 dark:text-[#34D399] border border-emerald-500/20 dark:border-[#0E5343] shrink-0">
              {viewMode === "inbox" ? (
                <MessageCircle className="w-5 h-5" />
              ) : (
                <Columns className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h1 className="font-semibold text-slate-900 dark:text-[#F1F5F9] text-base sm:text-lg truncate">
                  {viewMode === "inbox" ? "WhatsApp Inbox" : "Kanban Board"}
                </h1>
                <span className="hidden xs:inline-flex text-[10px] font-medium bg-emerald-50 dark:bg-[#062D24] text-emerald-700 dark:text-[#34D399] px-1.5 py-0.2 rounded-full border border-emerald-200 dark:border-[#0E5343] shrink-0">
                  Alpha CRM
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">
                {viewMode === "inbox"
                  ? `${conversations.length} chats · ${totalUnread} unread`
                  : "Drag & drop chats across label columns"}
              </p>
            </div>
          </div>

          {/* View Switcher (Inbox vs Kanban) */}
          <div className="bg-slate-100/80 dark:bg-[#121D2C] p-0.5 rounded-xl flex items-center border border-slate-200/60 dark:border-[#1E2D40] text-xs font-medium shrink-0">
            <button
              onClick={() => handleViewMode("inbox")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                viewMode === "inbox"
                  ? "bg-white dark:bg-[#1C2A3D] text-slate-900 dark:text-[#F1F5F9] shadow-xs font-semibold"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9]"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-[#34D399]" />
              <span className="hidden xs:inline">Inbox</span>
              {totalUnread > 0 && (
                <span className="ml-1 bg-rose-500 text-white rounded-full text-[10px] px-1.5 py-0.2 leading-tight">
                  {totalUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => handleViewMode("kanban")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-[#1C2A3D] text-slate-900 dark:text-[#F1F5F9] shadow-xs font-semibold"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9]"
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden xs:inline">Kanban</span>
            </button>
          </div>
        </div>

        {/* Row 2 on mobile: Right Action Tools */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-0.5 shrink-0">
          {/* Official WhatsApp Business Status & Connect */}
          <Button
            size="sm"
            variant="outline"
            className={`h-8 gap-1.5 text-xs rounded-xl font-medium border shrink-0 transition-colors ${
              waStatus?.connected
                ? "bg-emerald-50 dark:bg-[#062D24] text-emerald-700 dark:text-[#34D399] border-emerald-200 dark:border-[#0E5343] hover:bg-emerald-100 dark:hover:bg-[#093d31]"
                : "bg-indigo-50 dark:bg-[#182038] text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-[#2A3654] hover:bg-indigo-100 dark:hover:bg-[#202b4c]"
            }`}
            onClick={() => setConnectModalOpen(true)}
            title="Meta WhatsApp Business Connection"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-500" />
            {waStatus?.connected ? (
              <span className="truncate max-w-[110px] font-mono">{waStatus.display_phone_number || "Connected"}</span>
            ) : (
              <span>Connect</span>
            )}
          </Button>

          <Link to="/wa-meta-manual" className="shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#121D2C] text-slate-700 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1C2A3D] dark:hover:text-[#F1F5F9] h-8 gap-1.5 text-xs rounded-xl"
              title="Meta API Keys (Manual Setup)"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-[#94A3B8]" />
              <span className="hidden sm:inline">Meta API Keys</span>
              <span className="sm:hidden">Keys</span>
            </Button>
          </Link>

          <Button
            size="sm"
            variant="outline"
            className="border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#121D2C] text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#1C2A3D] h-8 gap-1.5 text-xs rounded-xl shrink-0"
            onClick={() => {
              setNewChatOpen(true);
              searchLeadsForChat("");
            }}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-[#34D399]" />
            <span>New Chat</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#121D2C] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1C2A3D] dark:hover:text-[#F1F5F9] h-8 w-8 p-0 rounded-xl shrink-0"
            onClick={loadConvos}
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          {active && (
            <Button
              size="sm"
              variant="outline"
              className={`h-8 gap-1 text-xs rounded-xl shrink-0 border border-slate-200 dark:border-[#1E2D40] ${
                rightDrawerOpen
                  ? "bg-slate-100 dark:bg-[#1C2A3D] text-slate-900 dark:text-[#F1F5F9]"
                  : "bg-white dark:bg-[#121D2C] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1C2A3D] dark:hover:text-[#F1F5F9]"
              }`}
              onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
              title="Toggle AI Assist & Info"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Chat Info</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── VIEW 1: INBOX VIEW ── */}
      {viewMode === "inbox" && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden w-full max-w-full">
          {/* Left Column: Conversations Sidebar (3 or 4 cols) */}
          <Card className={`${mobileShowChat ? "hidden lg:flex" : "flex"} lg:col-span-4 xl:col-span-3 border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#0F1926] flex-col min-h-0 overflow-hidden rounded-2xl shadow-xs`}>
            {/* Search and Top Controls */}
            <div className="p-3 border-b border-slate-100 dark:border-[#1E2D40] space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-[#627588] absolute left-3 top-2.5" />
                <Input
                  placeholder="Search chats, leads, numbers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs rounded-xl bg-slate-50/70 dark:bg-[#121D2C] border-slate-200 dark:border-[#1E2D40] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#627588] focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:text-[#627588] dark:hover:text-[#F1F5F9]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                {["all", "unread", "read"].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
                      statusFilter === st
                        ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-[#121D2C] text-slate-600 dark:text-[#8899AC] border border-transparent dark:border-[#1E2D40] hover:bg-slate-200/70 dark:hover:bg-[#182638] dark:hover:text-[#F1F5F9]"
                    }`}
                  >
                    {st}
                    {st === "unread" && totalUnread > 0 && (
                      <span className="ml-1.5 bg-rose-500 text-white rounded-full text-[10px] px-1.5 py-0.2">
                        {totalUnread}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Channel Tabs */}
              <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-0.5 no-scrollbar">
                <button
                  onClick={() => setChannelFilter("all")}
                  className={`px-2 py-0.5 rounded-full border transition-all ${
                    channelFilter === "all"
                      ? "border-emerald-500 dark:border-[#0E5343] bg-emerald-50 dark:bg-[#062D24] text-emerald-800 dark:text-[#34D399] font-medium"
                      : "border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#121D2C] text-slate-600 dark:text-[#8899AC] hover:border-slate-300 dark:hover:border-[#2D3E54] dark:hover:bg-[#182638] dark:hover:text-[#F1F5F9]"
                  }`}
                >
                  All {conversations.length}
                </button>
                <button
                  onClick={() => setChannelFilter("whatsapp")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
                    channelFilter === "whatsapp"
                      ? "border-emerald-500 dark:border-[#0E5343] bg-emerald-50 dark:bg-[#062D24] text-emerald-800 dark:text-[#34D399] font-medium"
                      : "border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#121D2C] text-slate-600 dark:text-[#8899AC] hover:border-slate-300 dark:hover:border-[#2D3E54] dark:hover:bg-[#182638] dark:hover:text-[#F1F5F9]"
                  }`}
                >
                  <WhatsAppIcon className="w-3 h-3 text-emerald-600 dark:text-[#34D399]" />
                  WhatsApp {conversations.length}
                </button>
                <button
                  onClick={() => setChannelFilter("instagram")}
                  className={`px-2 py-0.5 rounded-full border transition-all ${
                    channelFilter === "instagram"
                      ? "border-emerald-500 dark:border-[#0E5343] bg-emerald-50 dark:bg-[#062D24] text-emerald-800 dark:text-[#34D399] font-medium"
                      : "border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#121D2C] text-slate-500 dark:text-[#8899AC] hover:border-slate-300 dark:hover:border-[#2D3E54] dark:hover:bg-[#182638] dark:hover:text-[#F1F5F9]"
                  }`}
                >
                  Instagram 0
                </button>
                <button
                  onClick={() => setChannelFilter("messenger")}
                  className={`px-2 py-0.5 rounded-full border transition-all ${
                    channelFilter === "messenger"
                      ? "border-emerald-500 dark:border-[#0E5343] bg-emerald-50 dark:bg-[#062D24] text-emerald-800 dark:text-[#34D399] font-medium"
                      : "border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#121D2C] text-slate-500 dark:text-[#8899AC] hover:border-slate-300 dark:hover:border-[#2D3E54] dark:hover:bg-[#182638] dark:hover:text-[#F1F5F9]"
                  }`}
                >
                  Messenger 0
                </button>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 dark:divide-[#1A2636]" data-testid="whatsapp-conversations">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-[#7E8F9F] space-y-2">
                  <MessageCircle className="w-8 h-8 mx-auto opacity-40 text-slate-300 dark:text-[#627588]" />
                  <p className="text-xs">No conversations found</p>
                </div>
              ) : (
                filteredConversations.map(c => {
                  const isCurrent = activeId === c.lead_id;
                  const labelStyle =
                    c.lead_status === "Needs human"
                      ? "bg-rose-50 dark:bg-[#2C151B] text-rose-700 dark:text-[#FB7185] border-rose-200 dark:border-[#4C1D24]"
                      : c.lead_status === "Won" || c.lead_status === "VIP"
                      ? "bg-emerald-50 dark:bg-[#062D24] text-emerald-700 dark:text-[#34D399] border-emerald-200 dark:border-[#0E5343]"
                      : c.lead_status === "Follow Up"
                      ? "bg-amber-50 dark:bg-[#291E0D] text-amber-700 dark:text-[#FBBF24] border-amber-200 dark:border-[#4B3312]"
                      : "bg-slate-100 dark:bg-[#162232] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#1E2D40]";

                  return (
                    <button
                      key={c.lead_id}
                      data-testid={`convo-${c.lead_id}`}
                      onClick={() => {
                        setActiveId(c.lead_id);
                        setMobileShowChat(true);
                        if (typeof window !== "undefined" && window.innerWidth < 1024) {
                          setRightDrawerOpen(false);
                        }
                      }}
                      className={`w-full text-left p-3 transition-colors relative flex items-start gap-3 hover:bg-slate-50/80 dark:hover:bg-[#162232] ${
                        isCurrent
                          ? "bg-emerald-50/40 dark:bg-[#1C2A3D] border-l-4 border-l-emerald-600 dark:border-l-emerald-500 shadow-2xs"
                          : "border-l-4 border-l-transparent dark:bg-transparent"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <Avatar className={`w-10 h-10 border ${getAvatarColor(c.lead_name)} font-semibold text-xs`}>
                          <AvatarFallback className={getAvatarColor(c.lead_name)}>
                            {getInitials(c.lead_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0F1926]" />
                      </div>

                      {/* Info & Message Preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-xs text-slate-900 dark:text-[#F1F5F9] truncate">
                            {c.lead_name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-[#7E8F9F] shrink-0 font-medium">
                            {relative(c.last_at)}
                          </span>
                        </div>

                        {/* Phone */}
                        <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate mb-1">
                          {c.lead_phone || "No phone"}
                        </div>

                        {/* Last Message Snippet */}
                        <div className="text-xs text-slate-600 dark:text-[#CBD5E1] truncate flex items-center gap-1.5">
                          {c.last_direction === "out" ? (
                            c.last_status === "read" ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" title="Read by customer" />
                            ) : c.last_status === "delivered" ? (
                              <CheckCheck className="w-3.5 h-3.5 text-slate-400 dark:text-[#7E8F9F] shrink-0" title="Delivered to device" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-400 dark:text-[#7E8F9F] shrink-0" title="Sent by server" />
                            )
                          ) : (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600 dark:text-[#34D399] shrink-0" />
                          )}
                          <span className="truncate">
                            {c.last_message && c.last_message.includes("template:parshwebcraft_diwali_2026")
                              ? "🪔 Diwali Greeting Template"
                              : c.last_message || "(Empty chat)"}
                          </span>
                        </div>

                        {/* Badges footer: Channel pill + Tag pill + Unread badge */}
                        <div className="flex items-center justify-between gap-1.5 mt-2">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 dark:bg-[#062D24] text-emerald-700 dark:text-[#34D399] px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-[#0E5343]">
                              <WhatsAppIcon className="w-2.5 h-2.5 text-emerald-600 dark:text-[#34D399]" />
                              WhatsApp
                            </span>
                            {c.ai_bot_paused && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-50 dark:bg-[#2C151B] text-rose-700 dark:text-[#FB7185] px-1.5 py-0.5 rounded border border-rose-200 dark:border-[#4C1D24] shrink-0">
                                Needs human
                              </span>
                            )}
                            <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border truncate ${labelStyle}`}>
                              {c.lead_status || "Unlabeled"}
                            </span>
                          </div>

                          {c.unread_count > 0 && (
                            <span className="bg-rose-500 text-white rounded-full text-[10px] font-bold px-1.5 py-0.2 shrink-0">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Center Column: WhatsApp Chat Canvas */}
          <Card className={`${!mobileShowChat ? "hidden lg:flex" : "flex"} ${
            rightDrawerOpen ? "lg:col-span-8 xl:col-span-6" : "lg:col-span-8 xl:col-span-9"
          } border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#0F1926] flex-col min-h-0 overflow-hidden rounded-2xl shadow-xs transition-all`}>
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-[#7E8F9F] text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-[#062D24] flex items-center justify-center text-emerald-600 dark:text-[#34D399] mb-3 border border-emerald-100 dark:border-[#0E5343]">
                  <WhatsAppIcon className="w-7 h-7 text-emerald-600 dark:text-[#34D399]" />
                </div>
                <h3 className="font-semibold text-slate-700 dark:text-[#F1F5F9] text-sm">Select a Conversation</h3>
                <p className="text-xs text-slate-400 dark:text-[#7E8F9F] mt-1 max-w-xs">
                  Choose a contact from the left sidebar or start a new chat to begin messaging on WhatsApp.
                </p>
              </div>
            ) : (
              <>
                {/* ── Thread Header ── */}
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 wa-thread-header flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="lg:hidden h-8 w-8 p-0 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] shrink-0 -ml-1"
                      onClick={() => setMobileShowChat(false)}
                      title="Back to conversations"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Avatar className={`w-8.5 h-8.5 sm:w-9 sm:h-9 border ${getAvatarColor(active.lead_name)} font-semibold text-xs shrink-0`}>
                      <AvatarFallback className={getAvatarColor(active.lead_name)}>
                        {getInitials(active.lead_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="font-bold wa-header-title text-sm truncate">
                          {active.lead_name}
                        </span>
                        {active.lead_status && (
                          <span className="text-[10px] bg-slate-100 dark:bg-[#162232] text-slate-800 dark:text-[#94A3B8] px-1.5 sm:px-2 py-0.2 rounded-full border border-slate-300 dark:border-[#1E2D40] font-medium shrink-0">
                            {active.lead_status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs wa-header-sub font-medium">
                        <span className="truncate">{active.lead_phone || "No phone"}</span>
                        <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                        <Link
                          to={`/leads/${active.lead_id}`}
                          className="hidden sm:inline-flex text-emerald-700 dark:text-[#34D399] hover:underline items-center gap-0.5 text-[11px] font-semibold shrink-0"
                        >
                          View lead <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions: Clubbed into a single Info (i) dropdown button */}
                  <div className="flex items-center gap-1 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8.5 w-8.5 p-0 rounded-xl wa-btn-icon border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#121D2C] text-slate-700 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1C2A3D] dark:hover:text-[#F1F5F9] shadow-2xs"
                          title="Chat Options & Details"
                        >
                          <Info className="w-4 h-4 text-slate-700 dark:text-[#94A3B8]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-xl rounded-xl border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#152233] z-50">
                        {/* Chat Info & AI Assist side drawer */}
                        <DropdownMenuItem
                          onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
                          className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1C2A3D] font-medium text-slate-800 dark:text-[#E2E8F0] hover:dark:text-[#F1F5F9]"
                        >
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Chat Info & AI Assist</span>
                        </DropdownMenuItem>

                        {/* View Lead Profile in CRM */}
                        <DropdownMenuItem asChild>
                          <Link
                            to={`/leads/${active.lead_id}`}
                            className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1C2A3D] font-medium text-slate-800 dark:text-[#E2E8F0] hover:dark:text-[#F1F5F9]"
                          >
                            <User className="w-4 h-4 text-emerald-600 dark:text-[#34D399] shrink-0" />
                            <span>View Lead Profile</span>
                            <ExternalLink className="w-3 h-3 ml-auto text-slate-400 dark:text-[#7E8F9F]" />
                          </Link>
                        </DropdownMenuItem>

                        {/* Search in Conversation */}
                        <DropdownMenuItem
                          onClick={() => setInThreadSearch(!inThreadSearch)}
                          className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1C2A3D] font-medium text-slate-800 dark:text-[#E2E8F0] hover:dark:text-[#F1F5F9]"
                        >
                          <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>Search in Chat</span>
                        </DropdownMenuItem>

                        {/* Export / Download Transcript */}
                        <DropdownMenuItem
                          onClick={exportTranscript}
                          className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1C2A3D] font-medium text-slate-800 dark:text-[#E2E8F0] hover:dark:text-[#F1F5F9]"
                        >
                          <Download className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>Download Transcript</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-[#1E2D40]" />

                        {/* Clear Chat History */}
                        <DropdownMenuItem
                          onClick={() => deleteThread(active.lead_id)}
                          className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-rose-50 dark:hover:bg-[#2C151B] font-medium text-rose-600 dark:text-[#FB7185] focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-[#2C151B]"
                        >
                          <X className="w-4 h-4 text-rose-600 dark:text-[#FB7185] shrink-0" />
                          <span>Clear Chat History</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Optional in-thread search bar */}
                {inThreadSearch && (
                  <div className="px-4 py-2 bg-slate-50 dark:bg-[#0F1926] border-b border-slate-200 dark:border-[#1E2D40] flex items-center gap-2 text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#627588]" />
                    <Input
                      placeholder="Search within this chat..."
                      value={threadSearchTerm}
                      onChange={e => setThreadSearchTerm(e.target.value)}
                      className="h-7 text-xs bg-white dark:bg-[#121D2C] border-slate-200 dark:border-[#1E2D40] text-slate-900 dark:text-[#F1F5F9]"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F1F5F9]"
                      onClick={() => {
                        setInThreadSearch(false);
                        setThreadSearchTerm("");
                      }}
                    >
                      Close
                    </Button>
                  </div>
                )}

                {/* ── Chat Messages Area (Authentic WhatsApp Style) ── */}
                <div
                  ref={chatScrollRef}
                  onScroll={handleChatScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EFEAE2] wa-chat-bg relative transition-colors"
                >
                  {/* Date separator pill */}
                  <div className="flex justify-center my-1">
                    <span className="bg-white/90 dark:bg-[#182229] text-slate-600 dark:text-slate-300 text-[11px] font-medium px-3 py-1 rounded-full shadow-2xs border border-slate-200/70 dark:border-slate-800">
                      Messages encrypted via WhatsApp Cloud API
                    </span>
                  </div>

                  {displayedMsgs.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-[#7E8F9F] my-auto">
                      <div className="w-12 h-12 rounded-full bg-white dark:bg-[#121D2C] shadow-xs flex items-center justify-center text-emerald-600 dark:text-[#34D399] mb-2 border border-slate-200 dark:border-[#1E2D40]">
                        <WhatsAppIcon className="w-6 h-6 text-emerald-600 dark:text-[#34D399]" />
                      </div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-[#F1F5F9]">Start chat with {active.lead_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1 max-w-xs">
                        {active.lead_phone ? `Phone: ${active.lead_phone}` : "No phone number set"}. Type a message below or use quick replies to send via WhatsApp.
                      </p>
                    </div>
                  )}

                  {displayedMsgs.map(m => {
                    const isOut = m.direction === "out";
                    const isNote = m.direction === "note" || m.message?.startsWith("[INTERNAL NOTE]");

                    if (isNote) {
                      return (
                        <div
                          key={m.id}
                          className="my-3 p-3.5 rounded-xl bg-amber-50/95 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 space-y-1 shadow-xs max-w-xl mx-auto"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-400">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              INTERNAL NOTE - NOT SENT TO THE CUSTOMER
                            </div>
                            <span className="text-[10px] text-amber-700/70 font-mono">
                              {dateTime(m.created_at)}
                            </span>
                          </div>
                          <p className="leading-relaxed font-medium pt-0.5">
                            ☕ {m.message.replace(/^\[INTERNAL NOTE\]\s*/, "")}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`group flex items-end gap-1.5 ${isOut ? "justify-end" : "justify-start"}`}
                      >
                        {/* Inbound Message Bubble */}
                        {!isOut && (
                          <div className="max-w-[78%] relative">
                            <div className="wa-bubble-in rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-left">
                              {renderBubbleContent(m, false)}
                              <div className="flex items-center justify-end gap-1 text-[10px] wa-time mt-1">
                                <span>{dateTime(m.created_at)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteMsg(m.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 bg-white dark:bg-[#152233] rounded-full p-1 shadow border border-slate-200 dark:border-[#1E2D40] text-slate-400 hover:text-rose-600 text-[10px]"
                              title="Delete message"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* Outbound Message Bubble (WhatsApp Emerald) */}
                        {isOut && (
                          <div className="max-w-[78%] relative">
                            <div className="wa-bubble-out rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-left">
                              {renderBubbleContent(m, true)}
                              <div className="flex items-center justify-end gap-1.5 text-[10px] wa-time mt-1">
                                <span>{dateTime(m.created_at)}</span>
                                {m.status === "read" ? (
                                  <span className="flex items-center text-[#53bdeb]" title="Read by customer">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  </span>
                                ) : m.status === "delivered" ? (
                                  <span className="flex items-center text-white/75" title="Delivered to device">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  </span>
                                ) : m.status === "failed" ? (
                                  <span className="flex items-center text-rose-300" title="Delivery failed">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span className="flex items-center text-white/75" title="Sent by server">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteMsg(m.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -left-2 bg-white dark:bg-[#152233] rounded-full p-1 shadow border border-slate-200 dark:border-[#1E2D40] text-slate-400 hover:text-rose-600 text-[10px]"
                              title="Delete message"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Floating Scroll to Bottom button (WhatsApp style) */}
                  {userScrolledUp && (
                    <div className="sticky bottom-2 flex justify-end pointer-events-none pr-1 z-20">
                      <button
                        type="button"
                        onClick={scrollToBottomSmooth}
                        className="pointer-events-auto flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#152233] text-slate-700 dark:text-[#F1F5F9] shadow-md border border-slate-200/90 dark:border-[#1E2D40] hover:bg-slate-50 dark:hover:bg-[#1C2A3D] hover:text-emerald-600 dark:hover:text-[#34D399] transition-all cursor-pointer group"
                        title="Scroll to latest messages"
                      >
                        <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Rich Media Attachment Menu ── */}
                {attachMenuOpen && (
                  <div className="bg-white dark:bg-[#152233] border-t border-slate-200 dark:border-[#1E2D40] p-2.5 shadow-lg flex flex-wrap items-center gap-2 text-xs animate-in fade-in duration-150">
                    <button
                      onClick={() => docInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#121D2C] hover:bg-slate-100 dark:hover:bg-[#1C2A3D] border border-slate-200 dark:border-[#1E2D40] font-medium text-slate-700 dark:text-[#E2E8F0] hover:dark:text-[#F1F5F9] transition-colors shadow-2xs"
                    >
                      <FileText className="w-4 h-4 text-rose-500" />
                      <span>Upload PDF / Document</span>
                    </button>
                    <button
                      onClick={() => imgInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#121D2C] hover:bg-slate-100 dark:hover:bg-[#1C2A3D] border border-slate-200 dark:border-[#1E2D40] font-medium text-slate-700 dark:text-[#E2E8F0] hover:dark:text-[#F1F5F9] transition-colors shadow-2xs"
                    >
                      <ImageIcon className="w-4 h-4 text-sky-500" />
                      <span>Upload Photo / Image</span>
                    </button>
                    <button
                      onClick={openQuotationDialog}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-[#062D24] hover:bg-emerald-100 dark:hover:bg-[#093d31] border border-emerald-200 dark:border-[#0E5343] font-medium text-emerald-800 dark:text-[#34D399] transition-colors shadow-2xs"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-[#34D399]" />
                      <span>Send Quotation PDF</span>
                    </button>
                    <button
                      onClick={handleSendBrochure}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-[#182038] hover:bg-indigo-100 dark:hover:bg-[#202b4c] border border-indigo-200 dark:border-[#2A3654] font-medium text-indigo-800 dark:text-indigo-300 transition-colors shadow-2xs"
                    >
                      <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Send Agency Brochure</span>
                    </button>
                    <button
                      onClick={() => { setAttachMenuOpen(false); setInteractiveModalOpen(true); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-[#20182E] hover:bg-purple-100 dark:hover:bg-[#2d2242] border border-purple-200 dark:border-[#382654] font-medium text-purple-800 dark:text-purple-300 transition-colors shadow-2xs"
                    >
                      <MousePointerClick className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Interactive Quick-Reply (CTA)</span>
                    </button>
                    <button
                      onClick={() => { setAttachMenuOpen(false); setListModalOpen(true); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 dark:bg-[#082828] hover:bg-teal-100 dark:hover:bg-[#0e3b3b] border border-teal-200 dark:border-[#134e4e] font-medium text-teal-800 dark:text-teal-300 transition-colors shadow-2xs"
                    >
                      <ListOrdered className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>Interactive List Menu (10 Items)</span>
                    </button>
                    <button
                      onClick={() => { setAttachMenuOpen(false); setCtaModalOpen(true); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-[#291E0D] hover:bg-amber-100 dark:hover:bg-[#3a2b13] border border-amber-200 dark:border-[#4B3312] font-medium text-amber-800 dark:text-amber-300 transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>CTA Link / Payment / Call Button</span>
                    </button>
                    <button
                      onClick={() => { setAttachMenuOpen(false); setSlashOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#121D2C] hover:bg-slate-200 dark:hover:bg-[#1C2A3D] font-medium text-slate-600 dark:text-[#94A3B8] hover:dark:text-[#F1F5F9] transition-colors"
                    >
                      <span className="font-bold text-emerald-600 dark:text-[#34D399]">/</span> Quick Replies
                    </button>
                    <button
                      onClick={() => setAttachMenuOpen(false)}
                      className="ml-auto text-slate-400 hover:text-slate-600 dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] p-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* ── Slash Commands Popup ── */}
                {slashOpen && (
                  <div className="bg-white dark:bg-[#152233] border-t border-slate-200 dark:border-[#1E2D40] p-2 shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1A2636] text-xs">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] px-2 py-1 flex items-center justify-between">
                      <span>Quick replies (Type to filter or click to insert)</span>
                      <button onClick={() => setSlashOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-[#94A3B8] dark:hover:text-[#F1F5F9]">✕</button>
                    </div>
                    {QUICK_REPLIES.map(q => (
                      <button
                        key={q.slash}
                        onClick={() => applyQuickReply(q.text)}
                        className="w-full text-left p-2 hover:bg-emerald-50/60 dark:hover:bg-[#1C2A3D] rounded flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="font-semibold text-emerald-700 dark:text-[#34D399] mr-2">{q.slash}</span>
                          <span className="text-slate-800 dark:text-[#F1F5F9] font-medium">{q.title}</span>
                          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">{q.text}</p>
                        </div>
                        <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 dark:text-[#7E8F9F] shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Message Composer ── */}
                <div className="p-2.5 sm:p-3 wa-composer-bar flex flex-col gap-2 shrink-0">
                  {/* AI Suggestions Pill Bar (Only visible when AI suggestions are freshly generated) */}
                  {aiSuggestions.length > 0 && (
                    <div className="bg-emerald-50/90 dark:bg-[#062D24] border border-emerald-200 dark:border-[#0E5343] rounded-xl p-2 flex flex-col gap-1.5 text-xs animate-in fade-in-50 duration-150">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 dark:text-[#34D399] px-0.5">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-[#34D399]" />
                          AI Suggestions (tap to insert):
                        </span>
                        <button
                          onClick={() => setAiSuggestions([])}
                          className="text-slate-400 hover:text-slate-600 dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] p-0.5 rounded"
                          title="Dismiss suggestions"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                        {aiSuggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setText(sug);
                              setAiSuggestions([]);
                              toast.success("AI suggestion placed into composer");
                            }}
                            className="text-left px-2.5 py-1.5 bg-white dark:bg-[#121D2C] border border-emerald-300 dark:border-[#0E5343] rounded-lg text-[11px] text-slate-800 dark:text-[#CBD5E1] hover:bg-emerald-100/70 dark:hover:bg-[#1C2A3D] shrink-0 max-w-xs truncate shadow-2xs font-normal"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input Row: [Quick/AI Action Icon] [Attachment Icon] [Text Input] [Smile] [Send] */}
                  <div className="flex items-end gap-1.5 sm:gap-2">
                    {/* Hidden file inputs for rich media engine */}
                    <input
                      type="file"
                      ref={docInputRef}
                      onChange={e => onFileSelected(e, "document")}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={imgInputRef}
                      onChange={e => onFileSelected(e, "image")}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                    />

                    {/* Quick Replies & AI Action Dropdown (LEFT of Paperclip) */}
                    <DropdownMenu open={quickMenuOpen} onOpenChange={setQuickMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-9.5 w-9.5 sm:h-10 sm:w-10 p-0 rounded-xl shrink-0 transition-colors ${
                            quickMenuOpen
                              ? "bg-emerald-100 dark:bg-[#093d31] text-emerald-800 dark:text-[#34D399] shadow-2xs"
                              : "text-emerald-700 dark:text-[#34D399] bg-emerald-50/80 dark:bg-[#062D24] hover:bg-emerald-100 dark:hover:bg-[#093d31] border border-emerald-200/80 dark:border-[#0E5343]"
                          }`}
                          title="Quick Replies & AI Suggestions"
                        >
                          <Sparkles className="w-4.5 h-4.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="top" align="start" className="w-64 p-1.5 shadow-xl rounded-xl border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#152233] z-50">
                        <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] flex items-center justify-between">
                          <span>Quick Actions & AI</span>
                          <span className="text-[10px] text-emerald-600 dark:text-[#34D399] font-bold bg-emerald-50 dark:bg-[#062D24] px-1.5 py-0.2 rounded-full border border-emerald-200 dark:border-[#0E5343]">
                            Fast Reply
                          </span>
                        </div>

                        {/* Suggest AI Reply */}
                        <DropdownMenuItem
                          onClick={() => {
                            setQuickMenuOpen(false);
                            fetchAiSuggestions();
                          }}
                          disabled={aiBusy}
                          className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-emerald-50 dark:hover:bg-[#1C2A3D] text-emerald-800 dark:text-[#34D399] font-medium"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-[#34D399] shrink-0" />
                          <span>{aiBusy ? "Thinking AI reply…" : "Suggest AI reply"}</span>
                        </DropdownMenuItem>

                        {/* Browse All Quick Replies (/) */}
                        <DropdownMenuItem
                          onClick={() => {
                            setQuickMenuOpen(false);
                            setSlashOpen(true);
                            setAttachMenuOpen(false);
                          }}
                          className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1C2A3D] text-slate-800 dark:text-[#E2E8F0] font-medium hover:dark:text-[#F1F5F9]"
                        >
                          <span className="w-4 h-4 rounded bg-slate-200 dark:bg-[#1C2A3D] text-slate-700 dark:text-[#94A3B8] font-bold text-center leading-4 text-[11px] shrink-0 border border-transparent dark:border-[#1E2D40]">
                            /
                          </span>
                          <span>Browse All Quick Replies</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-[#1E2D40]" />

                        {/* Fast 1-Click Template Chips */}
                        <DropdownMenuItem
                          onClick={() => {
                            applyQuickReply("Hi! Could you please share your email ID so we can send the quotation?");
                            setQuickMenuOpen(false);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1C2A3D] text-slate-700 dark:text-[#CBD5E1] hover:dark:text-[#F1F5F9]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="truncate">Ask for email ID</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            applyQuickReply("Would you be available for a quick 10-minute discovery call today?");
                            setQuickMenuOpen(false);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1C2A3D] text-slate-700 dark:text-[#CBD5E1] hover:dark:text-[#F1F5F9]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                          <span className="truncate">Ask for 10-min call</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            applyQuickReply("Hi! Thank you for contacting us. How can we help you today?");
                            setQuickMenuOpen(false);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1C2A3D] text-slate-700 dark:text-[#CBD5E1] hover:dark:text-[#F1F5F9]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          <span className="truncate">Greeting & Inquiry</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Attachment clip */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-9.5 w-9.5 sm:h-10 sm:w-10 p-0 rounded-xl shrink-0 transition-colors ${
                        attachMenuOpen
                          ? "bg-emerald-100 dark:bg-[#093d31] text-emerald-800 dark:text-[#34D399]"
                          : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#1C2A3D]"
                      }`}
                      onClick={() => {
                        setAttachMenuOpen(!attachMenuOpen);
                        setSlashOpen(false);
                      }}
                      title="Attach PDF, Quotation, Image or Template"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>

                    {/* Text input */}
                    <div className="flex-1 relative">
                      <Input
                        data-testid="whatsapp-page-input"
                        placeholder="Type a message or / for quick replies..."
                        value={text}
                        onChange={handleInputChange}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        className="min-h-[42px] max-h-32 text-xs rounded-xl wa-composer-input bg-slate-50 dark:bg-[#2a3942] text-slate-900 dark:text-[#e9edef] border-slate-200 dark:border-[#374248] focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-2xs font-normal"
                      />
                    </div>

                    {/* Emoji toggle */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9.5 w-9.5 sm:h-10 sm:w-10 p-0 text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#1C2A3D] rounded-xl shrink-0"
                      onClick={() => setText(prev => prev + " 👍")}
                      title="Add reaction"
                    >
                      <Smile className="w-5 h-5" />
                    </Button>

                    {/* Send Button */}
                    <Button
                      data-testid="whatsapp-page-send"
                      className="bg-[#005c4b] hover:bg-[#004a3c] dark:bg-[#00a884] dark:hover:bg-[#008f6f] text-white h-9.5 w-9.5 sm:h-10 sm:w-10 p-0 rounded-xl shrink-0 shadow-xs"
                      onClick={() => handleSend()}
                      disabled={!text.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Right Column: Chat Info & AI Drawer (Alpha CRM Standard) */}
          {rightDrawerOpen && active && (
            <Card className="fixed inset-x-0 bottom-0 top-14 z-40 lg:static lg:inset-auto lg:top-auto lg:z-auto lg:col-span-12 xl:col-span-3 border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#0F1926] flex flex-col min-h-0 overflow-hidden rounded-none lg:rounded-2xl shadow-2xl lg:shadow-xs">
              {/* Drawer Header */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1E2D40] flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-[#0F1926]">
                <button
                  onClick={() => setRightDrawerOpen(false)}
                  className="lg:hidden flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-[#34D399] hover:text-emerald-800"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-[#F1F5F9] text-sm">Chat Info</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 dark:bg-[#291E0D] text-amber-800 dark:text-[#FBBF24] px-2 py-0.5 rounded-full border border-amber-200 dark:border-[#4B3312]">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    AI Assist
                  </span>
                </div>
                <button
                  onClick={() => setRightDrawerOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lead Summary Header Card */}
              <div className="p-3.5 bg-slate-50/70 dark:bg-[#121D2C] border-b border-slate-100 dark:border-[#1E2D40] flex items-center justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-900 dark:text-[#F1F5F9] text-xs truncate">
                    {active.lead_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">{active.lead_phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-medium bg-emerald-50 dark:bg-[#062D24] text-emerald-700 dark:text-[#34D399] border border-emerald-200 dark:border-[#0E5343] px-2 py-0.5 rounded-full">
                    AI Credits: 283
                  </span>
                </div>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="border-b border-slate-200 dark:border-[#1E2D40] px-2 shrink-0 bg-white dark:bg-[#0F1926]">
                <div className="flex items-center gap-1 overflow-x-auto text-xs py-2 no-scrollbar">
                  {[
                    { id: "ai", label: "AI Assist", icon: Sparkles },
                    { id: "bot", label: "AI bot", icon: Bot },
                    { id: "meeting", label: "Meeting", icon: Video },
                    { id: "translate", label: "Translate", icon: Globe },
                    { id: "payment", label: "Payment link", icon: CreditCard },
                    { id: "followup", label: "Follow-up", icon: Calendar },
                    { id: "lead", label: "Lead Info", icon: User },
                  ].map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setDrawerTab(t.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold transition-colors ${
                          drawerTab === t.id
                            ? "bg-indigo-700 dark:bg-indigo-600 text-white shadow-xs"
                            : "text-slate-700 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1C2A3D] dark:hover:text-[#F1F5F9]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* ── TAB 1: AI ASSIST ── */}
                {drawerTab === "ai" && (
                  <div className="space-y-4">
                    {/* Action 1: Suggest replies */}
                    <div className="space-y-2">
                      <Button
                        className="w-full bg-[#008069] hover:bg-[#006654] text-white font-semibold rounded-xl h-11 text-sm shadow-xs gap-2"
                        onClick={fetchAiSuggestions}
                        disabled={aiBusy}
                      >
                        {aiBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-emerald-200" />
                        )}
                        Suggest replies
                      </Button>

                      {/* Display generated suggestions */}
                      {aiSuggestions.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">
                            AI Suggested Replies (Click to use):
                          </p>
                          {aiSuggestions.map((sug, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setText(sug);
                                toast.success("Suggestion placed into composer");
                              }}
                              className="p-3 bg-emerald-50/60 dark:bg-[#062D24] border border-emerald-200 dark:border-[#0E5343] rounded-xl text-xs text-slate-800 dark:text-[#E2E8F0] cursor-pointer hover:bg-emerald-100/70 dark:hover:bg-[#093d31] transition-colors relative group"
                            >
                              <p className="leading-relaxed">{sug}</p>
                              <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-emerald-200/60 dark:border-[#0E5343]">
                                <span className="text-[10px] text-emerald-700 dark:text-[#34D399] font-medium flex items-center gap-0.5">
                                  Use draft <ChevronRight className="w-2.5 h-2.5" />
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action 2: Summarize conversation */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold rounded-xl h-11 text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900 shadow-xs gap-2"
                        onClick={fetchAiSummary}
                        disabled={analysing || msgs.length === 0}
                      >
                        {analysing ? (
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        ) : (
                          <Brain className="w-4 h-4 text-indigo-600" />
                        )}
                        Summarize
                      </Button>

                      {/* Analysis Results Display */}
                      {aiAnalysis && (
                        <div className="space-y-3 mt-3 bg-slate-50 dark:bg-[#121D2C] p-3.5 rounded-xl border border-slate-200 dark:border-[#1E2D40] text-xs">
                          {/* Summary */}
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">
                              Executive Summary
                            </span>
                            <p className="text-slate-800 dark:text-[#F1F5F9] mt-1 leading-relaxed font-medium">
                              {aiAnalysis.summary}
                            </p>
                          </div>

                          {/* Intent & Sentiment */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-[#1E2D40]">
                            <div>
                              <span className="text-[10px] text-slate-500 dark:text-[#94A3B8]">Intent</span>
                              <div className="font-semibold text-slate-900 dark:text-[#F1F5F9] mt-0.5 truncate">
                                {aiAnalysis.intent}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 dark:text-[#94A3B8]">Sentiment</span>
                              <div className="mt-0.5">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  aiAnalysis.sentiment === "Positive"
                                    ? "bg-emerald-50 dark:bg-[#062D24] text-emerald-700 dark:text-[#34D399] border-emerald-200 dark:border-[#0E5343]"
                                    : aiAnalysis.sentiment === "Negative"
                                    ? "bg-rose-50 dark:bg-[#2C151B] text-rose-700 dark:text-[#FB7185] border-rose-200 dark:border-[#4C1D24]"
                                    : "bg-slate-100 dark:bg-[#162232] text-slate-700 dark:text-[#94A3B8] border-slate-200 dark:border-[#1E2D40]"
                                }`}>
                                  {aiAnalysis.sentiment}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Conversion Probability Bar */}
                          <div className="pt-2 border-t border-slate-200 dark:border-[#1E2D40]">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] text-slate-500 dark:text-[#94A3B8]">Conversion Likelihood</span>
                              <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">
                                {aiAnalysis.conversion_probability}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-[#1E2D40] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${aiAnalysis.conversion_probability}%` }}
                              />
                            </div>
                          </div>

                          {/* Objections */}
                          {aiAnalysis.objections && (
                            <div className="pt-2 border-t border-slate-200 dark:border-[#1E2D40] text-rose-700 dark:text-[#FB7185]">
                              <span className="text-[10px] font-semibold uppercase tracking-wide">
                                Objections Detected
                              </span>
                              <p className="mt-0.5 text-slate-700 dark:text-[#E2E8F0]">{aiAnalysis.objections}</p>
                            </div>
                          )}

                          {/* Next Recommended Action */}
                          <div className="pt-2 border-t border-slate-200 dark:border-[#1E2D40]">
                            <span className="text-[10px] font-semibold text-emerald-800 dark:text-[#34D399] uppercase tracking-wide">
                              Recommended Next Step
                            </span>
                            <p className="mt-0.5 font-medium text-emerald-950 dark:text-[#A7F3D0]">
                              {aiAnalysis.next_action}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-[#7E8F9F] text-center">
                      Each suggestion, summary or translation uses AI credits.
                    </p>
                  </div>
                )}

                {/* ── TAB: AI BOT (Alpha CRM Feature Parity) ── */}
                {drawerTab === "bot" && (
                  <div className="space-y-4 text-xs">
                    <div className={`p-3.5 rounded-xl border ${
                      active.ai_bot_paused
                        ? "bg-rose-50/70 dark:bg-[#2C151B] border-rose-200 dark:border-[#4C1D24] text-rose-900 dark:text-[#FB7185]"
                        : "bg-emerald-50/70 dark:bg-[#062D24] border-emerald-200 dark:border-[#0E5343] text-emerald-900 dark:text-[#34D399]"
                    }`}>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className={`w-2 h-2 rounded-full ${active.ai_bot_paused ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`}></span>
                        <span>{active.ai_bot_paused ? "AI Bot Paused" : "AI Bot Active"}</span>
                      </div>
                      <p className="text-[11px] mt-1.5 text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                        {active.ai_bot_paused
                          ? (active.ai_bot_handover_reason
                              ? `AI bot was paused for this chat (${active.ai_bot_handover_reason}). A human agent handles it.`
                              : "AI bot is paused for this chat. Inbound messages from this contact will NOT trigger automatic AI replies.")
                          : "AI bot is actively auto-replying for this chat. When the customer messages, the bot qualifies and replies instantly."}
                      </p>
                    </div>

                    {active.ai_bot_paused ? (
                      <Button
                        onClick={() => handleToggleAiBot(false)}
                        disabled={aiBotBusy}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-10 text-xs shadow-xs gap-1.5"
                      >
                        {aiBotBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                        Resume AI bot for this chat
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleToggleAiBot(true, "Paused manually by agent")}
                        disabled={aiBotBusy}
                        variant="outline"
                        className="w-full border-rose-300 dark:border-[#4C1D24] text-rose-700 dark:text-[#FB7185] hover:bg-rose-50 dark:hover:bg-[#2C151B] font-semibold rounded-xl h-10 text-xs shadow-xs gap-1.5"
                      >
                        {aiBotBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                        Pause AI bot for this chat
                      </Button>
                    )}

                    <div className="p-3 bg-slate-50 dark:bg-[#121D2C] rounded-xl border border-slate-200 dark:border-[#1E2D40] space-y-1.5 text-slate-500 dark:text-[#94A3B8] text-[11px]">
                      <div className="font-semibold text-slate-700 dark:text-[#F1F5F9]">How per-chat pause works:</div>
                      <p>• If a customer asks for a human (&quot;human&quot;, &quot;agent&quot;, &quot;real person&quot;), the AI bot pauses automatically and tags the conversation as <span className="font-medium text-rose-700 dark:text-[#FB7185]">Needs human</span>.</p>
                      <p>• Pausing a chat only affects this contact. Your company&apos;s AI bot will continue handling new leads and other contacts.</p>
                    </div>
                  </div>
                )}

                {/* ── TAB: MEETING (Google Meet / Calendar Scheduling) ── */}
                {drawerTab === "meeting" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Meeting Title / Agenda
                      </label>
                      <Input
                        value={meetTitle}
                        onChange={e => setMeetTitle(e.target.value)}
                        placeholder="e.g. Discovery & Demo Call"
                        className="h-9 rounded-xl text-xs bg-white dark:bg-[#121D2C] border-slate-200 dark:border-[#1E2D40] text-slate-900 dark:text-[#F1F5F9]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Date & Time
                      </label>
                      <Input
                        type="datetime-local"
                        value={meetDateTime}
                        onChange={e => setMeetDateTime(e.target.value)}
                        className="h-9 rounded-xl text-xs bg-white dark:bg-[#121D2C] border-slate-200 dark:border-[#1E2D40] text-slate-900 dark:text-[#F1F5F9]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Duration
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[15, 30, 45, 60].map(dur => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setMeetDuration(dur)}
                            className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                              meetDuration === dur
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-slate-50 dark:bg-[#121D2C] text-slate-700 dark:text-[#94A3B8] border-slate-200 dark:border-[#1E2D40] hover:bg-slate-100 dark:hover:bg-[#1C2A3D]"
                            }`}
                          >
                            {dur} min
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleScheduleMeeting}
                      disabled={meetBusy}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-xs font-semibold gap-1.5 shadow-xs"
                    >
                      {meetBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                      Schedule & send Meet link
                    </Button>

                    <div className="p-3 bg-slate-50 dark:bg-[#121D2C] rounded-xl border border-slate-200 dark:border-[#1E2D40] text-[11px] text-slate-500 dark:text-[#94A3B8] space-y-1">
                      <div className="font-semibold text-slate-700 dark:text-[#F1F5F9] flex items-center gap-1">
                        <Video className="w-3 h-3 text-emerald-600 dark:text-[#34D399]" /> Google Meet Integration
                      </div>
                      <p>
                        Generates a Google Meet link and sends a calendar invite message directly to {active.lead_name}&apos;s WhatsApp thread.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: TRANSLATE ── */}
                {drawerTab === "translate" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Target Language
                      </label>
                      <select
                        value={translateTarget}
                        onChange={e => setTranslateTarget(e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#1E2D40] bg-slate-50 dark:bg-[#121D2C] px-3 text-xs text-slate-800 dark:text-[#F1F5F9]"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi (हिंदी)</option>
                        <option value="Hinglish">Hinglish</option>
                        <option value="Gujarati">Gujarati</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Spanish">Spanish</option>
                      </select>
                    </div>

                    <Button
                      onClick={handleTranslate}
                      disabled={translating}
                      className="w-full bg-slate-900 dark:bg-emerald-600 hover:dark:bg-emerald-500 text-white rounded-xl h-9 text-xs"
                    >
                      {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Globe className="w-3.5 h-3.5 mr-1" />}
                      Translate Latest Message
                    </Button>

                    {translatedText && (
                      <div className="p-3 bg-slate-50 dark:bg-[#121D2C] rounded-xl border border-slate-200 dark:border-[#1E2D40] space-y-2 mt-2">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#7E8F9F] uppercase tracking-wide">
                          Translation Result:
                        </span>
                        <p className="text-slate-800 dark:text-[#F1F5F9] leading-relaxed font-medium">
                          {translatedText}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-emerald-700 dark:text-[#34D399] hover:bg-emerald-50 dark:hover:bg-[#1C2A3D] w-full"
                          onClick={() => {
                            navigator.clipboard.writeText(translatedText);
                            toast.success("Copied to clipboard");
                          }}
                        >
                          Copy Translation
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 3: PAYMENT LINK ── */}
                {drawerTab === "payment" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Amount (₹ INR)
                      </label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="h-9 rounded-xl text-xs bg-white dark:bg-[#121D2C] border-slate-200 dark:border-[#1E2D40] text-slate-900 dark:text-[#F1F5F9]"
                      />
                      {/* Quick chips */}
                      <div className="flex gap-1.5 mt-2">
                        {["500", "1000", "5000", "15000"].map(amt => (
                          <button
                            key={amt}
                            onClick={() => setPaymentAmount(amt)}
                            className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-[#1E2D40] bg-slate-50 dark:bg-[#121D2C] hover:bg-slate-100 dark:hover:bg-[#1C2A3D] text-slate-700 dark:text-[#94A3B8] text-[10px] font-medium"
                          >
                            ₹{Number(amt).toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Purpose / Note
                      </label>
                      <Input
                        placeholder="e.g. Website advance booking"
                        value={paymentPurpose}
                        onChange={e => setPaymentPurpose(e.target.value)}
                        className="h-9 rounded-xl text-xs bg-white dark:bg-[#121D2C] border-slate-200 dark:border-[#1E2D40] text-slate-900 dark:text-[#F1F5F9]"
                      />
                    </div>

                    <Button
                      onClick={handleSendPaymentLink}
                      disabled={paymentBusy}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-xs font-semibold gap-1.5"
                    >
                      {paymentBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                      Send Payment Link on WhatsApp
                    </Button>

                    <p className="text-[11px] text-slate-400 dark:text-[#7E8F9F] text-center leading-tight">
                      This will format a secure payment request message and send it directly into the active WhatsApp thread.
                    </p>
                  </div>
                )}

                {/* ── TAB 4: FOLLOW-UP TASK ── */}
                {drawerTab === "followup" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Task Title
                      </label>
                      <Input
                        value={followupTitle}
                        onChange={e => setFollowupTitle(e.target.value)}
                        className="h-9 rounded-xl text-xs bg-white dark:bg-[#121D2C] border-slate-200 dark:border-[#1E2D40] text-slate-900 dark:text-[#F1F5F9]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Due Date & Time
                      </label>
                      <Input
                        type="datetime-local"
                        value={followupDate}
                        onChange={e => setFollowupDate(e.target.value)}
                        className="h-9 rounded-xl text-xs bg-white dark:bg-[#121D2C] border-slate-200 dark:border-[#1E2D40] text-slate-900 dark:text-[#F1F5F9]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Priority
                      </label>
                      <select
                        value={followupPriority}
                        onChange={e => setFollowupPriority(e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#1E2D40] bg-slate-50 dark:bg-[#121D2C] px-3 text-xs text-slate-800 dark:text-[#F1F5F9]"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>

                    <Button
                      onClick={handleCreateFollowup}
                      disabled={followupBusy}
                      className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl h-9 text-xs font-semibold"
                    >
                      {followupBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5 mr-1" />}
                      Schedule Follow-up Task
                    </Button>
                  </div>
                )}

                {/* ── TAB 5: LEAD INFO ── */}
                {drawerTab === "lead" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Lead Stage / Label
                      </label>
                      <select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#1E2D40] bg-slate-50 dark:bg-[#121D2C] px-3 text-xs text-slate-800 dark:text-[#F1F5F9]"
                      >
                        <option value="Needs human">Needs human (Red)</option>
                        <option value="Unlabeled">Unlabeled (Default)</option>
                        <option value="Follow Up">Follow Up (Amber)</option>
                        <option value="Won">Won / VIP (Emerald)</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Lead City / Location
                      </label>
                      <div className="p-2 bg-slate-50 dark:bg-[#121D2C] rounded-xl border border-slate-200 dark:border-[#1E2D40] text-slate-700 dark:text-[#F1F5F9]">
                        {active.lead_city || "Not specified"}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1 block">
                        Budget
                      </label>
                      <div className="p-2 bg-slate-50 dark:bg-[#121D2C] rounded-xl border border-slate-200 dark:border-[#1E2D40] text-slate-700 dark:text-[#F1F5F9] font-semibold">
                        ₹{Number(active.lead_budget || 0).toLocaleString()}
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveLead}
                      disabled={savingLead}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 text-xs font-semibold"
                    >
                      {savingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                    </Button>

                    <div className="pt-2 border-t border-slate-200 dark:border-[#1E2D40] text-center">
                      <Link
                        to={`/leads/${active.lead_id}`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        Open Full Lead Profile →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── VIEW 2: KANBAN BOARD VIEW (Matching Screenshot 2) ── */}
      {viewMode === "kanban" && (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0F1926] rounded-2xl border border-slate-200/80 dark:border-[#1E2D40] p-4 shadow-xs space-y-4 overflow-hidden">
          {/* Date Filter Pills Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs shrink-0 no-scrollbar">
            {["TODAY", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Lifetime"].map(df => (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                  dateFilter === df
                    ? "bg-[#008069] text-white shadow-xs"
                    : "bg-slate-100/90 dark:bg-[#121D2C] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-[#1C2A3D] dark:hover:text-[#F1F5F9] border border-transparent dark:border-[#1E2D40]"
                }`}
              >
                {df}
              </button>
            ))}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#121D2C] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-[#1C2A3D] dark:hover:text-[#F1F5F9] border border-transparent dark:border-[#1E2D40] text-xs font-medium">
              <Calendar className="w-3.5 h-3.5" />
              Custom Date Range
            </button>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 dark:text-[#627588] absolute left-3 top-2.5" />
                <Input
                  placeholder="Search in Kanban cards..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#121D2C] border-slate-200 dark:border-[#1E2D40] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder:text-[#627588]"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-2.5 border-slate-200 dark:border-[#1E2D40] bg-white dark:bg-[#121D2C] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1C2A3D]"
                onClick={loadConvos}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                Showing {filteredConversations.length} of {conversations.length} Chats
              </span>
            </div>
          </div>

          {/* Kanban Columns Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-0 overflow-y-auto pb-2">
            {KANBAN_COLUMNS.map(col => {
              const colCards = filteredConversations.filter(c => {
                if (col.id === "Needs human") return c.lead_status === "Needs human";
                if (col.id === "Follow Up") return c.lead_status === "Follow Up";
                if (col.id === "Won") return c.lead_status === "Won" || c.lead_status === "VIP";
                // Unlabeled is default fallback
                return !c.lead_status || c.lead_status === "Unlabeled" || c.lead_status === "New";
              });

              return (
                <div
                  key={col.id}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    const droppedLeadId = Number(e.dataTransfer.getData("text/plain"));
                    if (droppedLeadId) moveKanbanCard(droppedLeadId, col.id);
                  }}
                  className="bg-slate-50/70 dark:bg-[#121D2C] border border-slate-200/80 dark:border-[#1E2D40] rounded-2xl flex flex-col min-h-0 overflow-hidden"
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-slate-200/80 dark:border-[#1E2D40] flex items-center justify-between bg-white/70 dark:bg-[#0F1926]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <h3 className="font-semibold text-slate-900 dark:text-[#F1F5F9] text-xs">{col.label}</h3>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.2 rounded-full ${col.pillBg}`}>
                      {colCards.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {colCards.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-[#1E2D40] rounded-xl text-slate-400 dark:text-[#7E8F9F] text-center p-4">
                        <p className="text-xs">Drag chats here</p>
                      </div>
                    ) : (
                      colCards.map(card => (
                        <div
                          key={card.lead_id}
                          draggable
                          onDragStart={e => e.dataTransfer.setData("text/plain", String(card.lead_id))}
                          onClick={() => {
                            setActiveId(card.lead_id);
                            setMobileShowChat(true);
                            handleViewMode("inbox");
                          }}
                          className="bg-white dark:bg-[#152233] p-3 rounded-xl border border-slate-200 dark:border-[#1E2D40] shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group hover:dark:border-[#2D3E54]"
                        >
                          {/* Top Row: Avatar + Name + WhatsApp Icon */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className={`w-8 h-8 border ${getAvatarColor(card.lead_name)} font-semibold text-[11px] shrink-0`}>
                                <AvatarFallback className={getAvatarColor(card.lead_name)}>
                                  {getInitials(card.lead_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-xs text-slate-900 dark:text-[#F1F5F9] truncate">
                                  {card.lead_name}
                                </h4>
                                <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] truncate">{card.lead_phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-[#34D399]" />
                              {card.unread_count > 0 && (
                                <span className="bg-rose-500 text-white rounded-full text-[9px] font-bold px-1.5 py-0.2">
                                  {card.unread_count}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Message snippet preview box */}
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#121D2C] text-[11px] text-slate-600 dark:text-[#CBD5E1] truncate border border-slate-100 dark:border-[#1E2D40]">
                            {card.last_message || "(No messages yet)"}
                          </div>

                          {/* Footer with column mover shortcuts */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-[#7E8F9F] pt-1 border-t border-slate-100 dark:border-[#1E2D40]">
                            <span>{relative(card.last_at)}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              {KANBAN_COLUMNS.filter(c => c.id !== col.id).map(targetCol => (
                                <button
                                  key={targetCol.id}
                                  onClick={e => {
                                    e.stopPropagation();
                                    moveKanbanCard(card.lead_id, targetCol.id);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1C2A3D] hover:bg-slate-200 dark:hover:bg-[#25364C] text-slate-700 dark:text-[#E2E8F0] border border-transparent dark:border-[#1E2D40] text-[9px]"
                                  title={`Move to ${targetCol.label}`}
                                >
                                  → {targetCol.label.slice(0, 4)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DIALOG: NEW CHAT / START CONVERSATION ── */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <WhatsAppIcon className="w-5 h-5 text-emerald-600" />
              Start New WhatsApp Chat
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search CRM lead name or phone..."
                value={leadSearchTerm}
                onChange={e => searchLeadsForChat(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border rounded-xl">
              {leadSearchLoading ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-slate-400" />
                  Searching leads...
                </div>
              ) : leadSearchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No matching leads found.
                </div>
              ) : (
                leadSearchResults.map(ld => (
                  <button
                    key={ld.id}
                    onClick={() => {
                      const newConvoItem = {
                        lead_id: ld.id,
                        lead_name: ld.name,
                        lead_phone: ld.phone,
                        lead_status: ld.status || "Unlabeled",
                        lead_source: ld.source || "WhatsApp",
                        lead_email: ld.email || "",
                        lead_city: ld.city || "",
                        lead_budget: ld.budget || 0,
                        lead_notes: ld.notes || "",
                        last_message: "",
                        last_direction: "in",
                        last_at: new Date().toISOString(),
                        count: 0,
                        unread_count: 0,
                      };
                      setSelectedLead(newConvoItem);
                      setConversations(prev => {
                        if (prev.some(c => c.lead_id === ld.id)) return prev;
                        return [newConvoItem, ...prev];
                      });
                      setActiveId(ld.id);
                      setMobileShowChat(true);
                      setNewChatOpen(false);
                      handleViewMode("inbox");
                      toast.success(`Chat opened with ${ld.name}`);
                    }}

                    className="w-full text-left p-2.5 hover:bg-emerald-50/60 transition-colors flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{ld.name}</div>
                      <div className="text-[11px] text-slate-500">{ld.phone || "No phone"} · {ld.city || "No city"}</div>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium">Open chat →</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewChatOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quotation Share Dialog ── */}
      <Dialog open={quoteModalOpen} onOpenChange={setQuoteModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-serif">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Deliver Official Quotation to {active?.lead_name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Existing Quotations for this Lead
              </div>
              {quoteLoading ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1 text-emerald-600" /> Loading quotations…
                </div>
              ) : leadQuotes.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">
                  No quotation created yet for this lead. You can quickly generate one below.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {leadQuotes.map(q => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-200 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                          <span>{q.quotation_number}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            q.status === "Sent" ? "bg-sky-50 text-sky-700 border border-sky-200" :
                            q.status === "Accepted" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {q.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">
                          Amount: {inr(q.amount)} · Created: {dateShort(q.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          className="bg-[#005c4b] hover:bg-[#004a3c] text-white text-xs h-8 gap-1.5 shadow-2xs"
                          onClick={() => handleSendQuotation(q.id)}
                          disabled={quoteSendingId === q.id}
                        >
                          {quoteSendingId === q.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Send PDF</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Generate New Quotation */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Or Quick Create & Deliver New Quotation
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Total Amount (₹) *</label>
                  <Input
                    type="number"
                    value={newQuoteAmount}
                    onChange={e => setNewQuoteAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Deliverables / Notes</label>
                  <Input
                    value={newQuoteNotes}
                    onChange={e => setNewQuoteNotes(e.target.value)}
                    placeholder="e.g. Website + AI WhatsApp Engine"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
              <Button
                className="w-full bg-indigo-700 hover:bg-indigo-800 text-white text-xs h-9 gap-1.5 shadow-2xs"
                onClick={handleCreateAndSendQuotation}
                disabled={quoteSendingId === "new" || !newQuoteAmount}
              >
                {quoteSendingId === "new" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Generate PDF & Deliver to WhatsApp</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Interactive Quick-Reply Buttons (CTA) Dialog ── */}
      <Dialog open={interactiveModalOpen} onOpenChange={setInteractiveModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-serif">
              <MousePointerClick className="w-5 h-5 text-purple-600" />
              <span>Send Interactive Quick-Reply CTA to {active?.lead_name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Presets */}
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Select a Ready Preset (1-Click)</span>
                <span className="text-[10px] text-slate-400 font-normal">Max 3 buttons · 20 chars / title</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {INTERACTIVE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyInteractivePreset(p)}
                    className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/90 text-purple-900 text-xs font-medium transition-all shadow-2xs hover:scale-[1.01]"
                  >
                    ⚡ {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Builder */}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Header (Optional, max 60 chars)
                  </label>
                  <Input
                    value={interactiveHeader}
                    onChange={e => setInteractiveHeader(e.target.value.slice(0, 60))}
                    placeholder="e.g. ParshWebCraft Solutions"
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Footer (Optional, max 60 chars)
                  </label>
                  <Input
                    value={interactiveFooter}
                    onChange={e => setInteractiveFooter(e.target.value.slice(0, 60))}
                    placeholder="e.g. Tap an option below"
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Message Body * (max 1024 chars)
                  </label>
                  <span className={`text-[10px] ${interactiveBody.length > 1000 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                    {interactiveBody.length}/1024
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={interactiveBody}
                  onChange={e => setInteractiveBody(e.target.value.slice(0, 1024))}
                  placeholder="Enter the message body text that accompanies your interactive buttons..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-sans"
                />
              </div>

              {/* Interactive Buttons List (1 to 3) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Interactive Quick-Reply Buttons ({interactiveButtons.length}/3)
                  </label>
                  {interactiveButtons.length < 3 && (
                    <button
                      type="button"
                      onClick={addInteractiveButton}
                      className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Button
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {interactiveButtons.map((btn, idx) => {
                    const isOverLimit = (btn.title || "").length > 20;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 w-4">{idx + 1}.</span>
                        <div className="flex-1 relative">
                          <Input
                            value={btn.title}
                            onChange={e => updateInteractiveButton(idx, "title", e.target.value)}
                            placeholder={`Button ${idx + 1} text`}
                            className={`h-8 text-xs rounded-xl pr-14 ${
                              isOverLimit ? "border-rose-500 ring-1 ring-rose-500" : ""
                            }`}
                          />
                          <span className={`absolute right-2.5 top-2 text-[10px] font-mono ${
                            isOverLimit ? "text-rose-600 font-bold" : "text-slate-400"
                          }`}>
                            {(btn.title || "").length}/20
                          </span>
                        </div>
                        {interactiveButtons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInteractiveButton(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Remove button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* WhatsApp Live Preview */}
              <div className="bg-[#efeae2] p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 mb-2 flex items-center gap-1">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Device Live Preview</span>
                </div>
                <div className="max-w-xs bg-white rounded-2xl rounded-tl-xs p-3 shadow-sm border border-slate-200/80 space-y-2 text-left">
                  {interactiveHeader && (
                    <div className="text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-1">
                      {interactiveHeader}
                    </div>
                  )}
                  <div className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap font-medium">
                    {interactiveBody || "Your message preview will appear here..."}
                  </div>
                  {interactiveFooter && (
                    <div className="text-[10px] text-slate-500 pt-0.5">
                      {interactiveFooter}
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                    {interactiveButtons.map((btn, idx) => (
                      <div
                        key={idx}
                        className="py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs font-semibold text-slate-800 shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <MousePointerClick className="w-3 h-3 text-emerald-600" />
                        <span className="truncate">{btn.title || `Button ${idx + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInteractiveModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendInteractive}
              disabled={interactiveSending || !interactiveBody.trim()}
              className="bg-[#005c4b] hover:bg-[#004a3c] text-white text-xs h-9 px-4 rounded-xl gap-2 shadow-2xs font-semibold"
            >
              {interactiveSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Delivering to WhatsApp…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Interactive CTA Buttons</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Interactive List Menu (Up to 10 Options) Dialog ── */}
      <Dialog open={listModalOpen} onOpenChange={setListModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-serif">
              <ListOrdered className="w-5 h-5 text-teal-600" />
              <span>Send Interactive Services List Menu to {active?.lead_name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Ready Presets */}
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Select a 1-Click Menu Preset</span>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-semibold border border-teal-200">
                  Up to 10 Options Supported
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {LIST_MENU_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyListPreset(p)}
                    className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100/90 text-teal-900 text-xs font-medium transition-all shadow-2xs hover:scale-[1.01]"
                  >
                    ⚡ {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Builder */}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Header (Optional, max 60)
                  </label>
                  <Input
                    value={listHeader}
                    onChange={e => setListHeader(e.target.value.slice(0, 60))}
                    placeholder="e.g. ParshWebCraft"
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Button Label * (max 20)
                  </label>
                  <Input
                    value={listButtonText}
                    onChange={e => setListButtonText(e.target.value.slice(0, 20))}
                    placeholder="e.g. View Services"
                    className="h-8 text-xs rounded-xl font-semibold text-teal-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Footer (Optional, max 60)
                  </label>
                  <Input
                    value={listFooter}
                    onChange={e => setListFooter(e.target.value.slice(0, 60))}
                    placeholder="e.g. Select any service"
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Message Body * (max 1024 chars)
                  </label>
                  <span className={`text-[10px] ${listBody.length > 1000 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                    {listBody.length}/1024
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={listBody}
                  onChange={e => setListBody(e.target.value.slice(0, 1024))}
                  placeholder="Enter the message intro that accompanies the services menu..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-sans"
                />
              </div>

              {/* Sections & Rows Manager */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Sections & Menu Items
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {listSections.reduce((acc, s) => acc + s.rows.length, 0)}/10 Items Total
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addListSection}
                    disabled={listSections.length >= 10 || listSections.reduce((acc, s) => acc + s.rows.length, 0) >= 10}
                    className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </button>
                </div>

                <div className="space-y-3">
                  {listSections.map((sec, sIdx) => (
                    <div key={sIdx} className="p-3 rounded-xl border border-teal-100 bg-teal-50/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider">
                            Section {sIdx + 1}:
                          </span>
                          <Input
                            value={sec.title}
                            onChange={e => {
                              const val = e.target.value.slice(0, 24);
                              setListSections(prev => prev.map((s, i) => i === sIdx ? { ...s, title: val } : s));
                            }}
                            placeholder="Section Title (e.g. Web Development, max 24 chars)"
                            className="h-7 text-xs rounded-lg font-semibold flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addRowToSection(sIdx)}
                            disabled={listSections.reduce((acc, s) => acc + s.rows.length, 0) >= 10}
                            className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 disabled:opacity-50 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Item
                          </button>
                          {listSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeListSection(sIdx)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                              title="Delete section"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items in this section */}
                      <div className="space-y-1.5 pl-2">
                        {sec.rows.map((row, rIdx) => {
                          const isTitleOver = (row.title || "").length > 24;
                          const isDescOver = (row.description || "").length > 72;
                          return (
                            <div key={rIdx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                              <span className="text-[10px] font-mono text-slate-400 w-3">{rIdx + 1}</span>
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <div className="relative">
                                  <Input
                                    value={row.title}
                                    onChange={e => updateRowInSection(sIdx, rIdx, "title", e.target.value.slice(0, 24))}
                                    placeholder="Title (max 24)"
                                    className={`h-7 text-xs rounded-md pr-10 ${isTitleOver ? "border-rose-500" : ""}`}
                                  />
                                  <span className="absolute right-2 top-1.5 text-[9px] font-mono text-slate-400">
                                    {(row.title || "").length}/24
                                  </span>
                                </div>
                                <div className="relative">
                                  <Input
                                    value={row.description || ""}
                                    onChange={e => updateRowInSection(sIdx, rIdx, "description", e.target.value.slice(0, 72))}
                                    placeholder="Description (Optional, max 72)"
                                    className={`h-7 text-xs rounded-md pr-10 ${isDescOver ? "border-rose-500" : ""}`}
                                  />
                                  <span className="absolute right-2 top-1.5 text-[9px] font-mono text-slate-400">
                                    {(row.description || "").length}/72
                                  </span>
                                </div>
                              </div>
                              {sec.rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRowFromSection(sIdx, rIdx)}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                  title="Delete item"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Live Mobile Device Preview */}
              <div className="bg-[#efeae2] p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Mobile Screen Live Preview</span>
                  </div>
                  <span className="text-[10px] text-teal-800 font-semibold font-mono">
                    {listSections.reduce((acc, s) => acc + s.rows.length, 0)} Items Menu
                  </span>
                </div>

                <div className="max-w-sm bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-200/80 space-y-2.5 text-left">
                  {listHeader && (
                    <div className="text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-1">
                      {listHeader}
                    </div>
                  )}
                  <div className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap font-medium">
                    {listBody || "Explore our services..."}
                  </div>
                  {listFooter && (
                    <div className="text-[10px] text-slate-500 pt-0.5">
                      {listFooter}
                    </div>
                  )}

                  {/* List Launcher Pill Button */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs">
                      <ListOrdered className="w-3.5 h-3.5 text-teal-600" />
                      <span>☰ {listButtonText || "View Services"}</span>
                    </div>
                  </div>

                  {/* Simulated List Popup Sheet */}
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Customer Popup Menu View:
                    </div>
                    {listSections.map((sec, sI) => (
                      <div key={sI} className="space-y-1">
                        <div className="text-[10px] font-bold text-teal-800 uppercase px-1">{sec.title}</div>
                        <div className="space-y-1">
                          {sec.rows.map((r, rI) => (
                            <div key={rI} className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-[11px]">
                              <div>
                                <div className="font-semibold text-slate-800">{r.title}</div>
                                {r.description && <div className="text-[10px] text-slate-500">{r.description}</div>}
                              </div>
                              <span className="text-teal-600 text-xs font-bold">›</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setListModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendList}
              disabled={listSending || !listBody.trim()}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-9 px-4 rounded-xl gap-2 shadow-2xs font-semibold"
            >
              {listSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Delivering List Menu…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Deliver Interactive List Menu (10 Items)</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Interactive CTA URL / Payment / Call Button Dialog ── */}
      <Dialog open={ctaModalOpen} onOpenChange={setCtaModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-serif">
              <ExternalLink className="w-5 h-5 text-amber-600" />
              <span>Send Interactive CTA Link / Payment / Call Button to {active?.lead_name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick 1-Click Presets */}
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Select a Ready Preset (1-Click)</span>
                <span className="text-[10px] text-slate-400 font-normal">Button max 20 chars · Web / Payment / WhatsApp URL</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CTA_URL_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyCtaPreset(p)}
                    className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/90 text-amber-900 text-xs font-medium transition-all shadow-2xs hover:scale-[1.01]"
                  >
                    ⚡ {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Split layout: Inputs on Left, Mobile Preview on Right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              {/* Form Controls */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Header (Optional, max 60)
                    </label>
                    <Input
                      value={ctaHeader}
                      onChange={e => setCtaHeader(e.target.value.slice(0, 60))}
                      placeholder="e.g. ParshWebCraft Portfolio"
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Footer (Optional, max 60)
                    </label>
                    <Input
                      value={ctaFooter}
                      onChange={e => setCtaFooter(e.target.value.slice(0, 60))}
                      placeholder="e.g. Secured by Razorpay"
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Message Body * (max 1024 chars)
                    </label>
                    <span className={`text-[10px] ${ctaBody.length > 1000 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                      {ctaBody.length}/1024
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={ctaBody}
                    onChange={e => setCtaBody(e.target.value.slice(0, 1024))}
                    placeholder="Enter message text describing the link, proposal, invoice or next step..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-sans"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Button Label * (max 20 chars)
                    </label>
                    <span className={`text-[10px] ${ctaDisplayText.length > 20 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                      {ctaDisplayText.length}/20
                    </span>
                  </div>
                  <Input
                    value={ctaDisplayText}
                    onChange={e => setCtaDisplayText(e.target.value.slice(0, 20))}
                    placeholder="e.g. 🌐 View Portfolio"
                    className="h-8 text-xs rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Target URL * (Payment link, Portfolio, or WhatsApp chat link)
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <Input
                      value={ctaUrl}
                      onChange={e => setCtaUrl(e.target.value)}
                      placeholder="https://pages.razorpay.com/... or https://wa.me/919521347419"
                      className="h-8 text-xs rounded-xl pl-8 font-mono"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Meta requires full URL starting with <code className="bg-slate-100 px-1 rounded">https://</code>.
                  </div>
                </div>
              </div>

              {/* Mobile Preview */}
              <div className="bg-slate-100/70 p-3 rounded-2xl border border-slate-200 flex flex-col items-center justify-start">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 self-start">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>WhatsApp Mobile Preview</span>
                </div>

                <div className="w-full max-w-[280px] bg-[#e5ddd5] rounded-2xl shadow-md border border-slate-300 overflow-hidden text-left">
                  {/* WhatsApp chat top bar */}
                  <div className="bg-[#075e54] text-white px-3 py-2 flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-300" />
                      <span className="truncate">Parsh Web Craft</span>
                    </div>
                    <span className="text-[10px] opacity-75">14:30</span>
                  </div>

                  {/* Message Bubble Preview */}
                  <div className="p-3">
                    <div className="bg-[#d9fdd3] rounded-2xl rounded-tr-xs p-3 text-slate-900 shadow-xs border border-emerald-100">
                      {ctaHeader && (
                        <div className="text-[11px] font-bold text-emerald-950 mb-1 border-b border-emerald-200/60 pb-1">
                          {ctaHeader}
                        </div>
                      )}

                      <div className="text-xs whitespace-pre-wrap leading-relaxed text-slate-800">
                        {ctaBody || "Message body will appear here..."}
                      </div>

                      {ctaFooter && (
                        <div className="text-[10px] text-slate-500 mt-1.5 italic">
                          {ctaFooter}
                        </div>
                      )}

                      {/* CTA Button Action */}
                      <div className="mt-2.5 pt-2 border-t border-emerald-300/40">
                        <div className="w-full py-2 px-3 rounded-xl bg-white border border-emerald-300 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs hover:bg-emerald-50">
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{ctaDisplayText || "Open Link"}</span>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1">
                        <span>14:30</span>
                        <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCtaModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendCtaUrl}
              disabled={ctaSending || !ctaBody.trim() || !ctaDisplayText.trim() || !ctaUrl.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 px-4 rounded-xl gap-2 shadow-2xs font-semibold"
            >
              {ctaSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Delivering CTA Link…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Deliver CTA Link Button</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WhatsAppConnectModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        onConnected={() => {
          loadWaStatus?.();
          loadConvos?.();
        }}
      />
    </div>
  );
}
