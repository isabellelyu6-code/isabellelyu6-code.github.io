-- Ego 日记 cloud storage. Run once in Supabase → SQL Editor.
-- Each row holds one encrypted record (AES-GCM ciphertext). Supabase never sees diary text.
create table if not exists public.records (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null,             -- sys | notebooks | entries | photos | meta
  id         text not null,
  iv         text not null default '',
  ct         text not null,             -- base64 ciphertext (sys/account holds the wrapped key)
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
alter table public.records enable row level security;
drop policy if exists "own rows only" on public.records;
create policy "own rows only" on public.records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
