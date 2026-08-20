alter table public.competitions
add column if not exists overall_winner_deadline timestamptz;

create table if not exists public.competition_winner_options (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null
    references public.competitions(id)
    on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists competition_winner_options_competition_id_idx
on public.competition_winner_options(competition_id);

alter table public.competitions
add column if not exists overall_winner_option_id uuid
references public.competition_winner_options(id)
on delete set null;

create table if not exists public.competition_winner_tips (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null
    references public.competitions(id)
    on delete cascade,
  competition_member_id uuid not null
    references public.competition_members(id)
    on delete cascade,
  winner_option_id uuid not null
    references public.competition_winner_options(id)
    on delete cascade,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (competition_id, competition_member_id)
);

create index if not exists competition_winner_tips_competition_id_idx
on public.competition_winner_tips(competition_id);

create index if not exists competition_winner_tips_member_id_idx
on public.competition_winner_tips(competition_member_id);
