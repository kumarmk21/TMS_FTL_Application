export interface VendorThcRow {
  thc_id: string;
  thc_id_number: string | null;
  thc_date: string | null;
  lr_number: string | null;
  vehicle_number: string | null;
  thc_amount: number | null;
  thc_advance_amount: number | null;
  thc_advance_date: string | null;
  thc_balance_amount: number | null;
  thc_balance_payment_date: string | null;
}

export type LedgerEntryType = 'THC' | 'Advance' | 'BTH Paid';

export interface LedgerLine {
  date: string;
  type: LedgerEntryType;
  lrNumber: string;
  vehicleNumber: string;
  thcNumber: string;
  credit: number;
  debit: number;
  balance: number;
}

export interface VendorLedger {
  opening: number;
  lines: LedgerLine[];
  totalCredit: number;
  totalDebit: number;
  closing: number;
}

interface RawEntry {
  date: string;
  type: LedgerEntryType;
  lrNumber: string;
  vehicleNumber: string;
  thcNumber: string;
  credit: number;
  debit: number;
}

const TYPE_ORDER: Record<LedgerEntryType, number> = { THC: 0, Advance: 1, 'BTH Paid': 2 };

const num = (value: number | null | undefined) => Number(value) || 0;

const isPaid = (thc: VendorThcRow) => num(thc.thc_advance_amount) > 0 || !!thc.thc_balance_payment_date;

function entriesFor(thc: VendorThcRow): RawEntry[] {
  if (!isPaid(thc)) return [];

  const base = {
    lrNumber: thc.lr_number || '-',
    vehicleNumber: thc.vehicle_number || '-',
    thcNumber: thc.thc_id_number || '-',
  };
  const entries: RawEntry[] = [];

  if (thc.thc_date) {
    entries.push({ ...base, date: thc.thc_date, type: 'THC', credit: num(thc.thc_amount), debit: 0 });
  }
  if (num(thc.thc_advance_amount) > 0) {
    entries.push({
      ...base,
      date: thc.thc_advance_date || thc.thc_date || '',
      type: 'Advance',
      credit: 0,
      debit: num(thc.thc_advance_amount),
    });
  }
  if (thc.thc_balance_payment_date) {
    entries.push({
      ...base,
      date: thc.thc_balance_payment_date,
      type: 'BTH Paid',
      credit: 0,
      debit: num(thc.thc_balance_amount),
    });
  }
  return entries;
}

export function buildVendorLedger(thcs: VendorThcRow[], fromDate: string, toDate: string): VendorLedger {
  const allEntries = thcs.flatMap(entriesFor);

  const opening = allEntries
    .filter((e) => e.date < fromDate)
    .reduce((sum, e) => sum + e.credit - e.debit, 0);

  const inRange = allEntries
    .filter((e) => e.date >= fromDate && e.date <= toDate)
    .sort((a, b) => a.date.localeCompare(b.date) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);

  let running = opening;
  const lines: LedgerLine[] = inRange.map((e) => {
    running += e.credit - e.debit;
    return { ...e, balance: running };
  });

  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);

  return {
    opening,
    lines,
    totalCredit,
    totalDebit,
    closing: opening + totalCredit - totalDebit,
  };
}
