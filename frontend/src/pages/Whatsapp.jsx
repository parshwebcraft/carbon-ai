import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { dateTime, errMsg, relative } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageCircle, Send, Sparkles } from "lucide-react";

export default function Whatsapp() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  function loadConvos() {
    api.get("/whatsapp/conversations")
      .then(r => {
        setConversations(r.data);
        if (!activeId && r.data.length) setActiveId(r.data[0].lead_id);
      })
      .catch(e => toast.error(errMsg(e)));
  }
  useEffect(loadConvos, []);

  useEffect(() => {
    if (!activeId) return;
    api.get(`/whatsapp/${activeId}`).then(r => setMsgs(r.data));
  }, [activeId]);

  async function send() {
    if (!text.trim() || !activeId) return;
    try {
      await api.post("/whatsapp", { lead_id: activeId, direction: "out", message: text });
      setText("");
      const r = await api.get(`/whatsapp/${activeId}`); setMsgs(r.data);
      loadConvos();
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function sendCloud() {
    if (!text.trim() || !activeId) return;
    try {
      const { data } = await api.post(`/whatsapp/send-external/${activeId}`, { text });
      setText("");
      const r = await api.get(`/whatsapp/${activeId}`); setMsgs(r.data);
      loadConvos();
      toast.success(data.delivered_via_cloud ? "Sent via WhatsApp Cloud API" : "Saved locally (Cloud not configured)");
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function aiDraft() {
    if (!activeId) return;
    setAiBusy(true);
    try {
      const { data } = await api.post(`/ai/whatsapp-reply/${activeId}`);
      setText(data.reply);
      toast.success("AI draft ready");
    } catch (e) { toast.error(errMsg(e)); }
    finally { setAiBusy(false); }
  }

  const active = conversations.find(c => c.lead_id === activeId);

  return (
    <div data-testid="whatsapp-page" className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl">WhatsApp</h1>
        <p className="text-sm text-slate-600">{conversations.length} active conversations (mocked)</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-4 h-[70vh]">
        <Card className="border-amber-100 bg-white overflow-hidden lg:col-span-1">
          <div className="overflow-y-auto h-full" data-testid="whatsapp-conversations">
            {conversations.length === 0 ? <div className="p-5 text-center text-slate-500">No conversations.</div> :
              conversations.map(c => (
                <button
                  key={c.lead_id}
                  data-testid={`convo-${c.lead_id}`}
                  className={`w-full text-left px-4 py-3 border-b border-amber-50 hover:bg-amber-50/30 ${activeId === c.lead_id ? "bg-amber-50" : ""}`}
                  onClick={() => setActiveId(c.lead_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900 truncate">{c.lead_name}</div>
                    <div className="text-[10px] text-slate-400">{relative(c.last_at)}</div>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{c.lead_phone}</div>
                  <div className="text-sm text-slate-600 truncate mt-0.5">
                    {c.last_direction === "out" ? "↗ " : "↙ "}{c.last_message}
                  </div>
                </button>
              ))}
          </div>
        </Card>

        <Card className="border-amber-100 bg-white overflow-hidden lg:col-span-2 flex flex-col">
          {!active ? (
            <div className="flex-1 grid place-items-center text-slate-500">
              <div className="text-center"><MessageCircle className="h-8 w-8 mx-auto opacity-50" /><p className="mt-2 text-sm">Select a conversation</p></div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/40">
                <div className="font-semibold text-slate-900">{active.lead_name}</div>
                <Link to={`/leads/${active.lead_id}`} className="text-xs text-amber-700 hover:underline" data-testid="open-lead-from-whatsapp">View lead →</Link>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#FBF8F3]">
                {msgs.map(m => (
                  <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.direction === "out" ? "bg-emerald-50 ml-auto" : "bg-white border border-amber-100"}`}>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap">{m.message}</div>
                    <div className="text-[10px] text-slate-500 mt-1 text-right">{dateTime(m.created_at)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-amber-100 p-3 flex flex-wrap gap-2">
                <Input data-testid="whatsapp-page-input" placeholder="Type a message…" value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                  className="flex-1 min-w-[180px]" />
                <Button data-testid="whatsapp-page-ai" variant="outline" disabled={aiBusy} onClick={aiDraft}>
                  <Sparkles className="h-4 w-4 mr-1.5 text-amber-700" /> AI
                </Button>
                <Button data-testid="whatsapp-page-send" className="bg-emerald-600 hover:bg-emerald-700" onClick={send}>
                  <Send className="h-4 w-4" />
                </Button>
                <Button data-testid="whatsapp-page-send-cloud" variant="outline" onClick={sendCloud}>
                  Send via Cloud
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
