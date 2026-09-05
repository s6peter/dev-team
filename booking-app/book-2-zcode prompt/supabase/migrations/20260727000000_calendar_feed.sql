-- Secret per-stylist token for a subscribable (read-only) calendar feed that
-- Google/Apple/Outlook Calendar can subscribe to. Full 2-way sync needs OAuth.
alter table stylists add column if not exists calendar_feed_token uuid not null default uuid_generate_v4();
create unique index if not exists idx_stylists_feed_token on stylists(calendar_feed_token);
