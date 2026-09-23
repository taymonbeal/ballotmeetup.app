-- The previous migration numbered the four nonbinding public policy
-- questions ("Nonbinding Question 1" .. "4"). Unlike the binding statewide
-- questions, these don't have one true number — each town's ballot numbers
-- its local/district questions independently, so a question that's #4 here
-- might be #2 or #7 on an actual ballot depending on the voter's town. Drop
-- the numbering from the user-facing name; the description (which already
-- had no numbers) is unchanged.

do $$
declare
  v_meetup_id bigint;
begin
  select id into v_meetup_id from public.meetups where slug = 'ma-2026-general';
  if v_meetup_id is null then
    raise exception 'meetup ma-2026-general not found';
  end if;

  update public.races set name = v.new_name
  from (values
    ('Nonbinding Question 1: Legislative Stipend Reform', 'Nonbinding: Legislative Stipend Reform'),
    ('Nonbinding Question 2: Abolish Norfolk County Government', 'Nonbinding: Abolish Norfolk County Government'),
    ('Nonbinding Question 3: Carbon Fee and Dividend', 'Nonbinding: Carbon Fee and Dividend'),
    ('Nonbinding Question 4: Single-Payer Health Care', 'Nonbinding: Single-Payer Health Care')
  ) as v(old_name, new_name)
  where public.races.meetup_id = v_meetup_id
    and public.races.name = v.old_name;
end
$$;
