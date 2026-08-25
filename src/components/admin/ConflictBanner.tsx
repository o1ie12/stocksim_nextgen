"use client";

import { useRouter } from "next/navigation";

// Shown when the server rejects a save because the value changed since the
// page loaded. Never offers a "force overwrite anyway" — only a refresh, so
// the teacher's next edit is always based on what's actually true.
export function ConflictBanner({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="nb-border border-down bg-paper px-2 py-1.5 flex items-center gap-2 text-xs w-full">
      <span className="text-down font-bold flex-1">{message}</span>
      <button
        onClick={() => router.refresh()}
        className="nb-border nb-shadow-sm nb-press bg-ink text-paper px-2 py-1 text-[10px] font-bold uppercase shrink-0"
      >
        Refresh
      </button>
    </div>
  );
}
