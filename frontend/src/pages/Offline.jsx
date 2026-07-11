import { WifiOff } from "lucide-react";

export default function Offline() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#F8FAFC] p-6 text-center">
      <div data-testid="offline-page">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 border border-indigo-200">
          <WifiOff className="h-7 w-7 text-indigo-700" />
        </div>
        <h1 className="mt-4 font-serif text-3xl text-slate-900">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
          ParshWebCraft CRM needs internet to sync your web agency pipeline. Reconnect and try again.
        </p>
      </div>
    </div>
  );
}
