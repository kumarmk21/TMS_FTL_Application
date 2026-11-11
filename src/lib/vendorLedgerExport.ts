import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import type { VendorLedger, LedgerLine } from './vendorLedger';

export interface VendorLedgerMeta {
  vendorName: string;
  fromDate: string;
  toDate: string;
}

export interface LedgerCompany {
  company_name: string | null;
  company_tagline: string | null;
  company_address: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  contact_number: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
}

export const money = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const displayDate = (iso: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fileBase = (meta: VendorLedgerMeta) =>
  `Vendor_Ledger_${meta.vendorName.replace(/[^a-zA-Z0-9]+/g, '_')}_${meta.fromDate}_to_${meta.toDate}`;

export function exportVendorLedgerExcel(ledger: VendorLedger, meta: VendorLedgerMeta) {
  const header = ['Date', 'Type', 'LR Number', 'Vehicle Number', 'THC Number', 'Credit Amount', 'Debit Amount', 'Balance Amount'];
  const rows: (string | number)[][] = [
    [`Vendor Ledger - ${meta.vendorName}`],
    [`Period: ${displayDate(meta.fromDate)} to ${displayDate(meta.toDate)}`],
    [],
    header,
    ['', 'Opening Balance', '', '', '', '', '', ledger.opening],
    ...ledger.lines.map((l) => [
      displayDate(l.date),
      l.type,
      l.lrNumber,
      l.vehicleNumber,
      l.thcNumber,
      l.credit || '',
      l.debit || '',
      l.balance,
    ]),
    ['', 'Total', '', '', '', ledger.totalCredit, ledger.totalDebit, ''],
    ['', 'Closing Balance', '', '', '', '', '', ledger.closing],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Vendor Ledger');
  XLSX.writeFile(workbook, `${fileBase(meta)}.xlsx`);
}

function lineRowHtml(line: LedgerLine) {
  return `
    <tr>
      <td>${displayDate(line.date)}</td>
      <td>${escapeHtml(line.type)}</td>
      <td>${escapeHtml(line.lrNumber)}</td>
      <td>${escapeHtml(line.vehicleNumber)}</td>
      <td>${escapeHtml(line.thcNumber)}</td>
      <td class="num">${line.credit ? money(line.credit) : ''}</td>
      <td class="num">${line.debit ? money(line.debit) : ''}</td>
      <td class="num">${money(line.balance)}</td>
    </tr>`;
}

function ledgerHtml(ledger: VendorLedger, meta: VendorLedgerMeta, company: LedgerCompany | null) {
  const addressParts = [company?.company_address, company?.city, company?.state, company?.pin_code]
    .filter(Boolean)
    .map((p) => escapeHtml(String(p)));
  const contactParts = [
    company?.contact_number && `Phone: ${escapeHtml(company.contact_number)}`,
    company?.email && `Email: ${escapeHtml(company.email)}`,
    company?.website && `Web: ${escapeHtml(company.website)}`,
  ].filter(Boolean);

  return `
  <div style="font-family: Arial, sans-serif; color: #1f2937; font-size: 11px; padding: 8px;">
    <style>
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 5px 6px; text-align: left; }
      th { background: #f3f4f6; font-weight: 600; }
      td.num, th.num { text-align: right; }
      tr.total td, tr.summary td { font-weight: 700; background: #f9fafb; }
    </style>
    <table style="border: none; margin-top: 0;">
      <tr>
        <td style="border: none; width: 90px; padding: 0;">
          ${company?.logo_url ? `<img src="${escapeHtml(company.logo_url)}" style="height: 64px; width: auto;" crossorigin="anonymous" />` : ''}
        </td>
        <td style="border: none; padding: 0 0 0 12px;">
          <div style="font-size: 18px; font-weight: 700;">${escapeHtml(company?.company_name || '')}</div>
          ${company?.company_tagline ? `<div style="color: #6b7280; font-style: italic;">${escapeHtml(company.company_tagline)}</div>` : ''}
          <div style="margin-top: 4px; color: #4b5563;">${addressParts.join(', ')}</div>
          <div style="color: #4b5563;">${contactParts.join(' | ')}</div>
        </td>
      </tr>
    </table>
    <div style="margin-top: 16px; border-top: 2px solid #1f2937; padding-top: 10px;">
      <div style="font-size: 15px; font-weight: 700;">Vendor Ledger: ${escapeHtml(meta.vendorName)}</div>
      <div style="color: #4b5563;">Period: ${displayDate(meta.fromDate)} to ${displayDate(meta.toDate)}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>LR Number</th>
          <th>Vehicle Number</th>
          <th>THC Number</th>
          <th class="num">Credit Amount</th>
          <th class="num">Debit Amount</th>
          <th class="num">Balance Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr class="summary">
          <td colspan="7">Opening Balance</td>
          <td class="num">${money(ledger.opening)}</td>
        </tr>
        ${ledger.lines.map(lineRowHtml).join('')}
        <tr class="total">
          <td colspan="5">Total</td>
          <td class="num">${money(ledger.totalCredit)}</td>
          <td class="num">${money(ledger.totalDebit)}</td>
          <td></td>
        </tr>
        <tr class="summary">
          <td colspan="7">Closing Balance (Opening + Credit - Debit)</td>
          <td class="num">${money(ledger.closing)}</td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

export async function exportVendorLedgerPdf(
  ledger: VendorLedger,
  meta: VendorLedgerMeta,
  company: LedgerCompany | null
) {
  const container = document.createElement('div');
  container.innerHTML = ledgerHtml(ledger, meta, company);
  await html2pdf()
    .set({
      margin: 10,
      filename: `${fileBase(meta)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(container)
    .save();
}
