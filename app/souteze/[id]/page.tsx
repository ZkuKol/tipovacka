import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/prihlaseni");
  }

  const { data: competition, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !competition) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-6">
        <p className="mb-2 text-sm font-semibold text-orange-600">
          {competition.sport}
        </p>

        <h1 className="text-3xl font-bold text-gray-900">
          {competition.title}
        </h1>

        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-gray-600">
            Sem přijde přehled soutěže, zápasy, tipování, tabulka a
            účastníci.
          </p>

          <p className="mt-4 text-sm text-gray-400">
            ID soutěže: {competition.id}
          </p>
        </div>
      </main>
    </div>
  );
}
