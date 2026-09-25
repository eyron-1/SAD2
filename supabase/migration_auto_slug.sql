-- Keep public barangay URLs derived from the barangay name and municipality.
create extension if not exists unaccent;

create or replace function generate_barangay_slug()
returns trigger
language plpgsql
as $$
begin
  new.slug := trim(both '-' from regexp_replace(
    lower(unaccent(coalesce(new.name, '') || ' ' || coalesce(new.municipality, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
  return new;
end;
$$;

drop trigger if exists barangays_generate_slug on barangays;
create trigger barangays_generate_slug
before insert or update of name, municipality on barangays
for each row execute function generate_barangay_slug();

-- Regenerate slugs for existing records.
update barangays
set name = name;