import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type CashAccountKey =
  | 'conta_ton'
  | 'conta_stone'
  | 'conta_cora'
  | 'conta_pagbank'
  | 'cheque'
  | 'dinheiro';

export const CASH_ACCOUNTS: Array<{ key: CashAccountKey; label: string }> = [
  { key: 'conta_ton', label: 'Conta Ton' },
  { key: 'conta_stone', label: 'Conta Stone' },
  { key: 'conta_cora', label: 'Conta Cora' },
  { key: 'conta_pagbank', label: 'Conta PagBank' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'dinheiro', label: 'Dinheiro' },
];

function parseBalanceInput(value: string): string {
  const raw = String(value ?? '')
    .replace(/R\$\s?/gi, '')
    .trim();
  if (!raw) return '0.00';

  let normalized = raw;
  if (raw.includes(',')) {
    // pt-BR: 1.234,56
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else {
    // aceitar também 1234.56
    normalized = raw.replace(/,/g, '');
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

export function useCashBalances(userId: string | undefined) {
  return useQuery({
    queryKey: ['cash-balances'],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('cash_balances')
        .select('account,balance');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCashBalances(userId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: Array<{ account: CashAccountKey; balance: string }>) => {
      if (!userId) throw new Error('Usuário não autenticado');
      const payload = values.map((v) => ({
        user_id: userId,
        account: v.account,
        balance: parseBalanceInput(v.balance),
      }));

      const { error } = await supabase
        .from('cash_balances')
        .upsert(payload, { onConflict: 'account' });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cash-balances'] });
    },
  });
}
