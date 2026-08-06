create table public.tips (
    id uuid primary key default gen_random_uuid(),

    match_id uuid not null
        references public.matches(id)
        on delete cascade,

    competition_member_id uuid not null
        references public.competition_members(id)
        on delete cascade,

    home_score integer not null
        check (home_score >= 0),

    away_score integer not null
        check (away_score >= 0),

    points integer not null default 0
        check (points >= 0),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (match_id, competition_member_id)
);

create index tips_match_idx
    on public.tips (match_id);

create index tips_member_idx
    on public.tips (competition_member_id);

alter table public.tips enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Users can view own tips"
on public.tips
for select
to authenticated
using (
    public.is_admin()
    or exists (
        select 1
        from public.competition_members
        where competition_members.id = tips.competition_member_id
          and competition_members.profile_id = auth.uid()
    )
);

create policy "Users can create own tips before match"
on public.tips
for insert
to authenticated
with check (
    public.is_admin()
    or exists (
        select 1
        from public.competition_members
        join public.matches
          on matches.competition_id =
             competition_members.competition_id
        where competition_members.id = tips.competition_member_id
          and competition_members.profile_id = auth.uid()
          and competition_members.approved = true
          and matches.id = tips.match_id
          and matches.match_time > now()
    )
);

create policy "Users can update own tips before match"
on public.tips
for update
to authenticated
using (
    public.is_admin()
    or exists (
        select 1
        from public.competition_members
        join public.matches
          on matches.competition_id =
             competition_members.competition_id
        where competition_members.id = tips.competition_member_id
          and competition_members.profile_id = auth.uid()
          and competition_members.approved = true
          and matches.id = tips.match_id
          and matches.match_time > now()
    )
)
with check (
    public.is_admin()
    or exists (
        select 1
        from public.competition_members
        join public.matches
          on matches.competition_id =
             competition_members.competition_id
        where competition_members.id = tips.competition_member_id
          and competition_members.profile_id = auth.uid()
          and competition_members.approved = true
          and matches.id = tips.match_id
          and matches.match_time > now()
    )
);

create policy "Users can delete own tips before match"
on public.tips
for delete
to authenticated
using (
    public.is_admin()
    or exists (
        select 1
        from public.competition_members
        join public.matches
          on matches.competition_id =
             competition_members.competition_id
        where competition_members.id = tips.competition_member_id
          and competition_members.profile_id = auth.uid()
          and matches.id = tips.match_id
          and matches.match_time > now()
    )
);

create or replace function public.set_tips_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger set_tips_updated_at
before update on public.tips
for each row
execute function public.set_tips_updated_at();
