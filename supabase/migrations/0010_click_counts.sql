-- Store audit #16 (docs/review/08_STORE_AUDIT.md): the admin's affiliate-click stats fetched every click row, but
-- PostgREST returns at most max_rows (1000) per request, so counts stopped at 1000. Count in SQL instead.
create or replace function affiliate_click_counts()
returns table (item_id text, clicks bigint)
language sql stable as $$
  select provider_id, count(*)
  from email_events
  where type = 'affiliate_click' and provider_id is not null
  group by provider_id
$$;
