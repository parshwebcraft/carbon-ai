import { WifiOff } from "lucide-react";

export default function Offline() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#FBF8F3] p-6 text-center">
      <div data-testid="offline-page">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 border border-amber-200">
          <WifiOff className="h-7 w-7 text-amber-700" />
        </div>
        <h1 className="mt-4 font-serif text-3xl text-slate-900">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
          Facets CRM needs internet to sync your jewellery pipeline. Reconnect and try again.
        </p>
      </div>
    </div>
  );
}
