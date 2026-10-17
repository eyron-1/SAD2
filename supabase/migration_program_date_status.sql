-- Keep barangay and SK program statuses in sync with their date ranges.
-- Requires the Supabase pg_cron extension.

create extension if not exists pg_cron;

create or replace function public.sync_program_date_statuses()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  update public.programs
  set status = case
    when end_date <= today then 'completed'
    when status = 'planned' and start_date <= today then 'ongoing'
    else status
  end
  where status in ('planned', 'ongoing')
    and (end_date <= today or (status = 'planned' and start_date <= today))
    and status is distinct from case
      when end_date <= today then 'completed'
      when status = 'planned' and start_date <= today then 'ongoing'
      else status
    end;

  update public.sk_programs
  set status = case
    when end_date <= today then 'completed'
    when status = 'planned' and start_date <= today then 'ongoing'
    else status
  end
  where status in ('planned', 'ongoing')
    and (end_date <= today or (status = 'planned' and start_date <= today))
    and status is distinct from case
      when end_date <= today then 'completed'
      when status = 'planned' and start_date <= today then 'ongoing'
      else status
    end;
end;
$$;

revoke all on function public.sync_program_date_statuses() from public, anon, authenticated;

do $$
begin
  perform public.sync_program_date_statuses();
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
    from cron.job
   where jobname = 'sync-program-date-statuses'
   limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'sync-program-date-statuses',
    '*/5 * * * *',
    'select public.sync_program_date_statuses();'
  );
end;
$$;
