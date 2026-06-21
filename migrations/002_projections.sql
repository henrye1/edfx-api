create table if not exists pd_values (
    extraction_id uuid references extractions(id), entity_id text, version int,
    as_of date, pd double precision, implied_rating text, term text );
create table if not exists financial_ratios (
    extraction_id uuid references extractions(id), entity_id text, version int,
    ratio_name text, value double precision, period text );
create table if not exists peer_metrics (
    extraction_id uuid references extractions(id), entity_id text, version int,
    metric text, entity_value double precision, percentile double precision );
create table if not exists early_warning (
    extraction_id uuid references extractions(id), entity_id text, version int,
    risk_category text, trigger text, severity text );
create table if not exists credit_limits (
    extraction_id uuid references extractions(id), entity_id text, version int,
    limit_amount double precision, currency text, horizon text );
