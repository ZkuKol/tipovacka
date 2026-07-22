import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import MatchResultForm from "./MatchResultForm";

type MatchResultPageProps = {
  params: Promise<{
    id: string;
    matchId: string;
  }>;
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

  const { data: match, error } = await supabase
    .from("matches")
    .select(
      `
        id,
        competition_id,
        home_team,
        away_team,
        home_score,
        away_score,
        finished
      `
    )
    .eq("id", matchId)
    .eq("competition_id", id)
    .single();

  if (error || !match) {
    notFound();
  }

  return (
    <MatchResultForm
      competitionId={id}
      match={{
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        homeScore: match.home_score,
        awayScore: match.away_score,
        finished: match.finished,
      }}
    />
  );
}
