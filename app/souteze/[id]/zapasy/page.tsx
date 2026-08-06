import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import DeleteMatchButton from "./DeleteMatchButton";

type MatchesPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    round?: string;
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

const RESULT_WARNING_AFTER_HOURS = 24;

export default async function MatchesPage({
  params,
  searchParams,
}: MatchesPageProps) {
  const { id } = await params;
  const { round } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/prihlaseni");
  }

  const { data, error } = await supabase
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
    .eq("competition_id", id);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-700">
          Nepodařilo se načíst zápasy
        </h2>

        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const allMatches = (data ?? []) as unknown as Match[];
  const now = Date.now();

  const rounds = Array.from(
    new Set(
      allMatches
        .map((match) => match.round?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b, "cs-CZ"));

  const filteredMatches = round
    ? allMatches.filter((match) => match.round === round)
    : allMatches;

  function isResultOverdue(match: Match) {
    if (match.finished) {
      return false;
    }

    const matchStart = new Date(match.match_time).getTime();
    const warningTime =
      matchStart + RESULT_WARNING_AFTER_HOURS * 60 * 60 * 1000;

    return now >= warningTime;
  }

  const overdueMatches = filteredMatches
    .filter((match) => isResultOverdue(match))
    .sort(
      (a, b) =>
        new Date(a.match_time).getTime() -
        new Date(b.match_time).getTime(),
    );

  const upcomingMatches = filteredMatches
    .filter((match) => !match.finished && !isResultOverdue(match))
    .sort(
      (a, b) =>
        new Date(a.match_time).getTime() -
        new Date(b.match_time).getTime(),
    );

  const finishedMatches = filteredMatches
    .filter((match) => match.finished)
    .sort(
      (a, b) =>
        new Date(b.match_time).getTime() -
        new Date(a.match_time).getTime(),
    );

  const hasMatches =
    overdueMatches.length > 0 ||
    upcomingMatches.length > 0 ||
    finishedMatches.length > 0;

  function renderMatch(match: Match) {
    const matchDate = new Date(match.match_time);

    const formattedDate = matchDate.toLocaleDateString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const formattedTime = matchDate.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    });

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

    const matchLabel = `${homeTeamLabel} – ${awayTeamLabel}`;

    const hoursSinceStart = Math.max(
      0,
      Math.floor(
        (now - matchDate.getTime()) / (1000 * 60 * 60),
      ),
    );

    const resultOverdue = isResultOverdue(match);

    return (
      <div
        key={match.id}
        className={`grid gap-4 p-5 md:grid-cols-[150px_1fr_430px] md:items-center ${
          resultOverdue ? "bg-red-50/40" : ""
        }`}
      >
        <div>
          {match.round && (
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
              {match.round}
            </p>
          )}

          <p className="mt-1 text-sm font-semibold text-gray-700">
            {formattedDate}
          </p>

          <p className="text-sm text-gray-500">{formattedTime}</p>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p className="text-right font-bold text-gray-900">
            {homeTeamLabel}
          </p>

          <div className="min-w-20 text-center">
            {match.finished ? (
              <span className="text-xl font-black text-gray-900">
                {match.home_score ?? 0} : {match.away_score ?? 0}
              </span>
            ) : (
              <span className="text-sm font-bold text-gray-400">
                vs.
              </span>
            )}
          </div>

          <p className="font-bold text-gray-900">
            {awayTeamLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
              match.finished
                ? "bg-green-100 text-green-700"
                : resultOverdue
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
            {match.finished
              ? "Odehráno"
              : resultOverdue
                ? `⚠ Chybí výsledek ${hoursSinceStart} h`
                : "Čeká se"}
          </span>

          <Link
            href={`/souteze/${id}/zapasy/${match.id}/vysledek`}
            className={`inline-flex rounded-lg border px-3 py-2 text-xs font-bold transition ${
              resultOverdue
                ? "border-red-300 bg-red-50 text-red-700 hover:border-red-500 hover:bg-red-100"
                : "border-green-300 text-green-700 hover:border-green-500 hover:bg-green-50"
            }`}
          >
            {match.finished
              ? "Změnit výsledek"
              : resultOverdue
                ? "Doplnit výsledek"
                : "Zadat výsledek"}
          </Link>

          <Link
            href={`/souteze/${id}/zapasy/${match.id}/upravit`}
            className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-orange-500 hover:text-orange-600"
          >
            Upravit
          </Link>

          <DeleteMatchButton
            matchId={match.id}
            competitionId={id}
            matchLabel={matchLabel}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Zápasy
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Neodehrané zápasy jsou nahoře, odehrané dole. Po{" "}
            {RESULT_WARNING_AFTER_HOURS} hodinách bez výsledku se zápas
            označí jako nevyřízený.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/souteze/${id}/zapasy/hromadne`}
            className="inline-flex items-center justify-center rounded-xl border border-orange-300 bg-white px-5 py-3 text-sm font-bold text-orange-700 transition hover:bg-orange-50"
          >
            Hromadně přidat
          </Link>

          <Link
            href={`/souteze/${id}/zapasy/novy`}
            className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
          >
            + Přidat zápas
          </Link>
        </div>
      </div>

      {rounds.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={`/souteze/${id}/zapasy`}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
              !round
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:text-orange-600"
            }`}
          >
            Všechny
          </Link>

          {rounds.map((roundName) => {
            const isActive = round === roundName;

            return (
              <Link
                key={roundName}
                href={`/souteze/${id}/zapasy?round=${encodeURIComponent(
                  roundName,
                )}`}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:text-orange-600"
                }`}
              >
                {roundName}
              </Link>
            );
          })}
        </div>
      )}

      {!hasMatches ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">
            {round
              ? `Ve výběru „${round}“ nejsou žádné zápasy`
              : "Zatím nejsou vytvořené žádné zápasy"}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            {round
              ? "Vyber jinou skupinu nebo zobraz všechny zápasy."
              : "Přidej první zápas této soutěže."}
          </p>

          {round ? (
            <Link
              href={`/souteze/${id}/zapasy`}
              className="mt-6 inline-flex rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
            >
              Zobrazit všechny zápasy
            </Link>
          ) : (
            <Link
              href={`/souteze/${id}/zapasy/novy`}
              className="mt-6 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
            >
              Přidat první zápas
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {overdueMatches.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-red-700">
                    Chybí výsledek
                  </h3>

                  <p className="mt-1 text-sm text-red-600">
                    Od začátku zápasu uplynulo alespoň{" "}
                    {RESULT_WARNING_AFTER_HOURS} hodin.
                  </p>
                </div>

                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                  {overdueMatches.length}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
                <div className="divide-y divide-red-100">
                  {overdueMatches.map(renderMatch)}
                </div>
              </div>
            </section>
          )}

          {upcomingMatches.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">
                  Nadcházející zápasy
                </h3>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  {upcomingMatches.length}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="divide-y divide-gray-200">
                  {upcomingMatches.map(renderMatch)}
                </div>
              </div>
            </section>
          )}

          {finishedMatches.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">
                  Odehrané zápasy
                </h3>

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  {finishedMatches.length}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="divide-y divide-gray-200">
                  {finishedMatches.map(renderMatch)}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
