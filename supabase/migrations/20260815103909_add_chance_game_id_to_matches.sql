alter table public.matches
add column chance_game_id bigint;

alter table public.matches
add column chance_synced_at timestamptz;

create unique index matches_chance_game_id_key
on public.matches (chance_game_id)
where chance_game_id is not null;
