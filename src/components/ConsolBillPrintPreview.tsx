import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Printer, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface CompanyDetails {
  company_name: string;
  company_tagline: string | null;
  company_address: string | null;
  pin_code: string | null;
  cin: string | null;
  gstin: string | null;
  contact_number: string | null;
  email: string | null;
  website: string | null;
  msme_no: string | null;
  pan: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  bank_branch: string | null;
  logo_url: string | null;
  bill_footer1: string | null;
  bill_footer2: string | null;
  bill_footer3: string | null;
  bill_footer4: string | null;
}

interface ConsolBillDetails {
  tran_id: string;
  consol_bill_no: string;
  consol_bill_date: string;
  consol_billing_party: string;
  consol_bill_amount: number;
  consol_bill_pending_amount: number | null;
  consol_bill_status: string;
  bill_from_company: string | null;
}

interface CustomerGST {
  customer_name: string;
  bill_to_address: string | null;
  gstin: string | null;
  alpha_code: string | null;
}

interface LRRecord {
  tran_id: string;
  manual_lr_no: string | null;
  lr_date: string | null;
  freight_amount: number | null;
  loading_charges: number | null;
  unloading_charges: number | null;
  detention_charges: number | null;
  subtotal: number | null;
  bill_amount: number | null;
}

interface ConsolBillPrintPreviewProps {
  consolBillId: string;
  onClose: () => void;
}

const ROWS_PER_ANNEXURE_PAGE = 10;

export function ConsolBillPrintPreview({ consolBillId, onClose }: ConsolBillPrintPreviewProps) {
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [bill, setBill] = useState<ConsolBillDetails | null>(null);
  const [customerGST, setCustomerGST] = useState<CustomerGST | null>(null);
  const [lrRecords, setLrRecords] = useState<LRRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [consolBillId]);

  const fetchData = async () => {
    try {
      const { data: billData, error: billError } = await supabase
        .from('consol_bill_data')
        .select('*')
        .eq('tran_id', consolBillId)
        .maybeSingle();

      if (billError) throw billError;
      if (!billData) throw new Error('Bill not found');
      setBill(billData);

      const [companyResult, lrResult] = await Promise.all([
        billData.bill_from_company
          ? supabase.from('company_master').select('*').eq('company_code', billData.bill_from_company).maybeSingle()
          : supabase.from('company_master').select('*').limit(1).maybeSingle(),
        supabase
          .from('booking_lr')
          .select('tran_id, manual_lr_no, lr_date, freight_amount, loading_charges, unloading_charges, detention_charges, subtotal, bill_amount')
          .eq('consol_bill_number', billData.consol_bill_no)
          .order('lr_date', { ascending: true }),
      ]);

      if (companyResult.error) throw companyResult.error;
      if (lrResult.error) throw lrResult.error;

      setCompany(companyResult.data);
      setLrRecords(lrResult.data || []);

      const gstResult = await supabase
        .from('customer_gst_master')
        .select('customer_name, bill_to_address, gstin, alpha_code')
        .ilike('customer_name', `%${billData.consol_billing_party.split('—')[0].trim()}%`)
        .limit(1)
        .maybeSingle();

      if (!gstResult.error && gstResult.data) {
        setCustomerGST(gstResult.data);
      }
    } catch (error) {
      console.error('Error fetching consol bill data:', error);
      alert('Error loading consol bill data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    if (bill) {
      document.title = `${bill.consol_billing_party.replace(/[^a-zA-Z0-9]/g, '_')}_${bill.consol_bill_no}`;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const handleDownloadPDF = async () => {
    const element = document.querySelector('.consol-bill-print-content');
    if (!element) return;

    const filename = bill
      ? `${bill.consol_billing_party.replace(/[^a-zA-Z0-9]/g, '_')}_${bill.consol_bill_no}.pdf`
      : 'consol_bill.pdf';

    const opt = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please use Print instead.');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const formatAmount = (val: number | null | undefined) =>
    val != null ? val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';

  const getDueDate = () => {
    if (!bill?.consol_bill_date) return '-';
    const d = new Date(bill.consol_bill_date);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const annexurePages: LRRecord[][] = [];
  for (let i = 0; i < lrRecords.length; i += ROWS_PER_ANNEXURE_PAGE) {
    annexurePages.push(lrRecords.slice(i, i + ROWS_PER_ANNEXURE_PAGE));
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading consol bill...</p>
        </div>
      </div>
    );
  }

  if (!bill || !company) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Bill data not found.</p>
          <button onClick={onClose} className="bg-red-600 text-white px-4 py-2 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const BillHeader = () => (
    <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-800">
      <div className="flex items-center gap-3">
        {company.logo_url && (
          <img src={company.logo_url} alt="Logo" className="h-16 w-auto object-contain" />
        )}
      </div>
      <div className="text-right">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-wide">{company.company_name}</h1>
        {company.company_tagline && (
          <p className="text-xs text-gray-500 italic">{company.company_tagline}</p>
        )}
      </div>
    </div>
  );

  const CompanyInfo = () => (
    <div className="grid grid-cols-2 gap-6 mb-4 text-xs">
      <div>
        <p className="font-semibold text-gray-800">
          Address: <span className="font-normal">{company.company_address}</span>
        </p>
        {company.pin_code && (
          <p className="font-semibold text-gray-800">
            PIN Code: <span className="font-normal">{company.pin_code}</span>
          </p>
        )}
        {company.contact_number && (
          <p className="font-semibold text-gray-800">
            Contact: <span className="font-normal">{company.contact_number}</span>
          </p>
        )}
        {company.email && (
          <p className="font-semibold text-gray-800">
            Email: <span className="font-normal">{company.email}</span>
          </p>
        )}
        {company.website && (
          <p className="font-semibold text-gray-800">
            Website: <span className="font-normal">{company.website}</span>
          </p>
        )}
      </div>
      <div>
        {company.gstin && (
          <p className="font-semibold text-gray-800">
            GSTIN: <span className="font-normal">{company.gstin}</span>
          </p>
        )}
        {company.cin && (
          <p className="font-semibold text-gray-800">
            CIN: <span className="font-normal">{company.cin}</span>
          </p>
        )}
        {company.pan && (
          <p className="font-semibold text-gray-800">
            PAN: <span className="font-normal">{company.pan}</span>
          </p>
        )}
        {company.msme_no && (
          <p className="font-semibold text-gray-800">
            MSME No: <span className="font-normal">{company.msme_no}</span>
          </p>
        )}
      </div>
    </div>
  );

  const BillFooter = () => (
    <div className="mt-6 pt-3 border-t border-gray-200">
      {(company.bill_footer1 || company.bill_footer2 || company.bill_footer3) && (
        <div className="text-center space-y-1 mb-4">
          {company.bill_footer1 && <p className="text-xs text-gray-600">{company.bill_footer1}</p>}
          {company.bill_footer2 && <p className="text-xs text-gray-600">{company.bill_footer2}</p>}
          {company.bill_footer3 && <p className="text-xs text-gray-600">{company.bill_footer3}</p>}
          {company.bill_footer4 && <p className="text-xs text-gray-600">{company.bill_footer4}</p>}
        </div>
      )}
      <div className="flex justify-between items-end mt-4">
        <div />
        <div className="text-right text-xs">
          <p className="mb-8 text-gray-600">For {company.company_name}</p>
          <p className="text-gray-500">Authorized Signatory</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-auto">
      <div className="print:hidden sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">
          Consol Bill Print — {bill.consol_bill_no}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>

      <div className="consol-bill-print-content max-w-4xl mx-auto my-6 print:my-0 print:max-w-none space-y-0">
        {/* ── PAGE 1: MAIN BILL ── */}
        <div className="bg-white shadow-lg print:shadow-none p-10 print:p-8 page-break-after">
          <BillHeader />
          <CompanyInfo />

          <h2 className="text-center text-base font-bold tracking-widest border border-gray-400 py-1.5 mb-4">
            TAX INVOICE
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-300 rounded p-3 text-xs space-y-1">
              <p className="font-bold text-gray-800 text-sm mb-1">Bill Details</p>
              <p className="text-gray-700">
                <span className="font-semibold">Bill Number:</span> {bill.consol_bill_no}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Bill Date:</span> {formatDate(bill.consol_bill_date)}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Due Date:</span> {getDueDate()}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Credit Days:</span> 30
              </p>
            </div>

            <div className="border border-gray-300 rounded p-3 text-xs space-y-1">
              <p className="font-bold text-gray-800 text-sm mb-1">Bill To</p>
              <p className="font-bold text-gray-900 text-sm">{bill.consol_billing_party}</p>
              {customerGST?.bill_to_address && (
                <p className="text-gray-700">{customerGST.bill_to_address}</p>
              )}
              {customerGST?.alpha_code && (
                <p className="text-gray-700">
                  <span className="font-semibold">State:</span> {customerGST.alpha_code}
                </p>
              )}
              {customerGST?.gstin && (
                <p className="text-gray-700">
                  <span className="font-semibold">GSTIN:</span> {customerGST.gstin}
                </p>
              )}
            </div>
          </div>

          <table className="w-full border border-gray-300 text-xs mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">SAC Code</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">Transportation Charges</td>
                <td className="border border-gray-300 px-3 py-2 text-center">-</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {formatAmount(bill.consol_bill_amount)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={2} className="border border-gray-300 px-3 py-2 text-right font-bold">
                  Total Amount
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right font-bold text-base">
                  ₹{formatAmount(bill.consol_bill_amount)}
                </td>
              </tr>
            </tfoot>
          </table>

          {(company.bank_name || company.account_number) && (
            <div className="border border-gray-300 rounded p-3 mb-4 text-xs">
              <p className="font-bold text-gray-800 mb-1">Bank Details</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  {company.bank_name && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Bank Name:</span> {company.bank_name}
                    </p>
                  )}
                  {company.ifsc_code && (
                    <p className="text-gray-700">
                      <span className="font-semibold">IFSC Code:</span> {company.ifsc_code}
                    </p>
                  )}
                </div>
                <div>
                  {company.account_number && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Account Number:</span> {company.account_number}
                    </p>
                  )}
                  {company.bank_branch && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Branch:</span> {company.bank_branch}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <BillFooter />
        </div>

        {/* ── ANNEXURE PAGES ── */}
        {annexurePages.map((pageRows, pageIdx) => (
          <div
            key={pageIdx}
            className="bg-white shadow-lg print:shadow-none p-10 print:p-8 mt-6 print:mt-0 page-break-before"
          >
            <BillHeader />
            <CompanyInfo />

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold tracking-wider border border-gray-400 px-4 py-1.5 rounded">
                ANNEXURE — {bill.consol_bill_no}
              </h2>
              <p className="text-xs text-gray-500">
                Page {pageIdx + 2} &nbsp;|&nbsp; Billing Party: {bill.consol_billing_party}
              </p>
            </div>

            <table className="w-full border border-gray-300 text-xs mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold">#</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-semibold">LR Number</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-semibold">LR Date</th>
                  <th className="border border-gray-300 px-2 py-2 text-right font-semibold">Freight (₹)</th>
                  <th className="border border-gray-300 px-2 py-2 text-right font-semibold">Loading (₹)</th>
                  <th className="border border-gray-300 px-2 py-2 text-right font-semibold">Unloading (₹)</th>
                  <th className="border border-gray-300 px-2 py-2 text-right font-semibold">Detention (₹)</th>
                  <th className="border border-gray-300 px-2 py-2 text-right font-semibold">Gross Amt (₹)</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((lr, idx) => {
                  const globalIdx = pageIdx * ROWS_PER_ANNEXURE_PAGE + idx + 1;
                  const gross =
                    (lr.freight_amount ?? 0) +
                    (lr.loading_charges ?? 0) +
                    (lr.unloading_charges ?? 0) +
                    (lr.detention_charges ?? 0);
                  return (
                    <tr key={lr.tran_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">{globalIdx}</td>
                      <td className="border border-gray-300 px-2 py-1.5 font-medium text-blue-700">
                        {lr.manual_lr_no || '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        {formatDate(lr.lr_date)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">
                        {formatAmount(lr.freight_amount)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">
                        {formatAmount(lr.loading_charges)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">
                        {formatAmount(lr.unloading_charges)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">
                        {formatAmount(lr.detention_charges)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-semibold">
                        {formatAmount(gross)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {pageIdx === annexurePages.length - 1 && (
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={3} className="border border-gray-300 px-2 py-2 text-right">
                      Total
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {formatAmount(lrRecords.reduce((s, r) => s + (r.freight_amount ?? 0), 0))}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {formatAmount(lrRecords.reduce((s, r) => s + (r.loading_charges ?? 0), 0))}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {formatAmount(lrRecords.reduce((s, r) => s + (r.unloading_charges ?? 0), 0))}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {formatAmount(lrRecords.reduce((s, r) => s + (r.detention_charges ?? 0), 0))}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right">
                      {formatAmount(
                        lrRecords.reduce(
                          (s, r) =>
                            s +
                            (r.freight_amount ?? 0) +
                            (r.loading_charges ?? 0) +
                            (r.unloading_charges ?? 0) +
                            (r.detention_charges ?? 0),
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>

            <BillFooter />
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .consol-bill-print-content,
          .consol-bill-print-content * { visibility: visible; }
          .consol-bill-print-content { position: fixed; left: 0; top: 0; width: 100%; }
          .page-break-after { page-break-after: always; }
          .page-break-before { page-break-before: always; }
        }
      `}</style>
    </div>
  );
}
