alter table public.prizes
add column if not exists sort_order bigint;

update public.prizes
set sort_order = id
where sort_order is null;

alter table public.prizes
alter column sort_order set default 0,
alter column sort_order set not null;

create index if not exists prizes_display_order_idx
on public.prizes (is_won asc, sort_order asc, id asc);
