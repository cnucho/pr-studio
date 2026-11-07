-- Phase 1B uses Model A: authenticated server routes with server-only secret-key access.
-- Ordinary anon/authenticated PostgREST access remains denied; no permissive RLS policies are added.

alter table public.video_projects alter column owner_id set not null;
alter table public.video_projects add constraint video_projects_status_check
  check (status in ('draft','active','archived')) not valid;
alter table public.video_projects validate constraint video_projects_status_check;

alter table public.video_render_jobs drop constraint if exists video_render_jobs_status_check;
alter table public.video_render_jobs add constraint video_render_jobs_status_check check (
  status in ('queued','preparing','rendering','validating','awaiting_approval','approved','rejected','failed','cancelled')
);
alter table public.video_render_jobs add constraint video_render_jobs_progress_check check (progress between 0 and 100);
alter table public.video_render_jobs add constraint video_render_jobs_cost_check check (
  (estimated_cost is null or estimated_cost >= 0) and (actual_cost is null or actual_cost >= 0)
);
alter table public.video_render_attempts add constraint video_render_attempts_attempt_check check (attempt > 0);
alter table public.video_narration_jobs add constraint video_narration_jobs_cost_check check (cost is null or cost >= 0);

create or replace function public.reject_video_revision_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'video project revisions are immutable' using errcode = '55000';
end;
$$;

drop trigger if exists video_project_revisions_immutable_update on public.video_project_revisions;
create trigger video_project_revisions_immutable_update before update on public.video_project_revisions
for each row execute function public.reject_video_revision_mutation();
drop trigger if exists video_project_revisions_immutable_delete on public.video_project_revisions;
create trigger video_project_revisions_immutable_delete before delete on public.video_project_revisions
for each row execute function public.reject_video_revision_mutation();

create or replace function public.reject_video_approval_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'video approval history is append-only' using errcode = '55000';
end;
$$;

drop trigger if exists video_approval_history_append_only_update on public.video_approval_history;
create trigger video_approval_history_append_only_update before update on public.video_approval_history
for each row execute function public.reject_video_approval_mutation();
drop trigger if exists video_approval_history_append_only_delete on public.video_approval_history;
create trigger video_approval_history_append_only_delete before delete on public.video_approval_history
for each row execute function public.reject_video_approval_mutation();

create unique index if not exists video_approval_history_one_decision_idx
  on public.video_approval_history(render_id);
create index if not exists video_projects_owner_idx on public.video_projects(owner_id, created_at);
create index if not exists video_render_attempts_render_idx on public.video_render_attempts(render_id, attempt);
create index if not exists video_validation_results_render_idx on public.video_validation_results(render_id, created_at);

revoke all on public.video_projects, public.video_project_revisions, public.video_assets,
  public.video_narration_jobs, public.video_render_jobs, public.video_render_attempts,
  public.video_provider_usage, public.video_webhook_events, public.video_validation_results,
  public.video_approval_history, public.video_publishing_records from anon, authenticated;

update storage.buckets set public = false where id = 'video-agent-results';
