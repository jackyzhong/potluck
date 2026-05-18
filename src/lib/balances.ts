import { Expense, Split } from "@/src/app/ledger/[id]/ExpenseModal";

export type Debt = {
  debtorId: string;
  creditorId: string;
  amountCents: number;
};

// Stub for fetching exchange rates.
// In the future, this can be an external API call or DB query.
// It should return a map of CurrencyCode -> Multiplier (to reach baseCurrency)
export async function getExchangeRates(baseCurrency: string, currenciesUsed: string[]): Promise<Record<string, number>> {
  const rates: Record<string, number> = {};
  for (const c of currenciesUsed) {
    rates[c] = 1.0; // Pegged at 1:1 for now
  }
  return rates;
}

// Calculates unsimplified debts (mutually cancelled).
// amountCents is normalized to the base currency.
export function getUnsimplifiedDebts(
  expenses: Expense[],
  splits: Split[],
  exchangeRates: Record<string, number>
): Debt[] {
  // graph[debtor][creditor] = amount
  const graph: Record<string, Record<string, number>> = {};

  for (const expense of expenses) {
    const expenseSplits = splits.filter(s => s.expense_id === expense.id);
    const rate = exchangeRates[expense.original_currency] || 1.0; // Fallback to 1.0

    for (const split of expenseSplits) {
      if (split.user_id !== expense.payer_id) {
        const amountInBase = Math.round(split.amount_cents * rate);
        
        if (!graph[split.user_id]) graph[split.user_id] = {};
        graph[split.user_id][expense.payer_id] = (graph[split.user_id][expense.payer_id] || 0) + amountInBase;
      }
    }
  }

  // Cancel mutual debts
  const debts: Debt[] = [];
  const processed = new Set<string>();

  for (const debtor in graph) {
    for (const creditor in graph[debtor]) {
      const dToC = graph[debtor][creditor] || 0;
      const cToD = graph[creditor]?.[debtor] || 0;

      const key1 = `${debtor}->${creditor}`;
      const key2 = `${creditor}->${debtor}`;
      
      if (processed.has(key1) || processed.has(key2)) continue;

      if (dToC > cToD) {
        debts.push({ debtorId: debtor, creditorId: creditor, amountCents: dToC - cToD });
      } else if (cToD > dToC) {
        debts.push({ debtorId: creditor, creditorId: debtor, amountCents: cToD - dToC });
      }

      processed.add(key1);
      processed.add(key2);
    }
  }

  return debts;
}

export function getSimplifiedDebts(
  expenses: Expense[],
  splits: Split[],
  exchangeRates: Record<string, number>
): Debt[] {
  // Net balances: positive means they are owed money, negative means they owe money
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    const expenseSplits = splits.filter(s => s.expense_id === expense.id);
    const rate = exchangeRates[expense.original_currency] || 1.0;

    // Payer is owed the total amount
    const totalAmountBase = Math.round(expense.amount_cents * rate);
    balances[expense.payer_id] = (balances[expense.payer_id] || 0) + totalAmountBase;

    for (const split of expenseSplits) {
      const splitAmountBase = Math.round(split.amount_cents * rate);
      balances[split.user_id] = (balances[split.user_id] || 0) - splitAmountBase;
    }
  }

  const debtors = Object.entries(balances)
    .filter(([_, bal]) => bal < 0)
    .map(([id, bal]) => ({ id, bal: -bal }))
    .sort((a, b) => b.bal - a.bal); // largest debtor first

  const creditors = Object.entries(balances)
    .filter(([_, bal]) => bal > 0)
    .map(([id, bal]) => ({ id, bal }))
    .sort((a, b) => b.bal - a.bal); // largest creditor first

  const debts: Debt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amount = Math.min(debtor.bal, creditor.bal);
    
    if (amount > 0) {
      debts.push({
        debtorId: debtor.id,
        creditorId: creditor.id,
        amountCents: amount
      });
    }

    debtor.bal -= amount;
    creditor.bal -= amount;

    // Account for JS floating point or small 1 cent remainder dust
    if (debtor.bal < 1) dIdx++;
    if (creditor.bal < 1) cIdx++;
  }

  return debts;
}
