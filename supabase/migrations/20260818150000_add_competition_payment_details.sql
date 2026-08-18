alter table public.competitions
add column if not exists description text,
add column if not exists entry_fee integer,
add column if not exists payment_account text,
add column if not exists payment_bank_code text,
add column if not exists payment_message text;
