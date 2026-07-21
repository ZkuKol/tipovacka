import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export default function PrihlaseniPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-3xl font-bold">
          Přihlášení
        </h1>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-gray-600">
          Ještě nemáš účet?{" "}
          <Link
            href="/registrace"
            className="font-semibold text-blue-700 hover:underline"
          >
            Zaregistrovat se
          </Link>
        </p>
      </div>
    </main>
  );
}
