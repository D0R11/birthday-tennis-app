-- Guest list. Emails are stored lower-cased, so the unique index also catches different casing.
create table rsvps (
  id          bigint generated always as identity primary key,
  email       text        not null unique check (email = lower(email)),
  name        text        not null check (char_length(name) between 1 and 40),
  role        text        not null check (role in ('playing', 'cheering')),
  has_car     boolean     not null default false,
  position    smallint    not null unique check (position between 1 and 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Supabase exposes the public schema through its Data API. Row Level Security with no policies
-- shuts that door for the anon key; the server's postgres role bypasses RLS and works normally.
alter table rsvps enable row level security;
