"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegistracePage() {
  const router = useRouter();

  const [prezdivka, setPrezdivka] = useState("");
  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [zobrazitHeslo, setZobrazitHeslo] = useState(false);
  const [registruji, setRegistruji] = useState(false);
  const [chyba, setChyba] = useState("");
  const [uspech, setUspech] = useState("");

  async function registrace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setRegistruji(true);
    setChyba("");
    setUspech("");

    if (heslo.length < 6) {
      setChyba("Heslo musí mít alespoň 6 znaků.");
      setRegistruji(false);
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: heslo,
      options: {
        data: {
          nickname: prezdivka,
        },
        emailRedirectTo: `${window.location.origin}/prihlaseni`,
      },
    });

    if (error) {
      setChyba(error.message);
      setRegistruji(false);
      return;
    }

    if (data.session) {
      router.replace("/souteze");
      router.refresh();
      return;
    }

    setUspech(
      "Registrace proběhla úspěšně. Zkontroluj e-mail a potvrď svůj účet."
    );

    setPrezdivka("");
    setEmail("");
    setHeslo("");
    setRegistruji(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-3xl font-bold">
          Registrace
        </h1>

        <form onSubmit={registrace}>
          <input
            type="text"
            placeholder="Přezdívka"
            value={prezdivka}
            onChange={(e) => setPrezdivka(e.target.value)}
            required
            autoComplete="nickname"
            className="mb-4 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
          />

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
              minLength={6}
              autoComplete="new-password"
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

          {uspech && (
            <div className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-700">
              {uspech}
            </div>
          )}

          <button
            type="submit"
            disabled={registruji}
            className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {registruji ? "Registruji…" : "Zaregistrovat se"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Už máš účet?{" "}
          <Link
            href="/prihlaseni"
            className="font-semibold text-blue-700 hover:underline"
          >
            Přihlásit se
          </Link>
        </p>
      </div>
    </main>
  );
}
