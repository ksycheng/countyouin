-- ============================================================
--  COUNT YOU IN — database tables (Room 1)
--  HOW TO USE:
--  1. In Supabase, click "SQL Editor" in the left menu
--  2. Click "New query"
--  3. Paste this WHOLE file in
--  4. Click "Run"
--  You should see "Success. No rows returned" — that's good!
-- ============================================================

-- 1. HOUSEHOLDS — one per account holder (a person or a family)
create table households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),   -- which logged-in user owns this
  name text not null,                        -- e.g. "Kenneth's family"
  is_family boolean default false,
  created_at timestamptz default now()
);

-- 2. MEMBERS — the people inside a household
create table members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null,
  age int,                                   -- optional, can be empty
  allergies text[] default '{}',             -- a list, e.g. {peanuts, dairy}
  diets text[] default '{}'                  -- a list, e.g. {vegetarian}
);

-- 3. EVENTS — each potluck/party
create table events (
  id uuid primary key default gen_random_uuid(),
  host_household_id uuid references households(id) on delete cascade,
  title text not null,
  location text,
  event_date date,
  rsvp_deadline date,
  payment_mode text default 'split',         -- 'split' or 'host'
  created_at timestamptz default now()
);

-- 4. EVENT_GUESTS — who is invited to each event
create table event_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  household_id uuid references households(id),  -- empty if they haven't joined yet
  invited_name text,                            -- for people not on the app yet
  invited_contact text,                         -- their email or phone
  pending boolean default true                  -- true = invited, not signed up yet
);

-- 5. RSVPS — which family members are actually coming
create table rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  attending boolean default true
);

-- 6. DISHES — who is bringing what, and the cost
create table dishes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  household_id uuid references households(id),  -- who is bringing it
  name text not null,
  price numeric,                                -- empty until they buy it
  allergens text[] default '{}'
);

-- 7. FRIENDSHIPS — people you met and want to invite again
create table friendships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  friend_household_id uuid references households(id) on delete cascade
);

-- Done! Seven drawers, ready to hold real data.
-- (Security rules come in Room 4 — don't put real personal info in yet.)
