"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();
  const [odhlasuji, setOdhlasuji] = useState(false);

  async function odhlasit() {
    setOdhlasuji(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Chyba při odhlášení:", error.message);
      setOdhlasuji(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-800 bg-[#121212] text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              JMA Tipovačka
            </h1>

            <p className="text-xs text-gray-400">
              Soukromé sportovní tipovací soutěže
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifikace"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 transition hover:bg-gray-700"
          >
            🔔
          </button>

          <div className="text-right text-sm">
            <div className="font-semibold">Kuba</div>
            <div className="text-xs text-gray-400">Přihlášen</div>
          </div>

          <button
            type="button"
            onClick={odhlasit}
            disabled={odhlasuji}
            className="rounded-xl bg-[#F97316] px-4 py-2 font-semibold transition hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {odhlasuji ? "Odhlašuji…" : "Odhlásit"}
          </button>
        </div>
      </div>
    </header>
  );
}