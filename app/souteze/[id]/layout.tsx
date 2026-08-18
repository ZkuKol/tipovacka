import Header from "@/components/Header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type CompetitionLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
};

export default async function CompetitionLayout({
  children,
  params,
}: CompetitionLayoutProps) {
  const { id } = await params;

  const profile = await requireUser();
  const supabase = await createClient();

  const { data: competition, error } = await supabase
    .from("competitions")
    .select("id, title, sport")
    .eq("id", id)
    .single();

  if (error || !competition) {
    notFound();
  }

  const navigation = [
    {
      label: "Přehled",
      href: `/souteze/${id}`,
      adminOnly: false,
    },
    {
      label: "Zápasy",
      href: `/souteze/${id}/zapasy`,
      adminOnly: true,
    },
    {
      label: "Tipování",
      href: `/souteze/${id}/tipy`,
      adminOnly: false,
    },
    {
      label: "Tabulka",
      href: `/souteze/${id}/tabulka`,
      adminOnly: false,
    },
    {
      label: "Hráči",
      href: `/souteze/${id}/hraci`,
      adminOnly: true,
    },
    {
      label: "Nastavení",
      href: `/souteze/${id}/nastaveni`,
      adminOnly: true,
    },
  ];

  const visibleNavigation = navigation.filter(
    (item) => !item.adminOnly || profile.role === "admin",
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-6">
        <Link
          href="/souteze"
          className="mb-5 inline-flex text-sm font-semibold text-gray-600 transition hover:text-orange-600"
        >
          ← Zpět na soutěže
        </Link>

        <p className="mb-1 text-sm font-semibold text-orange-600">
          {competition.sport}
        </p>

        <h1 className="text-3xl font-bold text-gray-900">
          {competition.title}
        </h1>

        <nav className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
          <div className="flex min-w-max">
            {visibleNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b-2 border-transparent px-4 py-4 text-sm font-semibold text-gray-600 transition hover:border-orange-500 hover:text-orange-600"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <section className="mt-6">{children}</section>
      </main>
    </div>
  );
}
