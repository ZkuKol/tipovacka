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
  winner: "home" | "away" | null;
  margin_bucket: number | null;
  home_score_tip: number | null;
  away_score_tip: number | null;
  points: number;
};

type WinnerOption = {
  id: string;
  name: string;
};

type WinnerTip = {
  id: string;
  winner_option_id: string;
  points: number;
};

function getPointsClasses(
  points: number,
  sport: string,
) {
  if (sport === "football") {
    if (points === 3) {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (points === 1) {
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    }

    return "border-red-200 bg-red-50 text-red-700";
  }

  if (points === 5) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (points === 1) {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

export default async function TipsPage({
  params,
}: TipsPageProps) {
  const { id } = await params;

  const profile = await requireUser();
  const supabase = await createClient();

  const {
    data: competition,
    error: competitionError,
  } = await supabase
    .from("competitions")
    .select(
      `
        id,
        title,
        sport,
        predict_overall_winner,
        overall_winner_deadline,
        overall_winner_option_id
      `,
    )
    .eq("id", id)
    .single();

  if (competitionError || !competition) {
    notFound();
  }

  const {
    data: member,
    error: memberError,
  } = await supabase
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
          Do soutěže se nejdříve přihlas a počkej na
          schválení administrátorem.
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

  let winnerOptions: WinnerOption[] = [];
  let winnerTip: WinnerTip | null = null;

  if (competition.predict_overall_winner) {
    const {
      data: winnerOptionsData,
      error: winnerOptionsError,
    } = await supabase
      .from("competition_winner_options")
      .select("id, name")
      .eq("competition_id", id)
      .order("name", { ascending: true });

    if (winnerOptionsError) {
      throw new Error(
        `Nepodařilo se načíst možné vítěze: ${winnerOptionsError.message}`,
      );
    }

    winnerOptions =
      (winnerOptionsData ?? []) as WinnerOption[];

    const {
      data: winnerTipData,
      error: winnerTipError,
    } = await supabase
      .from("competition_winner_tips")
      .select(
        `
          id,
          winner_option_id,
          points
        `,
      )
      .eq("competition_id", id)
      .eq(
        "competition_member_id",
        member.id,
      )
      .maybeSingle();

    if (winnerTipError) {
      throw new Error(
        `Nepodařilo se načíst tip na vítěze: ${winnerTipError.message}`,
      );
    }

    winnerTip =
      winnerTipData as WinnerTip | null;
  }

  const {
    data: matchesData,
    error: matchesError,
  } = await supabase
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
    .order("match_time", {
      ascending: true,
    });

  if (matchesError) {
    throw new Error(
      `Nepodařilo se načíst zápasy: ${matchesError.message}`,
    );
  }

  const {
    data: tipsData,
    error: tipsError,
  } = await supabase
    .from("tips")
    .select(
      `
        id,
        match_id,
        winner,
        margin_bucket,
        home_score_tip,
        away_score_tip,
        points
      `,
    )
    .eq(
      "competition_member_id",
      member.id,
    );

  if (tipsError) {
    throw new Error(
      `Nepodařilo se načíst tipy: ${tipsError.message}`,
    );
  }

  const matches =
    (matchesData ?? []) as unknown as Match[];

  const tips =
    (tipsData ?? []) as Tip[];

  const tipsByMatchId = new Map(
    tips.map((tip) => [
      tip.match_id,
      tip,
    ]),
  );

  const now = new Date();

  const isFootball =
    competition.sport === "football";

  const winnerDeadline =
    competition.overall_winner_deadline
      ? new Date(
          competition.overall_winner_deadline,
        )
      : null;

  const winnerTipLocked =
    Boolean(
      competition.overall_winner_option_id,
    ) ||
    Boolean(
      winnerDeadline &&
        winnerDeadline <= now,
    );

  const selectedWinnerName =
    winnerOptions.find(
      (option) =>
        option.id ===
        winnerTip?.winner_option_id,
    )?.name ?? null;

  const actualWinnerName =
    winnerOptions.find(
      (option) =>
        option.id ===
        competition.overall_winner_option_id,
    )?.name ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Tipování
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          {isFootball
            ? "Zadej očekávané konečné skóre zápasu. Tip lze měnit až do začátku utkání."
            : "Vyber vítěze a odhadni pásmo výsledného rozdílu. Tip lze měnit až do začátku zápasu."}
        </p>

        {!member.paid && (
          <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
            Platba zatím není potvrzená.
            Tipování je prozatím zpřístupněné,
            ale stav platby musí potvrdit administrátor.
          </div>
        )}
      </div>

      {competition.predict_overall_winner && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                Bonusový tip
              </p>

              <h3 className="mt-1 text-xl font-bold text-gray-900">
                Celkový vítěz soutěže
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Správný tip = 10 bodů.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                winnerTipLocked
                  ? "bg-gray-200 text-gray-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {winnerTipLocked
                ? "Tip uzamčen"
                : "Tip otevřen"}
            </span>
          </div>

          {winnerDeadline && (
            <p className="mt-4 text-sm font-semibold text-gray-700">
              Uzávěrka:{" "}
              {winnerDeadline.toLocaleString(
                "cs-CZ",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </p>
          )}

          {winnerOptions.length === 0 ? (
            <p className="mt-5 text-sm font-semibold text-yellow-800">
              Administrátor zatím nepřidal možné vítěze.
            </p>
          ) : winnerTipLocked ? (
            <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-600">
                Tvůj tip
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900">
                {selectedWinnerName ??
                  "Tip nebyl uložen"}
              </p>

              {actualWinnerName && (
                <>
                  <p className="mt-4 text-sm text-gray-600">
                    Skutečný vítěz
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    {actualWinnerName}
                  </p>

                  {winnerTip && (
                    <p
                      className={`mt-4 inline-flex rounded-xl border px-4 py-2 text-sm font-bold ${
                        winnerTip.points === 10
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      Získáno:{" "}
                      {winnerTip.points} bodů
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <form
              action={`/api/souteze/${id}/celkovy-vitez`}
              method="post"
              className="mt-5"
            >
              <label
                htmlFor="winnerOptionId"
                className="mb-2 block text-sm font-bold text-gray-700"
              >
                Tvůj tip na vítěze
              </label>

              <select
                id="winnerOptionId"
                name="winnerOptionId"
                defaultValue={
                  winnerTip?.winner_option_id ??
                  ""
                }
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              >
                <option value="" disabled>
                  Vyber vítěze
                </option>

                {winnerOptions.map(
                  (option) => (
                    <option
                      key={option.id}
                      value={option.id}
                    >
                      {option.name}
                    </option>
                  ),
                )}
              </select>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700"
                >
                  {winnerTip
                    ? "Změnit tip"
                    : "Uložit tip"}
                </button>

                {winnerTip && (
                  <span className="text-sm font-semibold text-green-700">
                    Tip uložen
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      )}

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
            const tip =
              tipsByMatchId.get(match.id);

            const matchDate =
              new Date(match.match_time);

            const isLocked =
              matchDate <= now;

            const hasResult =
              match.finished &&
              match.home_score !== null &&
              match.away_score !== null;

            const homeTeamName =
              match.home_team?.name_cs ??
              "Neznámý tým";

            const awayTeamName =
              match.away_team?.name_cs ??
              "Neznámý tým";

            const homeTeamLabel = `${
              match.home_team?.flag_emoji ??
              ""
            } ${homeTeamName}`.trim();

            const awayTeamLabel = `${
              match.away_team?.flag_emoji ??
              ""
            } ${awayTeamName}`.trim();

            return (
              <div
                key={match.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                      {match.round ||
                        "Bez označení kola"}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {matchDate.toLocaleString(
                        "cs-CZ",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      isLocked
                        ? "bg-gray-200 text-gray-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {isLocked
                      ? "Tipování uzamčeno"
                      : "Tipování otevřeno"}
                  </span>
                </div>

                <div className="p-5">
                  <TipForm
                    action={`/api/souteze/${id}/tipy/${match.id}`}
                    sport={competition.sport}
                    homeTeam={
                      homeTeamLabel
                    }
                    awayTeam={
                      awayTeamLabel
                    }
                    initialWinner={
                      tip?.winner === "home" ||
                      tip?.winner === "away"
                        ? tip.winner
                        : undefined
                    }
                    initialMarginBucket={
                      tip?.margin_bucket ??
                      undefined
                    }
                    initialHomeScoreTip={
                      tip?.home_score_tip ??
                      undefined
                    }
                    initialAwayScoreTip={
                      tip?.away_score_tip ??
                      undefined
                    }
                    locked={isLocked}
                    hasSavedTip={Boolean(tip)}
                  />

                  {hasResult && (
                    <div className="mt-5 border-t border-gray-200 pt-5">
                      <p className="text-center text-sm font-semibold text-gray-600">
                        Výsledek
                      </p>

                      <p className="mt-1 text-center text-xl font-bold text-gray-900">
                        {homeTeamLabel}{" "}
                        {match.home_score} :{" "}
                        {match.away_score}{" "}
                        {awayTeamLabel}
                      </p>

                      {tip && (
                        <div className="mt-4 flex justify-center">
                          <span
                            className={`inline-flex rounded-xl border px-4 py-2 text-sm font-bold ${getPointsClasses(
                              tip.points,
                              competition.sport,
                            )}`}
                          >
                            Získáno:{" "}
                            {tip.points}{" "}
                            {tip.points === 1
                              ? "bod"
                              : "bodů"}
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
