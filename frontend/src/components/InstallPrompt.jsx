import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [evt, setEvt] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setEvt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!evt || hidden) return null;

  return (
    <div
      data-testid="install-prompt"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-sm rounded-xl border border-indigo-200 dark:border-white/10 bg-white dark:bg-slate-900/95 shadow-2xl p-4 flex items-start gap-3 backdrop-blur-xl text-slate-900 dark:text-white"
    >
      <img src="/images/ParshAgent_icon_only.png" alt="ParshAgent Logo" className="h-10 w-10 object-contain rounded-lg shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-semibold text-slate-900 dark:text-white">Install ParshAgent CRM</div>
        <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
          Add to your home screen for a faster, app-like experience.
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            data-testid="install-prompt-install"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={async () => { evt.prompt(); await evt.userChoice; setHidden(true); }}
          >
            <Download className="h-4 w-4 mr-1.5" /> Install
          </Button>
          <Button
            data-testid="install-prompt-dismiss"
            size="sm"
            variant="ghost"
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white dark:hover:bg-white/10"
            onClick={() => setHidden(true)}
          >
            Not now
          </Button>
        </div>
      </div>
      <button
        aria-label="Close"
        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        onClick={() => setHidden(true)}
        data-testid="install-prompt-close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
