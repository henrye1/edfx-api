-- Portfolios and their company memberships. A membership stores a snapshot of
-- the company's loaded credit data so the portfolio survives refresh/restart.
create table if not exists portfolios (
    portfolio_id text primary key,
    name         text not null,
    created_by   text,
    created_at   timestamptz not null default now()
);

create table if not exists portfolio_companies (
    portfolio_id    text not null,
    entity_id       text not null,
    name            text,
    industry        text,
    pd              double precision,
    implied_rating  text,
    ews             text,
    ews_change      text,
    peer_percentile double precision,
    added_at        timestamptz not null default now(),
    primary key (portfolio_id, entity_id)
);
create index if not exists ix_portfolio_companies on portfolio_companies(portfolio_id, added_at desc);
