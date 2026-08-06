alter table public.matches
    add column home_team_id uuid,
    add column away_team_id uuid;

update public.matches as matches
set home_team_id = teams.id
from public.teams as teams
where lower(trim(matches.home_team)) = lower(trim(teams.name_cs));

update public.matches as matches
set away_team_id = teams.id
from public.teams as teams
where lower(trim(matches.away_team)) = lower(trim(teams.name_cs));

do $$
begin
    if exists (
        select 1
        from public.matches
        where home_team_id is null
           or away_team_id is null
    ) then
        raise exception
            'Některý zápas se nepodařilo propojit s tabulkou teams. Zkontroluj názvy týmů v matches.';
    end if;
end;
$$;

alter table public.matches
    alter column home_team_id set not null,
    alter column away_team_id set not null;

alter table public.matches
    add constraint matches_home_team_id_fkey
        foreign key (home_team_id)
        references public.teams(id)
        on delete restrict,
    add constraint matches_away_team_id_fkey
        foreign key (away_team_id)
        references public.teams(id)
        on delete restrict,
    add constraint matches_different_teams_check
        check (home_team_id <> away_team_id);

create index matches_home_team_id_idx
    on public.matches (home_team_id);

create index matches_away_team_id_idx
    on public.matches (away_team_id);

alter table public.matches
    drop column home_team,
    drop column away_team;
    