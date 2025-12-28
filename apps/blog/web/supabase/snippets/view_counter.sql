-- Create a table to track post views
create table if not exists public.post_views (
  slug text not null primary key,
  view_count bigint default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.post_views enable row level security;

-- Create policies (modify as needed)
-- Allow anyone to read view counts
create policy "Allow public read access" on public.post_views
for select using (true);

-- Allow anyone to insert/update via the rpc function (handled by function security usually, but for table access:)
-- We won't allow direct update/insert from public client to avoid manipulation.
-- The RPC function will be SECURITY DEFINER to bypass RLS for incrementing.

-- Create a function to increment view count securely
create or replace function public.increment_view_count(slug_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.post_views (slug, view_count, updated_at)
  values (slug_input, 1, now())
  on conflict (slug)
  do update set
    view_count = post_views.view_count + 1,
    updated_at = now();
end;
$$;

-- Secure the function permissions
revoke execute on function public.increment_view_count(text) from public;
grant execute on function public.increment_view_count(text) to anon, authenticated, service_role;
