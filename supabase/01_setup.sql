-- PLATAFORMA 5I'S — ESTRUTURA INICIAL SEGURA
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.

create extension if not exists pgcrypto;

create table if not exists public.workspace_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_snapshots enable row level security;

revoke all on public.workspace_snapshots from anon;
grant select, insert, update, delete on public.workspace_snapshots to authenticated;

create policy "Usuário lê apenas o próprio workspace"
on public.workspace_snapshots for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Usuário cria apenas o próprio workspace"
on public.workspace_snapshots for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Usuário atualiza apenas o próprio workspace"
on public.workspace_snapshots for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Usuário exclui apenas o próprio workspace"
on public.workspace_snapshots for delete
to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspace_snapshots_set_updated_at on public.workspace_snapshots;
create trigger workspace_snapshots_set_updated_at
before update on public.workspace_snapshots
for each row execute function public.set_updated_at();


-- CONTROLE DE COTAS DE IA POR USUÁRIO E DIA
create table if not exists public.ai_daily_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, usage_date)
);

alter table public.ai_daily_usage enable row level security;
revoke all on public.ai_daily_usage from anon, authenticated;

create or replace function public.consume_ai_quota(p_daily_limit integer default 20)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then raise exception 'Sessão inválida'; end if;
  if p_daily_limit < 1 or p_daily_limit > 100 then raise exception 'Limite inválido'; end if;

  insert into public.ai_daily_usage(owner_id, usage_date, request_count, updated_at)
  values (v_user, current_date, 1, now())
  on conflict (owner_id, usage_date)
  do update set request_count = public.ai_daily_usage.request_count + 1, updated_at = now()
  returning request_count into v_count;

  if v_count > p_daily_limit then
    update public.ai_daily_usage set request_count = p_daily_limit where owner_id=v_user and usage_date=current_date;
    raise exception 'Limite diário atingido' using errcode='P0001';
  end if;
  return v_count;
end;
$$;

revoke all on function public.consume_ai_quota(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;
