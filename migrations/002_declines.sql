-- "Can't make it": guests are either in (holding a numbered spot) or declined (no spot, not counted).
alter table rsvps add column status text not null default 'in' check (status in ('in', 'declined'));

-- Declined guests give their spot back. Postgres allows many NULLs under the existing unique constraint.
alter table rsvps alter column position drop not null;
alter table rsvps add constraint rsvps_spot_matches_status check ((status = 'in') = (position is not null));

-- A friend who was never coming can decline without answering the RSVP questions.
alter table rsvps alter column role drop not null;
alter table rsvps add constraint rsvps_in_needs_role check (status <> 'in' or role is not null);

-- Each emailed invite or cancellation needs a higher SEQUENCE than the last, or calendars ignore it.
alter table rsvps add column invite_seq integer not null default 0;
