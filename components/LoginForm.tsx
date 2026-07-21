"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [zobrazitHeslo, setZobrazitHeslo] = useState(false);
  const [prihlasuji, setPrihlasuji] = useState(false);
  const [chyba, setChyba] = useState("");

  async function prihlaseni(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setPrihlasuji(true);
    setChyba("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: heslo,
    });

    if (error) {
      setChyba("Neplatný e-mail nebo heslo.");
      setPrihlasuji(false);
      return;
    }

    router.replace("/souteze");
    router.refresh();
  }

  return (
    <form onSubmit={prihlaseni}>
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        className="mb-4 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
      />

      <div className="relative mb-6">
        <input
          type={zobrazitHeslo ? "text" : "password"}
          placeholder="Heslo"
          value={heslo}
          onChange={(e) => setHeslo(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 p-3 pr-24 outline-none focus:border-blue-700"
        />

        <button
          type="button"
          onClick={() => setZobrazitHeslo((stav) => !stav)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-900"
        >
          {zobrazitHeslo ? "Skrýt" : "Zobrazit"}
        </button>
      </div>

      {chyba && (
        <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {chyba}
        </div>
      )}

      <button
        type="submit"
        disabled={prihlasuji}
        className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {prihlasuji ? "Přihlašuji…" : "Přihlásit se"}
      </button>
    </form>
  );
}
