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
grant select, insert, update, delete on public.records to authenticated;
drop policy if exists "own rows only" on public.records;
create policy "own rows only" on public.records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inbox for the daily Moodle check (GitHub Action writes with the service key;
-- the signed-in owner can only read / update / delete her own rows).
create table if not exists public.inbox (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.inbox enable row level security;
drop policy if exists "own inbox" on public.inbox;
create policy "own inbox" on public.inbox for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, update, delete on public.inbox to authenticated;

-- Live updates between devices
alter table public.records replica identity full;
-- run once: alter publication supabase_realtime add table public.records, public.inbox;
