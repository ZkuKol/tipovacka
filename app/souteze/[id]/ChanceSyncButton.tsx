"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ChanceSyncButtonProps = {
  competitionId: string;
};

type SyncResponse = {
  success: boolean;
  message: string;
};

export default function ChanceSyncButton({
  competitionId,
}: ChanceSyncButtonProps) {
  const router = useRouter();

  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSync() {
    setIsSyncing(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/souteze/${competitionId}/chance-sync`,
        {
          method: "POST",
        },
      );

      const result = (await response.json()) as SyncResponse;

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    } catch {
      setMessage("Synchronizace se nepodařila.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
      >
        {isSyncing
          ? "Synchronizuji…"
          : "Synchronizovat Chance Ligu"}
      </button>

      {message && (
        <p className="mt-2 text-sm font-semibold text-gray-700">
          {message}
        </p>
      )}
    </div>
  );
}
