import LoginForm from "@/components/LoginForm";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-blue-700 text-white p-4 text-center text-3xl font-bold">
        🏆 JMA Tipovačka 1.0
      </header>

      <div className="max-w-md mx-auto mt-12 bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-8">
          Přihlášení
        </h2>

        <LoginForm />

        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-2">
            Nemáš účet?
          </p>

          <Link
            href="/registrace"
            className="text-blue-700 hover:underline font-semibold"
          >
            Registrovat se
          </Link>
        </div>
      </div>
    </main>
  );
}
