"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [zobrazitHeslo, setZobrazitHeslo] = useState(false);

  async function prihlaseni(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: heslo,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form onSubmit={prihlaseni}>
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded-lg p-3 mb-4"
        required
      />

      <div className="relative mb-6">
        <input
          type={zobrazitHeslo ? "text" : "password"}
          placeholder="Heslo"
          value={heslo}
          onChange={(e) => setHeslo(e.target.value)}
          className="w-full border rounded-lg p-3 pr-24"
          required
        />

        <button
          type="button"
          onClick={() => setZobrazitHeslo(!zobrazitHeslo)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
        >
          {zobrazitHeslo ? "Skrýt" : "Zobrazit"}
        </button>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-700 text-white rounded-lg p-3"
      >
        Přihlásit se
      </button>
    </form>
  );
}
