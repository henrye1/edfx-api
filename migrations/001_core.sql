create table if not exists entities (
    entity_id     text primary key,
    pid           text,
    orbis_id      text,
    name          text,
    country       text,
    city          text,
    industry_ndy  text,
    identifiers   jsonb default '{}'::jsonb,
    peer_group_ids jsonb default '[]'::jsonb,
    first_seen_at timestamptz not null default now(),
    last_seen_at  timestamptz not null default now()
);

create table if not exists extractions (
    id             uuid primary key default gen_random_uuid(),
    entity_id      text references entities(entity_id),
    section        text not null,
    version        int  not null,
    requested_at   timestamptz not null default now(),
    request_params jsonb,
    http_status    int,
    status         text not null,
    raw_json       jsonb,
    raw_text       text,
    error_detail   text,
    unique (entity_id, section, version)
);
create index if not exists ix_extractions_entity_section on extractions(entity_id, section, version desc);
