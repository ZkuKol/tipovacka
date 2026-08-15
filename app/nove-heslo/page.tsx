"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NoveHesloPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("Nové heslo musí mít alespoň 8 znaků.");
      return;
    }

    if (password !== passwordAgain) {
      setErrorMessage("Zadaná hesla se neshodují.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(
        `Heslo se nepodařilo změnit: ${error.message}`,
      );
      setIsSubmitting(false);
      return;
    }

    router.push("/prihlaseni");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-center text-3xl font-bold text-gray-900">
          Nastavit nové heslo
        </h1>

        <p className="mt-3 text-center text-sm text-gray-600">
          Zadej nové heslo pro svůj účet.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Nové heslo
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="passwordAgain"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Nové heslo znovu
            </label>

            <input
              id="passwordAgain"
              type="password"
              value={passwordAgain}
              onChange={(event) => setPasswordAgain(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSubmitting ? "Ukládám…" : "Nastavit nové heslo"}
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

