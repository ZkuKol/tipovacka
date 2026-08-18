alter table public.competitions
add column if not exists predict_overall_winner boolean not null default false;
