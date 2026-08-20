import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import BulkMatchesEditor from "./BulkMatchesEditor";

type BulkMatchesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BulkMatchesPage({
  params,
}: BulkMatchesPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: competition, error } = await supabase
    .from("competitions")
    .select("id, sport")
    .eq("id", id)
    .single();

  if (error || !competition) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/souteze/${id}/zapasy`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Zpět na zápasy
        </Link>

        <h1 className="mt-3 text-3xl font-bold">
          Hromadné přidání zápasů
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Přidej více zápasů najednou ručně nebo vložením z Excelu.
        </p>
      </div>

      <BulkMatchesEditor
        competitionId={id}
        sport={competition.sport}
      />
    </main>
  );
}
