import { requireAdmin } from "@/lib/auth";

type MatchesAdminLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
};

export default async function MatchesAdminLayout({
  children,
  params,
}: MatchesAdminLayoutProps) {
  const { id } = await params;

  await requireAdmin(`/souteze/${id}`);

  return children;
}
