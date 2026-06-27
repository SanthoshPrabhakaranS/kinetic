-- Supabase schema for normalized workout data storage.
-- Run this in your Supabase SQL editor or a migration tool.

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  onboarding_complete boolean not null default false,
  selected_routine_type text,
  weight_unit text not null default 'kg',
  inserted_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

drop trigger if exists set_user_profiles_updated_at on user_profiles;
create trigger set_user_profiles_updated_at
before update on user_profiles
for each row execute function set_updated_at();

create table if not exists exercises (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  equipment text not null,
  measurement_unit text not null,
  instructions text,
  is_custom boolean not null default true,
  inserted_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

drop trigger if exists set_exercises_updated_at on exercises;

create trigger set_exercises_updated_at
before update on exercises
for each row execute function set_updated_at();

create index if not exists idx_exercises_user_id on exercises(user_id);
create index if not exists idx_workout_logs_user_id on workout_logs(user_id);
create index if not exists idx_workout_entries_user_id on workout_entries(user_id);
create index if not exists idx_routines_user_id on routines(user_id);
create index if not exists idx_weight_entries_user_id on weight_entries(user_id);

create table if not exists workout_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  inserted_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

drop trigger if exists set_workout_logs_updated_at on workout_logs;
create trigger set_workout_logs_updated_at
before update on workout_logs
for each row execute function set_updated_at();

create table if not exists workout_entries (
  id text primary key,
  workout_log_id text not null references workout_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text,
  exercise_name text not null,
  muscle_group text not null,
  equipment text not null,
  timestamp timestamp with time zone not null,
  inserted_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

drop trigger if exists set_workout_entries_updated_at on workout_entries;
create trigger set_workout_entries_updated_at
before update on workout_entries
for each row execute function set_updated_at();

create table if not exists workout_sets (
  id text primary key,
  workout_entry_id text not null references workout_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  set_number integer not null,
  weight numeric,
  reps integer,
  duration integer,
  inserted_at timestamp with time zone default now() not null
);

create table if not exists routines (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  inserted_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

drop trigger if exists set_routines_updated_at on routines;
create trigger set_routines_updated_at
before update on routines
for each row execute function set_updated_at();

create table if not exists routine_exercises (
  id text primary key,
  routine_id text not null references routines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text,
  exercise_name text not null,
  muscle_group text not null,
  target_sets integer not null,
  inserted_at timestamp with time zone default now() not null
);

create table if not exists weight_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric not null,
  timestamp timestamp with time zone not null,
  date date not null,
  inserted_at timestamp with time zone default now() not null
);

alter table user_profiles enable row level security;
alter table exercises enable row level security;
alter table workout_logs enable row level security;
alter table workout_entries enable row level security;
alter table workout_sets enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table weight_entries enable row level security;

drop policy if exists "Users can manage their own profile" on user_profiles;
drop policy if exists "Users can manage their own exercises" on exercises;
drop policy if exists "Users can manage their own logs" on workout_logs;
drop policy if exists "Users can manage their own workout entries" on workout_entries;
drop policy if exists "Users can manage their own workout sets" on workout_sets;
drop policy if exists "Users can manage their own routines" on routines;
drop policy if exists "Users can manage their own routine exercises" on routine_exercises;
drop policy if exists "Users can manage their own weight entries" on weight_entries;

create policy "Users can manage their own profile"
  on user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own exercises"
  on exercises
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own logs"
  on workout_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own workout entries"
  on workout_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own workout sets"
  on workout_sets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own routines"
  on routines
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own routine exercises"
  on routine_exercises
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own weight entries"
  on weight_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
