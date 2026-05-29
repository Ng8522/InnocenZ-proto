import { useStore } from "@/lib/store";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "warn" ? AlertTriangle : Info;
        const tone = t.tone === "success" ? "text-success" : t.tone === "warn" ? "text-warning" : "text-primary";
        return (
          <div key={t.id} className="glass pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 shadow-card animate-in fade-in slide-in-from-top-2">
            <Icon className={`h-4 w-4 ${tone}`} />
            <span className="flex-1 text-sm">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
