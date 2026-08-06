create table public.teams (
    id uuid primary key default gen_random_uuid(),

    name_cs text not null,
    country_code text not null,
    fiba_code text not null,
    flag_emoji text not null,

    created_at timestamptz not null default now(),

    constraint teams_name_cs_not_empty
        check (char_length(trim(name_cs)) > 0),

    constraint teams_country_code_format
        check (country_code ~ '^[A-Z]{2}$'),

    constraint teams_fiba_code_format
        check (fiba_code ~ '^[A-Z]{3}$'),

    constraint teams_country_code_unique
        unique (country_code),

    constraint teams_fiba_code_unique
        unique (fiba_code)
);

create index teams_name_cs_idx
    on public.teams (name_cs);

alter table public.teams enable row level security;

create policy "Authenticated users can view teams"
on public.teams
for select
to authenticated
using (true);

create policy "Admins can create teams"
on public.teams
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update teams"
on public.teams
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete teams"
on public.teams
for delete
to authenticated
using (public.is_admin());

insert into public.teams (
    name_cs,
    country_code,
    fiba_code,
    flag_emoji
)
values
    ('Austrálie', 'AU', 'AUS', '🇦🇺'),
    ('Belgie', 'BE', 'BEL', '🇧🇪'),
    ('Česko', 'CZ', 'CZE', '🇨🇿'),
    ('Čína', 'CN', 'CHN', '🇨🇳'),
    ('Francie', 'FR', 'FRA', '🇫🇷'),
    ('Itálie', 'IT', 'ITA', '🇮🇹'),
    ('Japonsko', 'JP', 'JPN', '🇯🇵'),
    ('Jižní Korea', 'KR', 'KOR', '🇰🇷'),
    ('Maďarsko', 'HU', 'HUN', '🇭🇺'),
    ('Mali', 'ML', 'MLI', '🇲🇱'),
    ('Německo', 'DE', 'GER', '🇩🇪'),
    ('Nigérie', 'NG', 'NGR', '🇳🇬'),
    ('Portoriko', 'PR', 'PUR', '🇵🇷'),
    ('Španělsko', 'ES', 'ESP', '🇪🇸'),
    ('Turecko', 'TR', 'TUR', '🇹🇷'),
    ('USA', 'US', 'USA', '🇺🇸');
    