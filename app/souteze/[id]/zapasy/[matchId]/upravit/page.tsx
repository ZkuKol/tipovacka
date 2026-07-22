import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import EditMatchForm from "./EditMatchForm";

type EditMatchPageProps = {
  params: Promise<{
    id: string;
    matchId: string;
  }>;
};

export default async function EditMatchPage({
  params,
}: EditMatchPageProps) {
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
        round,
        home_team,
        away_team,
        match_time
      `
    )
    .eq("id", matchId)
    .eq("competition_id", id)
    .single();

  if (error || !match) {
    notFound();
  }

  return (
    <EditMatchForm
      competitionId={id}
      match={{
        id: match.id,
        round: match.round,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        matchTime: match.match_time,
      }}
    />
  );
}
