create extension if not exists pgcrypto;

create table if not exists public.video_agent_jobs (
  id uuid primary key default gen_random_uuid(),
  brief text not null,
  app_url text not null,
  plan jsonb not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  output jsonb,
  error text,
  attempts integer not null default 0,
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_agent_jobs_claim_idx
  on public.video_agent_jobs (status, available_at, created_at)
  where status in ('queued', 'running');

alter table public.video_agent_jobs enable row level security;
revoke all on public.video_agent_jobs from anon, authenticated;

create or replace function public.claim_video_agent_job(worker_id text)
returns setof public.video_agent_jobs
language plpgsql security definer set search_path = public
as $$
declare claimed_id uuid;
begin
  select id into claimed_id
  from public.video_agent_jobs
  where attempts < max_attempts
    and available_at <= now()
    and (status = 'queued' or (status = 'running' and locked_at < now() - interval '20 minutes'))
  order by created_at
  for update skip locked
  limit 1;

  if claimed_id is null then return; end if;

  return query
  update public.video_agent_jobs
  set status = 'running', attempts = attempts + 1, locked_at = now(), locked_by = worker_id,
      started_at = coalesce(started_at, now()), updated_at = now(), error = null
  where id = claimed_id
  returning *;
end;
$$;

revoke all on function public.claim_video_agent_job(text) from public, anon, authenticated;
grant execute on function public.claim_video_agent_job(text) to service_role;

insert into storage.buckets (id, name, public)
values ('video-agent-results', 'video-agent-results', false)
on conflict (id) do update set public = false;
