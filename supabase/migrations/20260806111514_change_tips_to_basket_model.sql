alter table public.tips
    add column winner text,
    add column margin_bucket integer;

update public.tips
set
    winner = case
        when home_score > away_score then 'home'
        when away_score > home_score then 'away'
        else null
    end,
    margin_bucket = least(
        95,
        ceil(abs(home_score - away_score) / 5.0)::integer * 5
    );

delete from public.tips
where winner is null;

update public.tips
set points = 0;

alter table public.tips
    alter column winner set not null,
    alter column margin_bucket set not null;

alter table public.tips
    add constraint tips_winner_check
        check (winner in ('home', 'away')),
    add constraint tips_margin_bucket_check
        check (
            margin_bucket between 5 and 95
            and margin_bucket % 5 = 0
        );

alter table public.tips
    drop column home_score,
    drop column away_score;
    