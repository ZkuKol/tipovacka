"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name_cs: string;
  flag_emoji: string;
};

export default function NewMatchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const competitionId = params.id;

  const [sport, setSport] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);

  const [round, setRound] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [matchTime, setMatchTime] = useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      const {
        data: competition,
        error: competitionError,
      } = await supabase
        .from("competitions")
        .select("sport")
        .eq("id", competitionId)
        .single();

      if (
        competitionError ||
        !competition
      ) {
        setErrorMessage(
          "Soutěž se nepodařilo načíst.",
        );

        setIsLoading(false);
        return;
      }

      setSport(competition.sport);

      const { data, error } = await supabase
        .from("teams")
        .select(
          "id, name_cs, flag_emoji",
        )
        .order("name_cs", {
          ascending: true,
        });

      if (error) {
        setErrorMessage(
          `Účastníky se nepodařilo načíst: ${error.message}`,
        );

        setIsLoading(false);
        return;
      }

      setTeams((data ?? []) as Team[]);
      setIsLoading(false);
    }

    void loadData();
  }, [competitionId, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");

    const cleanRound = round.trim();

    if (
      !homeTeamId ||
      !awayTeamId ||
      !matchTime
    ) {
      setErrorMessage(
        sport === "tennis"
          ? "Vyber oba hráče a termín zápasu."
          : "Vyber domácí tým, hostující tým a termín zápasu.",
      );

      return;
    }

    if (homeTeamId === awayTeamId) {
      setErrorMessage(
        sport === "tennis"
          ? "Hráč nemůže hrát sám proti sobě."
          : "Domácí a hostující tým nemohou být stejné.",
      );

      return;
    }

    const parsedMatchTime =
      new Date(matchTime);

    if (
      Number.isNaN(
        parsedMatchTime.getTime(),
      )
    ) {
      setErrorMessage(
        "Zadaný termín zápasu není platný.",
      );

      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("matches")
      .insert({
        competition_id:
          competitionId,
        round:
          cleanRound || null,
        home_team_id:
          homeTeamId,
        away_team_id:
          awayTeamId,
        match_time:
          parsedMatchTime.toISOString(),
        finished: false,
      });

    if (error) {
      setErrorMessage(
        `Zápas se nepodařilo uložit: ${error.message}`,
      );

      setIsSubmitting(false);
      return;
    }

    router.push(
      `/souteze/${competitionId}/zapasy`,
    );

    router.refresh();
  }

  const isTennis =
    sport === "tennis";

  const firstParticipantLabel =
    isTennis
      ? "Hráč 1"
      : "Domácí tým";

  const secondParticipantLabel =
    isTennis
      ? "Hráč 2"
      : "Hostující tým";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Přidat zápas
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {isTennis
            ? "Vyber hráče a nastav termín nového zápasu."
            : "Vyber týmy a nastav termín nového zápasu."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="round"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Kolo nebo skupina
            </label>

            <input
              id="round"
              type="text"
              value={round}
              onChange={(event) =>
                setRound(
                  event.target.value,
                )
              }
              placeholder="Například: Skupina A"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="homeTeam"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              {firstParticipantLabel}
            </label>

            <select
              id="homeTeam"
              value={homeTeamId}
              onChange={(event) =>
                setHomeTeamId(
                  event.target.value,
                )
              }
              required
              disabled={isLoading}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
            >
              <option value="">
                {isLoading
                  ? "Načítám…"
                  : isTennis
                    ? "Vyber hráče 1"
                    : "Vyber domácí tým"}
              </option>

              {teams.map((team) => (
                <option
                  key={team.id}
                  value={team.id}
                  disabled={
                    team.id ===
                    awayTeamId
                  }
                >
                  {team.flag_emoji}{" "}
                  {team.name_cs}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="awayTeam"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              {secondParticipantLabel}
            </label>

            <select
              id="awayTeam"
              value={awayTeamId}
              onChange={(event) =>
                setAwayTeamId(
                  event.target.value,
                )
              }
              required
              disabled={isLoading}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
            >
              <option value="">
                {isLoading
                  ? "Načítám…"
                  : isTennis
                    ? "Vyber hráče 2"
                    : "Vyber hostující tým"}
              </option>

              {teams.map((team) => (
                <option
                  key={team.id}
                  value={team.id}
                  disabled={
                    team.id ===
                    homeTeamId
                  }
                >
                  {team.flag_emoji}{" "}
                  {team.name_cs}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="matchTime"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Datum a čas zápasu
            </label>

            <input
              id="matchTime"
              type="datetime-local"
              value={matchTime}
              onChange={(event) =>
                setMatchTime(
                  event.target.value,
                )
              }
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/souteze/${competitionId}/zapasy`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
          >
            Zrušit
          </Link>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              isLoading
            }
            className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSubmitting
              ? "Ukládám…"
              : "Uložit zápas"}
          </button>
        </div>
      </form>
    </div>
  );
}

