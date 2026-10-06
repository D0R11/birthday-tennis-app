-- When the guest's current calendar invite was last emailed successfully.
-- Null means they still need one (e.g. RSVP'd while SES was in the sandbox).
alter table rsvps add column invite_sent_at timestamptz;

-- The same fact as a yes/no column for the Table Editor. Postgres keeps it in sync; never write to it.
alter table rsvps add column invite_sent boolean generated always as (invite_sent_at is not null) stored;
