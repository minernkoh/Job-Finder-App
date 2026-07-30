-- Comparison summaries are cached per (user, sorted listing-ids key); make that an
-- upsert target so saveComparisonSummaryToDb can use ON CONFLICT.
drop index if exists public.comparison_summaries_user_key_idx;
alter table public.comparison_summaries
  add constraint comparison_summaries_user_key_unique unique (user_id, listing_ids_key);
