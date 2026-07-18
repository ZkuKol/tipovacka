"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Registrace() {
  const [prezdivka, setPrezdivka] = useState("");
  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [zobrazitHeslo, setZobrazitHeslo] = useState(false);

  async function registrace() {
    const { error } = await supabase.auth.signUp({
      email,
      password: heslo,
      options: {
        data: {
          prezdivka,
        },
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Registrace proběhla. Zkontroluj e-mail a potvrď účet.");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Registrace
        </h1>

        <input
          type="text"
          placeholder="Přezdívka"
          value={prezdivka}
          onChange={(e) => setPrezdivka(e.target.value)}
          className="w-full border rounded-lg p-3 mb-4"
        />

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
          type="button"
          onClick={registrace}
          className="w-full bg-blue-700 text-white rounded-lg p-3"
        >
          Vytvořit účet
        </button>
      </div>
    </main>
  );
}