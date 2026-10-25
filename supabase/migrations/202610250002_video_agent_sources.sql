insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video-agent-sources',
  'video-agent-sources',
  false,
  26214400,
  array['video/mp4']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
