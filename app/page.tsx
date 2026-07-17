import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-blue-700 text-white p-4 text-center text-3xl font-bold">
        🏆 JMA Tipovačka 1.0
      </header>

      <div className="max-w-md mx-auto mt-12 bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-8">
          Název soutěže
        </h2>

        <button className="w-full bg-blue-700 text-white py-3 rounded-lg mb-4 hover:bg-blue-800">
          Přihlásit se
        </button>

        <Link href="/registrace">
  <button className="w-full bg-gray-200 py-3 rounded-lg hover:bg-gray-300">
    Registrovat se
  </button>
</Link>
      </div>
    </main>
  );
}


