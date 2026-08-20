create table public.brand_accounts (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  name text not null,
  handle text not null,
  platform text not null default 'Instagram',
  initials text not null default 'IG',
  accent text not null default '#B8FF6A',
  connection_status text not null default 'Planejamento',
  created_at timestamptz not null default now()
);

create table public.content_items (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id bigint not null references public.brand_accounts(id) on delete cascade,
  title text not null,
  kind text not null default 'Ideia',
  status text not null default 'Ideia',
  platform text not null default 'Instagram',
  pillar text not null default 'Criatividade',
  hook text not null default '',
  body text not null default '',
  scheduled_at timestamptz,
  published_at timestamptz,
  reach bigint not null default 0 check (reach >= 0),
  saves bigint not null default 0 check (saves >= 0),
  comments bigint not null default 0 check (comments >= 0),
  parent_source_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_bases (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id bigint not null references public.brand_accounts(id) on delete cascade,
  title text not null,
  source_text text not null,
  thesis text not null default '',
  angles text not null default '[]',
  proofs text not null default '[]',
  objections text not null default '[]',
  cta text not null default '',
  status text not null default 'Rascunho',
  created_at timestamptz not null default now()
);

alter table public.content_items
  add constraint content_items_parent_source_id_fkey
  foreign key (parent_source_id) references public.source_bases(id) on delete set null;

create table public.library_assets (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id bigint not null references public.brand_accounts(id) on delete cascade,
  title text not null,
  category text not null,
  format text not null default 'Documento',
  status text not null default 'Rascunho',
  description text not null default '',
  url text,
  storage_key text,
  file_name text,
  mime_type text,
  file_size bigint not null default 0 check (file_size >= 0),
  conversions bigint not null default 0 check (conversions >= 0),
  created_at timestamptz not null default now()
);

create table public.instagram_oauth_states (
  state text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  account_id bigint not null references public.brand_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.instagram_connections (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  account_id bigint not null unique references public.brand_accounts(id) on delete cascade,
  instagram_user_id text not null,
  username text not null,
  account_type text not null default 'PROFESSIONAL',
  profile_picture_url text,
  token_ciphertext text not null,
  token_iv text not null,
  token_expires_at timestamptz not null,
  status text not null default 'Conectado',
  followers_count bigint not null default 0 check (followers_count >= 0),
  media_count bigint not null default 0 check (media_count >= 0),
  reach_30d bigint not null default 0 check (reach_30d >= 0),
  views_30d bigint not null default 0 check (views_30d >= 0),
  profile_views_30d bigint not null default 0 check (profile_views_30d >= 0),
  interactions_30d bigint not null default 0 check (interactions_30d >= 0),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.instagram_media (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  connection_id bigint not null references public.instagram_connections(id) on delete cascade,
  instagram_media_id text not null unique,
  caption text not null default '',
  media_type text not null default 'IMAGE',
  permalink text not null default '',
  published_at timestamptz not null,
  reach bigint not null default 0 check (reach >= 0),
  views bigint not null default 0 check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  comments bigint not null default 0 check (comments >= 0),
  saves bigint not null default 0 check (saves >= 0),
  shares bigint not null default 0 check (shares >= 0),
  total_interactions bigint not null default 0 check (total_interactions >= 0),
  synced_at timestamptz not null default now()
);

create table public.automation_funnels (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  account_id bigint not null references public.brand_accounts(id) on delete cascade,
  name text not null,
  template_type text not null default 'lead_magnet',
  status text not null default 'Rascunho',
  trigger_type text not null default 'keywords',
  media_id text,
  media_label text,
  match_type text not null default 'contains',
  keywords text not null default '[]',
  public_reply_enabled boolean not null default true,
  reply_mode text not null default 'random',
  reply_scripts text not null default '[]',
  dm_message text not null default '',
  dm_button_label text not null default 'Acessar material',
  dm_link text,
  asset_id bigint references public.library_assets(id) on delete set null,
  cooldown_hours integer not null default 24 check (cooldown_hours between 0 and 720),
  ignore_own_comments boolean not null default true,
  blocked_words text not null default '[]',
  blocked_users text not null default '[]',
  comments_count bigint not null default 0 check (comments_count >= 0),
  replies_sent bigint not null default 0 check (replies_sent >= 0),
  dms_sent bigint not null default 0 check (dms_sent >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  leads bigint not null default 0 check (leads >= 0),
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  automation_id bigint not null references public.automation_funnels(id) on delete cascade,
  connection_id bigint not null references public.instagram_connections(id) on delete cascade,
  instagram_comment_id text not null unique,
  instagram_media_id text,
  instagram_user_id text,
  username text not null default 'instagram_user',
  comment_text text not null default '',
  matched_keyword text,
  public_reply text,
  dm_message text,
  asset_id bigint references public.library_assets(id) on delete set null,
  destination_url text,
  tracking_token text not null unique,
  meta_reply_id text,
  meta_message_id text,
  status text not null default 'Recebido',
  error text,
  clicked_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index brand_accounts_owner_id_idx on public.brand_accounts(owner_id);
create index content_items_owner_account_created_idx on public.content_items(owner_id, account_id, created_at desc);
create index content_items_parent_source_id_idx on public.content_items(parent_source_id);
create index source_bases_owner_account_created_idx on public.source_bases(owner_id, account_id, created_at desc);
create index library_assets_owner_account_created_idx on public.library_assets(owner_id, account_id, created_at desc);
create index instagram_oauth_states_owner_id_idx on public.instagram_oauth_states(owner_id);
create index instagram_oauth_states_account_id_idx on public.instagram_oauth_states(account_id);
create index instagram_connections_owner_account_idx on public.instagram_connections(owner_id, account_id);
create index instagram_media_owner_connection_published_idx on public.instagram_media(owner_id, connection_id, published_at desc);
create index automation_funnels_owner_account_updated_idx on public.automation_funnels(owner_id, account_id, updated_at desc);
create index automation_funnels_asset_id_idx on public.automation_funnels(asset_id);
create index automation_events_owner_automation_created_idx on public.automation_events(owner_id, automation_id, created_at desc);
create index automation_events_connection_id_idx on public.automation_events(connection_id);
create index automation_events_asset_id_idx on public.automation_events(asset_id);

alter table public.brand_accounts enable row level security;
alter table public.content_items enable row level security;
alter table public.source_bases enable row level security;
alter table public.library_assets enable row level security;
alter table public.instagram_oauth_states enable row level security;
alter table public.instagram_connections enable row level security;
alter table public.instagram_media enable row level security;
alter table public.automation_funnels enable row level security;
alter table public.automation_events enable row level security;

create policy brand_accounts_owner_all on public.brand_accounts for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy content_items_owner_all on public.content_items for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy source_bases_owner_all on public.source_bases for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy library_assets_owner_all on public.library_assets for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy instagram_oauth_states_owner_all on public.instagram_oauth_states for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy instagram_connections_owner_all on public.instagram_connections for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy instagram_media_owner_all on public.instagram_media for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy automation_funnels_owner_all on public.automation_funnels for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy automation_events_owner_all on public.automation_events for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;

insert into storage.buckets (id, name, public, file_size_limit)
values ('layerflow-library', 'layerflow-library', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy layerflow_library_select on storage.objects for select to authenticated
  using (bucket_id = 'layerflow-library' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy layerflow_library_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'layerflow-library' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy layerflow_library_update on storage.objects for update to authenticated
  using (bucket_id = 'layerflow-library' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'layerflow-library' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy layerflow_library_delete on storage.objects for delete to authenticated
  using (bucket_id = 'layerflow-library' and (storage.foldername(name))[1] = (select auth.uid())::text);
