begin;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'sk_fund_sources_received_date_required'
       and conrelid = 'public.sk_fund_sources'::regclass
  ) then
    alter table public.sk_fund_sources
      add constraint sk_fund_sources_received_date_required
      check (received_date is not null) not valid;
  end if;
end;
$$;

commit;
