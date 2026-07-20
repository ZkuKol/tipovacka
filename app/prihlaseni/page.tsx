"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Prihlaseni() {
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

    alert("Přihlášení proběhlo úspěšně!");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Přihlášení
        </h1>

        <form onSubmit={prihlaseni}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3 mb-4"
          />

          <div className="relative mb-6">
            <input
              type={zobrazitHeslo ? "text" : "password"}
              placeholder="Heslo"
              value={heslo}
              onChange={(e) => setHeslo(e.target.value)}
              className="w-full border rounded-lg p-3 pr-24"
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
      </div>
    </main>
  );
}
