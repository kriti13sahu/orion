-- Run after 002. Existing applications are retained when a role closes.
-- Lock the parent row so concurrent close/apply requests have a defined order:
-- an application that acquires the lock first finishes before closure;
-- one that acquires it after closure is rejected.
create or replace function public.require_open_opportunity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.opportunities
    where id = new.opportunity_id and is_active = true
    for update;
  if not found then
    raise exception 'Opportunity is closed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.require_open_opportunity() from public;

create trigger applications_require_open_opportunity
  before insert on public.opportunity_applications
  for each row execute function public.require_open_opportunity();
