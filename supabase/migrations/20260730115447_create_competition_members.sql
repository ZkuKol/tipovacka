create table public.competition_members (
    id uuid primary key default gen_random_uuid(),

    competition_id uuid not null
        references public.competitions(id)
        on delete cascade,

    profile_id uuid not null
        references public.profiles(id)
        on delete cascade,

    approved boolean not null default false,
    paid boolean not null default false,

    created_at timestamptz not null default now(),

    unique (competition_id, profile_id)
);

create index idx_competition_members_competition
    on public.competition_members (competition_id);

create index idx_competition_members_profile
    on public.competition_members (profile_id);
    