import type { Expense, Split } from "@/src/app/ledger/[id]/ExpenseModal";

export type Debt = {
  debtorId: string;
  creditorId: string;
  amountCents: number;
};

// A settlement: money actually handed from one member to another, as opposed
// to a cost being shared out.
export type Payment = {
  id: string;
  ledger_id: string;
  payer_id: string;
  payee_id: string;
  amount_cents: number;
  original_currency: string;
  note: string | null;
  created_at: string;
};

export type BreakdownRow = {
  expenseId: string;
  description: string | null;
  createdAt: string;
  amountCents: number;
};

export type PaymentRow = {
  id: string;
  counterpartyId: string;
  note: string | null;
  createdAt: string;
  amountCents: number;
};

// One member's side of the books: what they fronted, what they owe, and the
// difference — which is the figure the Balances list shows for them.
export type MemberBreakdown = {
  paid: BreakdownRow[];
  owed: BreakdownRow[];
  paymentsMade: PaymentRow[];
  paymentsReceived: PaymentRow[];
  paidTotalCents: number;
  owedTotalCents: number;
  paymentsMadeTotalCents: number;
  paymentsReceivedTotalCents: number;
  netCents: number;
};

function indexSplitsByExpense(splits: Split[]): Map<string, Split[]> {
  const byExpense = new Map<string, Split[]>();
  for (const split of splits) {
    const bucket = byExpense.get(split.expense_id);
    if (bucket) bucket.push(split);
    else byExpense.set(split.expense_id, [split]);
  }
  return byExpense;
}

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
  payments: Payment[],
  exchangeRates: Record<string, number>
): Debt[] {
  // graph[debtor][creditor] = amount
  const graph: Record<string, Record<string, number>> = {};
  const splitsByExpense = indexSplitsByExpense(splits);

  for (const expense of expenses) {
    const expenseSplits = splitsByExpense.get(expense.id) ?? [];
    const rate = exchangeRates[expense.original_currency] || 1.0; // Fallback to 1.0

    for (const split of expenseSplits) {
      if (split.user_id !== expense.payer_id) {
        const amountInBase = Math.round(split.amount_cents * rate);
        
        if (!graph[split.user_id]) graph[split.user_id] = {};
        graph[split.user_id][expense.payer_id] = (graph[split.user_id][expense.payer_id] || 0) + amountInBase;
      }
    }
  }

  // A settlement is the same edge pointing the other way: paying down a debt
  // and being owed that much are indistinguishable once the two are cancelled.
  for (const payment of payments) {
    const rate = exchangeRates[payment.original_currency] || 1.0;
    const amountInBase = Math.round(payment.amount_cents * rate);

    if (!graph[payment.payee_id]) graph[payment.payee_id] = {};
    graph[payment.payee_id][payment.payer_id] =
      (graph[payment.payee_id][payment.payer_id] || 0) + amountInBase;
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

// Each person's overall position, normalized to the base currency.
// Positive means the group owes them; negative means they owe the group.
export function getNetBalances(
  expenses: Expense[],
  splits: Split[],
  payments: Payment[],
  exchangeRates: Record<string, number>
): Record<string, number> {
  const balances: Record<string, number> = {};
  const splitsByExpense = indexSplitsByExpense(splits);

  for (const expense of expenses) {
    const expenseSplits = splitsByExpense.get(expense.id) ?? [];
    const rate = exchangeRates[expense.original_currency] || 1.0;

    // Payer is owed the total amount
    const totalAmountBase = Math.round(expense.amount_cents * rate);
    balances[expense.payer_id] = (balances[expense.payer_id] || 0) + totalAmountBase;

    for (const split of expenseSplits) {
      const splitAmountBase = Math.round(split.amount_cents * rate);
      balances[split.user_id] = (balances[split.user_id] || 0) - splitAmountBase;
    }
  }

  // Handing money over pays down what you owe; receiving it settles what you
  // were owed.
  for (const payment of payments) {
    const rate = exchangeRates[payment.original_currency] || 1.0;
    const amountInBase = Math.round(payment.amount_cents * rate);

    balances[payment.payer_id] = (balances[payment.payer_id] || 0) + amountInBase;
    balances[payment.payee_id] = (balances[payment.payee_id] || 0) - amountInBase;
  }

  return balances;
}

// The expense-by-expense story behind one member's net balance, newest first.
// Amounts are rounded exactly the way getNetBalances rounds them, so the total
// here always reconciles with the figure shown against that member's name.
export function getMemberBreakdown(
  userId: string,
  expenses: Expense[],
  splits: Split[],
  payments: Payment[],
  exchangeRates: Record<string, number>
): MemberBreakdown {
  const splitsByExpense = indexSplitsByExpense(splits);

  const paid: BreakdownRow[] = [];
  const owed: BreakdownRow[] = [];
  let paidTotalCents = 0;
  let owedTotalCents = 0;

  for (const expense of expenses) {
    const rate = exchangeRates[expense.original_currency] || 1.0;
    const row = {
      expenseId: expense.id,
      description: expense.description,
      createdAt: expense.created_at
    };

    if (expense.payer_id === userId) {
      const amountCents = Math.round(expense.amount_cents * rate);
      paid.push({ ...row, amountCents });
      paidTotalCents += amountCents;
    }

    let shareCents = 0;
    for (const split of splitsByExpense.get(expense.id) ?? []) {
      if (split.user_id === userId) shareCents += Math.round(split.amount_cents * rate);
    }
    if (shareCents !== 0) {
      owed.push({ ...row, amountCents: shareCents });
      owedTotalCents += shareCents;
    }
  }

  const paymentsMade: PaymentRow[] = [];
  const paymentsReceived: PaymentRow[] = [];
  let paymentsMadeTotalCents = 0;
  let paymentsReceivedTotalCents = 0;

  for (const payment of payments) {
    if (payment.payer_id !== userId && payment.payee_id !== userId) continue;

    const rate = exchangeRates[payment.original_currency] || 1.0;
    const amountCents = Math.round(payment.amount_cents * rate);
    const isPayer = payment.payer_id === userId;

    const row: PaymentRow = {
      id: payment.id,
      counterpartyId: isPayer ? payment.payee_id : payment.payer_id,
      note: payment.note,
      createdAt: payment.created_at,
      amountCents
    };

    if (isPayer) {
      paymentsMade.push(row);
      paymentsMadeTotalCents += amountCents;
    } else {
      paymentsReceived.push(row);
      paymentsReceivedTotalCents += amountCents;
    }
  }

  return {
    paid,
    owed,
    paymentsMade,
    paymentsReceived,
    paidTotalCents,
    owedTotalCents,
    paymentsMadeTotalCents,
    paymentsReceivedTotalCents,
    netCents:
      paidTotalCents + paymentsMadeTotalCents - owedTotalCents - paymentsReceivedTotalCents
  };
}

export function getSimplifiedDebts(
  expenses: Expense[],
  splits: Split[],
  payments: Payment[],
  exchangeRates: Record<string, number>
): Debt[] {
  const balances = getNetBalances(expenses, splits, payments, exchangeRates);

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
