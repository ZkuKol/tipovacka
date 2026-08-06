import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import TipForm from "./TipForm";

type TipsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Team = {
  id: string;
  name_cs: string;
  flag_emoji: string;
};

type Match = {
  id: string;
  round: string | null;
  match_time: string;
  home_score: number | null;
  away_score: number | null;
  finished: boolean;
  home_team: Team | null;
  away_team: Team | null;
};

type Tip = {
  id: string;
  match_id: string;
  winner: "home" | "away";
  margin_bucket: number;
  points: number;
};

function getPointsClasses(points: number) {
  if (points === 5) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (points === 1) {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

export default async function TipsPage({ params }: TipsPageProps) {
  const { id } = await params;
  const profile = await requireUser();

  const supabase = await createClient();

  const { data: competition, error: competitionError } = await supabase
    .from("competitions")
    .select("id, title")
    .eq("id", id)
    .single();

  if (competitionError || !competition) {
    notFound();
  }

  const { data: member, error: memberError } = await supabase
    .from("competition_members")
    .select("id, approved, paid")
    .eq("competition_id", id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (memberError) {
    throw new Error(
      `Nepodařilo se ověřit členství v soutěži: ${memberError.message}`,
    );
  }

  if (!member) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-8">
        <h2 className="text-xl font-bold text-yellow-900">
          Nejsi členem této soutěže
        </h2>

        <p className="mt-2 text-sm text-yellow-800">
          Do soutěže tě nejdříve musí přidat administrátor.
        </p>
      </div>
    );
  }

  if (!member.approved) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-8">
        <h2 className="text-xl font-bold text-yellow-900">
          Členství čeká na schválení
        </h2>

        <p className="mt-2 text-sm text-yellow-800">
          Tipování se zpřístupní po schválení administrátorem.
        </p>
      </div>
    );
  }

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select(
      `
        id,
        round,
        match_time,
        home_score,
        away_score,
        finished,
        home_team:teams!matches_home_team_id_fkey (
          id,
          name_cs,
          flag_emoji
        ),
        away_team:teams!matches_away_team_id_fkey (
          id,
          name_cs,
          flag_emoji
        )
      `,
    )
    .eq("competition_id", id)
    .order("match_time", { ascending: true });

  if (matchesError) {
    throw new Error(
      `Nepodařilo se načíst zápasy: ${matchesError.message}`,
    );
  }

  const { data: tipsData, error: tipsError } = await supabase
    .from("tips")
    .select(
      `
        id,
        match_id,
        winner,
        margin_bucket,
        points
      `,
    )
    .eq("competition_member_id", member.id);

  if (tipsError) {
    throw new Error(`Nepodařilo se načíst tipy: ${tipsError.message}`);
  }

  const matches = (matchesData ?? []) as unknown as Match[];
  const tips = (tipsData ?? []) as Tip[];

  const tipsByMatchId = new Map(
    tips.map((tip) => [tip.match_id, tip]),
  );

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tipování</h2>

        <p className="mt-1 text-sm text-gray-600">
          Vyber vítěze a odhadni pásmo výsledného rozdílu. Tip lze měnit až
          do začátku zápasu.
        </p>

        {!member.paid && (
          <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
            Platba zatím není potvrzená. Tipování je prozatím zpřístupněné,
            ale stav platby musí potvrdit administrátor.
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">
            Zatím nejsou připravené žádné zápasy
          </h3>

          <p className="mt-2 text-sm text-gray-600">
            Administrátor musí nejdříve přidat program soutěže.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const tip = tipsByMatchId.get(match.id);
            const matchDate = new Date(match.match_time);
            const isLocked = matchDate <= now;

            const hasResult =
              match.finished &&
              match.home_score !== null &&
              match.away_score !== null;

            const homeTeamName =
              match.home_team?.name_cs ?? "Neznámý tým";

            const awayTeamName =
              match.away_team?.name_cs ?? "Neznámý tým";

            const homeTeamLabel = `${
              match.home_team?.flag_emoji ?? ""
            } ${homeTeamName}`.trim();

            const awayTeamLabel = `${
              match.away_team?.flag_emoji ?? ""
            } ${awayTeamName}`.trim();

            return (
              <div
                key={match.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                      {match.round || "Bez označení skupiny"}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {matchDate.toLocaleString("cs-CZ", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      isLocked
                        ? "bg-gray-200 text-gray-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {isLocked ? "Tipování uzamčeno" : "Tipování otevřeno"}
                  </span>
                </div>

                <div className="p-5">
                  <TipForm
                    action={`/api/souteze/${id}/tipy/${match.id}`}
                    homeTeam={homeTeamLabel}
                    awayTeam={awayTeamLabel}
                    initialWinner={tip?.winner}
                    initialMarginBucket={tip?.margin_bucket}
                    locked={isLocked}
                    hasSavedTip={Boolean(tip)}
                  />

                  {hasResult && (
                    <div className="mt-5 border-t border-gray-200 pt-5">
                      <p className="text-center text-sm font-semibold text-gray-600">
                        Výsledek
                      </p>

                      <p className="mt-1 text-center text-xl font-bold text-gray-900">
                        {homeTeamLabel} {match.home_score} :{" "}
                        {match.away_score} {awayTeamLabel}
                      </p>

                      {tip && (
                        <div className="mt-4 flex justify-center">
                          <span
                            className={`inline-flex rounded-xl border px-4 py-2 text-sm font-bold ${getPointsClasses(
                              tip.points,
                            )}`}
                          >
                            Získáno: {tip.points}{" "}
                            {tip.points === 1 ? "bod" : "bodů"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
