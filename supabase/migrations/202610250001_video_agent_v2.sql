alter table public.video_agent_jobs
  add column if not exists request jsonb not null default '{}'::jsonb,
  add column if not exists phase text not null default 'queued',
  add column if not exists outcome text,
  add column if not exists planning_round integer not null default 0,
  add column if not exists final_decision text,
  add column if not exists manifest jsonb,
  add column if not exists artifact_prefix text;

alter table public.video_agent_jobs
  alter column plan drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'video_agent_jobs_phase_check'
  ) then
    alter table public.video_agent_jobs
      add constraint video_agent_jobs_phase_check
      check (phase in ('queued', 'planning', 'collecting', 'producing', 'reviewing', 'completed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'video_agent_jobs_outcome_check'
  ) then
    alter table public.video_agent_jobs
      add constraint video_agent_jobs_outcome_check
      check (outcome is null or outcome in ('produced', 'plan_exhausted'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'video_agent_jobs_planning_round_check'
  ) then
    alter table public.video_agent_jobs
      add constraint video_agent_jobs_planning_round_check
      check (planning_round between 0 and 3);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'video_agent_jobs_final_decision_check'
  ) then
    alter table public.video_agent_jobs
      add constraint video_agent_jobs_final_decision_check
      check (final_decision is null or final_decision in ('collect', 'produce'));
  end if;
end $$;

update public.video_agent_jobs
set request = jsonb_build_object(
  'purpose', brief,
  'ownerId', coalesce(plan->>'ownerId', '')
)
where request = '{}'::jsonb;

create table if not exists public.video_agent_planning_rounds (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.video_agent_jobs(id) on delete cascade,
  round integer not null check (round between 1 and 3),
  plan jsonb not null,
  collection_reports jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, round)
);

create index if not exists video_agent_planning_rounds_job_idx
  on public.video_agent_planning_rounds (job_id, round);

alter table public.video_agent_planning_rounds enable row level security;
revoke all on public.video_agent_planning_rounds from anon, authenticated;
