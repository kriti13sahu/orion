-- Accept only the UVA and Darden email domains, case-insensitively.
begin;

alter table public.profiles drop constraint profiles_email_check;
alter table public.profiles add constraint profiles_email_check
  check (email ~* '^[^@[:space:]]+@(darden[.])?virginia[.]edu$');

commit;
