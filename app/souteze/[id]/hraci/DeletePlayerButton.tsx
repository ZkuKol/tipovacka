"use client";

type DeletePlayerButtonProps = {
  playerName: string;
};

export default function DeletePlayerButton({
  playerName,
}: DeletePlayerButtonProps) {
  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    const confirmed = window.confirm(
      `Opravdu chceš odebrat hráče „${playerName}“ ze soutěže?`
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      onClick={handleClick}
      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
    >
      Odebrat
    </button>
  );
}
