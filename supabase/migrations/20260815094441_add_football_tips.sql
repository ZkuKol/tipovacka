alter table public.tips
add column home_score_tip integer,
add column away_score_tip integer;

alter table public.tips
alter column winner drop not null;

alter table public.tips
alter column margin_bucket drop not null;

alter table public.tips
add constraint tips_home_score_tip_nonnegative
check (home_score_tip is null or home_score_tip >= 0);

alter table public.tips
add constraint tips_away_score_tip_nonnegative
check (away_score_tip is null or away_score_tip >= 0);
