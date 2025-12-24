-- Contas a pagar (admin-only)

create table if not exists public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  vendor text not null,
  description text null,
  amount numeric(12, 2) not null,
  due_date date not null,

  status text not null default 'open' check (status in ('open','paid','canceled')),
  paid_at timestamptz null,

  payment_method text null,
  notes text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists accounts_payable_due_date_idx on public.accounts_payable (due_date);
create index if not exists accounts_payable_status_idx on public.accounts_payable (status);

alter table public.accounts_payable enable row level security;

-- Admin-only access
create policy "accounts_payable_select_admin" on public.accounts_payable
for select
using (public.is_admin());

create policy "accounts_payable_insert_admin" on public.accounts_payable
for insert
with check (public.is_admin());

create policy "accounts_payable_update_admin" on public.accounts_payable
for update
using (public.is_admin())
with check (public.is_admin());

create policy "accounts_payable_delete_admin" on public.accounts_payable
for delete
using (public.is_admin());

-- Auto-set paid_at
create or replace function public.set_paid_at_accounts_payable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and (old.status is distinct from 'paid') then
    new.paid_at := coalesce(new.paid_at, now());
  end if;

  if new.status <> 'paid' then
    new.paid_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_paid_at_accounts_payable on public.accounts_payable;
create trigger trg_set_paid_at_accounts_payable
before update on public.accounts_payable
for each row
execute function public.set_paid_at_accounts_payable();
