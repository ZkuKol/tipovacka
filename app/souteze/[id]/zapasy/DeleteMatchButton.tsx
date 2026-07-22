"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteMatchButtonProps = {
  matchId: string;
  competitionId: string;
  matchLabel: string;
};

export default function DeleteMatchButton({
  matchId,
  competitionId,
  matchLabel,
}: DeleteMatchButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Opravdu chceš smazat zápas ${matchLabel}?`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId)
      .eq("competition_id", competitionId);

    if (error) {
      setErrorMessage(`Zápas se nepodařilo smazat: ${error.message}`);
      setIsDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600 transition hover:border-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDeleting ? "Mažu…" : "Smazat"}
      </button>

      {errorMessage && (
        <p className="max-w-48 text-right text-xs font-semibold text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
