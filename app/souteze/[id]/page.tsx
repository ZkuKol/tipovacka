import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type CompetitionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CompetitionDetailPage({
  params,
}: CompetitionDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: competition, error } = await supabase
    .from("competitions")
    .select(
      `
        id,
        deadline,
        paid,
        pending_tips,
        ranking,
        total_players
      `
    )
    .eq("id", id)
    .single();

  if (error || !competition) {
    notFound();
  }

  const deadline = competition.deadline
    ? new Date(competition.deadline).toLocaleString("cs-CZ")
    : "Bez termínu";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">
          Čekající tipy
        </p>

        <p className="mt-2 text-3xl font-bold text-gray-900">
          {competition.pending_tips}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">
          Aktuální pořadí
        </p>

        <p className="mt-2 text-3xl font-bold text-gray-900">
          {competition.ranking}. / {competition.total_players}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">
          Nejbližší uzávěrka
        </p>

        <p className="mt-2 text-lg font-bold text-gray-900">
          {deadline}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">
          Platba
        </p>

        <p
          className={`mt-2 text-2xl font-bold ${
            competition.paid ? "text-green-600" : "text-red-600"
          }`}
        >
          {competition.paid ? "Zaplaceno" : "Nezaplaceno"}
        </p>
      </div>
    </div>
  );
}
