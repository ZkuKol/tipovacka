export default function Registrace() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Registrace
        </h1>

        <input
          type="text"
          placeholder="Přezdívka"
          className="w-full border rounded-lg p-3 mb-4"
        />

        <input
          type="email"
          placeholder="E-mail"
          className="w-full border rounded-lg p-3 mb-4"
        />

        <input
          type="password"
          placeholder="Heslo"
          className="w-full border rounded-lg p-3 mb-6"
        />

        <button className="w-full bg-blue-700 text-white rounded-lg p-3">
          Vytvořit účet
        </button>
      </div>
    </main>
  );
}
