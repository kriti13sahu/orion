-- Run after 002. Safe to re-run. Existing applications are retained when a role closes.
-- Each application takes a SHARE lock on the parent row so concurrent close/apply
-- requests have a defined order: an application that acquires the lock first
-- finishes before closure; one that runs after closure is rejected. SHARE locks
-- don't conflict with each other, so concurrent applications don't block one another.
create or replace function public.require_open_opportunity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  opp_active boolean;
begin
  select is_active into opp_active
    from public.opportunities
    where id = new.opportunity_id
    for share;

  if not found then
    raise exception 'Opportunity not found'
      using errcode = 'OR404';
  end if;

  if not opp_active then
    raise exception 'Opportunity is closed'
      using errcode = 'OR410';
  end if;

  return new;
end;
$$;

revoke all on function public.require_open_opportunity() from public;

drop trigger if exists applications_require_open_opportunity
  on public.opportunity_applications;

create trigger applications_require_open_opportunity
  before insert on public.opportunity_applications
  for each row execute function public.require_open_opportunity();
