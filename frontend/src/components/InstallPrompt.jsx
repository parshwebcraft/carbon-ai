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
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-sm rounded-xl border border-amber-200 bg-white shadow-lg p-4 flex items-start gap-3"
    >
      <div className="flex-1">
        <div className="font-semibold text-slate-900">Install Facets CRM</div>
        <div className="text-sm text-slate-600 mt-0.5">
          Add to your home screen for a faster, app-like experience.
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            data-testid="install-prompt-install"
            size="sm"
            className="bg-amber-700 hover:bg-amber-800"
            onClick={async () => { evt.prompt(); await evt.userChoice; setHidden(true); }}
          >
            <Download className="h-4 w-4 mr-1.5" /> Install
          </Button>
          <Button
            data-testid="install-prompt-dismiss"
            size="sm"
            variant="ghost"
            onClick={() => setHidden(true)}
          >
            Not now
          </Button>
        </div>
      </div>
      <button
        aria-label="Close"
        className="text-slate-400 hover:text-slate-700"
        onClick={() => setHidden(true)}
        data-testid="install-prompt-close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
