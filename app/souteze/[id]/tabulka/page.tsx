import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type StandingsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type StandingRow = {
  memberId: string;
  nickname: string;
  points: number;
  fivePointHits: number;
  onePointHits: number;
  zeroPointHits: number;
  scoreAccuracy: number;
  winnerAccuracy: number;
};

function formatPercent(value: number) {
  return `${value.toLocaleString("cs-CZ", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

export default async function StandingsPage({
  params,
}: StandingsPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: competition, error: competitionError } = await supabase
    .from("competitions")
    .select("id, title")
    .eq("id", id)
    .single();

  if (competitionError || !competition) {
    notFound();
  }

  const { data: membersData, error: membersError } = await supabase
    .from("competition_members")
    .select(
      `
        id,
        approved,
        profiles (
          nickname
        )
      `,
    )
    .eq("competition_id", id)
    .eq("approved", true);

  if (membersError) {
    throw new Error(
      `Nepodařilo se načíst hráče: ${membersError.message}`,
    );
  }

  const memberIds = (membersData ?? []).map((member) => member.id);

  const { data: tipsData, error: tipsError } =
    memberIds.length > 0
      ? await supabase
          .from("tips")
          .select(
            `
              competition_member_id,
              points
            `,
          )
          .in("competition_member_id", memberIds)
      : { data: [], error: null };

  if (tipsError) {
    throw new Error(
      `Nepodařilo se načíst body: ${tipsError.message}`,
    );
  }

  const standings: StandingRow[] = (membersData ?? []).map(
    (member) => {
      const memberTips = (tipsData ?? []).filter(
        (tip) => tip.competition_member_id === member.id,
      );

      const fivePointHits = memberTips.filter(
        (tip) => tip.points === 5,
      ).length;

      const onePointHits = memberTips.filter(
        (tip) => tip.points === 1,
      ).length;

      const zeroPointHits = memberTips.filter(
        (tip) => tip.points === 0,
      ).length;

      const evaluatedTips =
        fivePointHits + onePointHits + zeroPointHits;

      const points =
        fivePointHits * 5 + onePointHits;

      const scoreAccuracy =
        evaluatedTips > 0
          ? (fivePointHits / evaluatedTips) * 100
          : 0;

      const winnerAccuracy =
        evaluatedTips > 0
          ? ((fivePointHits + onePointHits) / evaluatedTips) * 100
          : 0;

      const profile = Array.isArray(member.profiles)
        ? member.profiles[0]
        : member.profiles;

      return {
        memberId: member.id,
        nickname: profile?.nickname || "Bez přezdívky",
        points,
        fivePointHits,
        onePointHits,
        zeroPointHits,
        scoreAccuracy,
        winnerAccuracy,
      };
    },
  );

  standings.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (b.fivePointHits !== a.fivePointHits) {
      return b.fivePointHits - a.fivePointHits;
    }

    if (b.winnerAccuracy !== a.winnerAccuracy) {
      return b.winnerAccuracy - a.winnerAccuracy;
    }

    return a.nickname.localeCompare(b.nickname, "cs-CZ");
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Tabulka
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Průběžné pořadí soutěže {competition.title}.
        </p>
      </div>

      {standings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">
            Zatím nejsou žádní schválení hráči
          </h3>

          <p className="mt-2 text-sm text-gray-600">
            Po přidání a schválení hráčů se zde zobrazí pořadí.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                    Pořadí
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                    Hráč
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                    Přesný výsledek
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                    Správný vítěz
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                    Netrefa
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                    Úspěšnost skóre
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                    Úspěšnost vítěze
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500">
                    Body
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {standings.map((row, index) => (
                  <tr key={row.memberId}>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-gray-900">
                      {index + 1}.
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="font-bold text-gray-900">
                        {row.nickname}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center text-sm font-semibold text-gray-700">
                      {row.fivePointHits}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center text-sm font-semibold text-gray-700">
                      {row.onePointHits}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center text-sm font-semibold text-gray-700">
                      {row.zeroPointHits}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center text-sm font-semibold text-gray-700">
                      {formatPercent(row.scoreAccuracy)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-center text-sm font-semibold text-gray-700">
                      {formatPercent(row.winnerAccuracy)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <span className="text-xl font-black text-orange-600">
                        {row.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
