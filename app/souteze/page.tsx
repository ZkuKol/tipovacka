import CompetitionCard from "@/components/CompetitionCard";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SoutezePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/prihlaseni");
  }

  const { data: competitions, error } = await supabase
    .from("competitions")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-6">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          Moje soutěže
        </h1>

        {error && (
          <div className="rounded-xl bg-red-100 p-4 text-red-700">
            Chyba při načítání soutěží: {error.message}
          </div>
        )}

        {!error && competitions?.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow">
            Zatím nemáš žádnou soutěž.
          </div>
        )}

        {!error && competitions && competitions.length > 0 && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {competitions.map((competition) => (
              <CompetitionCard
                key={competition.id}
                id={competition.id}
                hero={competition.hero}
                title={competition.title}
                sport={competition.sport}
                pendingTips={competition.pending_tips}
                ranking={competition.ranking}
                totalPlayers={competition.total_players}
                deadline={
                  competition.deadline
                    ? new Date(competition.deadline).toLocaleString("cs-CZ")
                    : "Bez termínu"
                }
                paid={competition.paid}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
