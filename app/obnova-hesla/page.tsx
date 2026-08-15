"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ObnovaHeslaPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const redirectTo = `${window.location.origin}/nove-heslo`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        setErrorMessage(
          `Odkaz pro obnovu hesla se nepodařilo odeslat: ${error.message}`,
        );
        return;
      }

      setMessage(
        "Pokud účet s tímto e-mailem existuje, poslali jsme ti odkaz pro nastavení nového hesla.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-center text-3xl font-bold text-gray-900">
          Obnova hesla
        </h1>

        <p className="mt-3 text-center text-sm text-gray-600">
          Zadej e-mail, který používáš pro přihlášení. Pošleme ti odkaz pro
          nastavení nového hesla.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              E-mail
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSubmitting ? "Odesílám…" : "Poslat odkaz pro obnovu"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/prihlaseni"
            className="font-semibold text-blue-700 hover:underline"
          >
            ← Zpět na přihlášení
          </Link>
        </p>
      </div>
    </main>
  );
}
