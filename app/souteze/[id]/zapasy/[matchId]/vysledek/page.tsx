import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import MatchResultForm from "./MatchResultForm";

type MatchResultPageProps = {
  params: Promise<{
    id: string;
    matchId: string;
  }>;
};

type Team = {
  id: string;
  name_cs: string;
  flag_emoji: string;
};

type MatchWithTeams = {
  id: string;
  competition_id: string;
  home_score: number | null;
  away_score: number | null;
  finished: boolean;
  home_team: Team | null;
  away_team: Team | null;
};

export default async function MatchResultPage({
  params,
}: MatchResultPageProps) {
  const { id, matchId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/prihlaseni");
  }

  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select("id, sport")
      .eq("id", id)
      .single();

  if (competitionError || !competition) {
    notFound();
  }

  const { data, error } = await supabase
    .from("matches")
    .select(
      `
        id,
        competition_id,
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
    .eq("id", matchId)
    .eq("competition_id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const match = data as unknown as MatchWithTeams;

  if (!match.home_team || !match.away_team) {
    notFound();
  }

  const homeTeamLabel =
    `${match.home_team.flag_emoji} ${match.home_team.name_cs}`.trim();

  const awayTeamLabel =
    `${match.away_team.flag_emoji} ${match.away_team.name_cs}`.trim();

  return (
    <MatchResultForm
      competitionId={id}
      sport={competition.sport}
      match={{
        id: match.id,
        homeTeam: homeTeamLabel,
        awayTeam: awayTeamLabel,
        homeScore: match.home_score,
        awayScore: match.away_score,
        finished: match.finished,
      }}
    />
  );
}
