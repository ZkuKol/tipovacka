import Image from "next/image";
import Link from "next/link";

type CompetitionCardProps = {
  id: string;
  hero: string;
  title: string;
  sport: string;
  pendingTips: number;
  ranking: number;
  totalPlayers: number;
  deadline: string;
  paid: boolean;
};

export default function CompetitionCard({
  id,
  hero,
  title,
  sport,
  pendingTips,
  ranking,
  totalPlayers,
  deadline,
  paid,
}: CompetitionCardProps) {
  return (
    <Link
      href={`/souteze/${id}`}
      className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-36 overflow-hidden bg-gray-900">
        {hero ? (
          <Image
            src={hero}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-gray-900" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5">
          <span className="mb-3 inline-flex rounded-full bg-orange-500 px-3 py-1 text-sm font-semibold text-white">
            {sport}
          </span>

          <h2 className="text-2xl font-bold text-white">
            {title}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Čekající tipy
          </p>

          <p className="font-bold text-gray-900">
            {pendingTips}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Pořadí
          </p>

          <p className="font-bold text-gray-900">
            {ranking}. / {totalPlayers}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Uzávěrka
          </p>

          <p className="font-bold text-gray-900">
            {deadline}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Platba
          </p>

          <p
            className={
              paid
                ? "font-bold text-green-600"
                : "font-bold text-red-600"
            }
          >
            {paid ? "Zaplaceno" : "Nezaplaceno"}
          </p>
        </div>
      </div>
    </Link>
  );
}
