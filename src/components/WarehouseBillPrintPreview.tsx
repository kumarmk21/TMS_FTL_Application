import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Printer, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface CompanyDetails {
  logo_url: string | null;
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
  bill_footer1: string | null;
  bill_footer2: string | null;
  bill_footer3: string | null;
}

interface WarehouseBillDetails {
  bill_id: string;
  bill_number: string;
  bill_date: string;
  bill_period: string | null;
  billing_party_name: string;
  billing_party_code: string;
  bill_to_address: string | null;
  bill_to_gstin: string | null;
  bill_to_state: string | null;
  service_branch_name: string | null;
  service_type: string | null;
  sac_code: string | null;
  sac_description: string | null;
  warehouse_charges: number;
  other_charges: number;
  sub_total: number;
  gst_percentage: number;
  igst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_amount: number;
  credit_days: number | null;
  bill_due_date: string | null;
  remarks: string | null;
}

interface WarehouseBillPrintPreviewProps {
  billId: string;
  onClose: () => void;
}

export function WarehouseBillPrintPreview({ billId, onClose }: WarehouseBillPrintPreviewProps) {
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [bill, setBill] = useState<WarehouseBillDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillData();
  }, [billId]);

  const fetchBillData = async () => {
    try {
      const billResult = await supabase
        .from('warehouse_bill')
        .select('*, bill_generation_branch(*)')
        .eq('bill_id', billId)
        .maybeSingle();

      if (billResult.error) throw billResult.error;

      setBill(billResult.data);
      setCompany(billResult.data?.bill_generation_branch || null);
    } catch (error) {
      console.error('Error fetching warehouse bill data:', error);
      alert('Error loading warehouse bill data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    if (bill?.billing_party_code && bill?.bill_number) {
      document.title = `${bill.billing_party_code}_${bill.bill_number}`;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const handleDownloadPDF = async () => {
    const element = document.querySelector('.bill-print-content');
    if (!element) return;

    const filename = bill?.billing_party_code && bill?.bill_number
      ? `${bill.billing_party_code}_${bill.bill_number}.pdf`
      : 'warehouse_bill.pdf';

    const opt = {
      margin: [5, 5, 5, 5],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        windowHeight: element.scrollHeight + 100,
        height: element.scrollHeight + 100
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: {
        mode: 'avoid-all',
        avoid: ['tr', 'td', 'th', 'img', '.page-break-avoid']
      }
    };

    await html2pdf().set(opt).from(element).save();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const convertToWords = (n: number): string => {
      if (n < 10) return ones[n];
      if (n >= 10 && n < 20) return teens[n - 10];
      if (n >= 20 && n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n >= 100 && n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertToWords(n % 100) : '');
      if (n >= 1000 && n < 100000) return convertToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertToWords(n % 1000) : '');
      if (n >= 100000 && n < 10000000) return convertToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convertToWords(n % 100000) : '');
      if (n >= 10000000) return convertToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convertToWords(n % 10000000) : '');
      return '';
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = 'Rupees ' + convertToWords(rupees);
    if (paise > 0) {
      result += ' and ' + convertToWords(paise) + ' Paise';
    }
    result += ' Only';

    return result;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Loading warehouse bill details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden">
          <h2 className="text-xl font-semibold text-gray-800">Warehouse Bill Preview</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-8 bill-print-content">
          <div className="bg-white print-page" style={{ maxWidth: '210mm', margin: '0 auto', padding: '8mm' }}>
            <div className="space-y-1">
              <div className="border-b-2 border-gray-300 pb-1">
                <div className="flex items-start justify-between mb-1">
                  {company?.logo_url && (
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="h-14 w-auto object-contain print-logo"
                    />
                  )}
                  <div className="text-right">
                    <h1 className="text-xl font-bold text-gray-900">{company?.company_name}</h1>
                    {company?.company_tagline && (
                      <p className="text-xs text-gray-600 italic">{company.company_tagline}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-700">
                      <span className="font-semibold">Address:</span>{' '}
                      {company?.company_address || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">PIN Code:</span>{' '}
                      {company?.pin_code || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Contact:</span>{' '}
                      {company?.contact_number || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Email:</span>{' '}
                      {company?.email || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-700">
                      <span className="font-semibold">GSTIN:</span>{' '}
                      {company?.gstin || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">CIN:</span>{' '}
                      {company?.cin || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">PAN:</span>{' '}
                      {company?.pan || '-'}
                    </p>
                    {company?.msme_no && (
                      <p className="text-gray-700">
                        <span className="font-semibold">MSME:</span>{' '}
                        {company.msme_no}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-300 pb-1">
                  TAX INVOICE
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="border border-gray-300 p-1.5 rounded">
                  <h3 className="font-semibold text-gray-900 mb-1 border-b pb-0.5">Bill Details</h3>
                  <p className="mb-1">
                    <span className="font-medium">Bill No:</span>{' '}
                    <span className="font-semibold">{bill?.bill_number}</span>
                  </p>
                  <p className="mb-1">
                    <span className="font-medium">Bill Date:</span>{' '}
                    {formatDate(bill?.bill_date || null)}
                  </p>
                  {bill?.bill_period && (
                    <p className="mb-1">
                      <span className="font-medium">Bill Period:</span>{' '}
                      {bill.bill_period}
                    </p>
                  )}
                  <p className="mb-1">
                    <span className="font-medium">Due Date:</span>{' '}
                    {formatDate(bill?.bill_due_date || null)}
                  </p>
                  <p className="mb-1">
                    <span className="font-medium">Credit Days:</span>{' '}
                    {bill?.credit_days || 0} days
                  </p>
                  {bill?.service_branch_name && (
                    <p className="mb-1">
                      <span className="font-medium">Service Branch:</span>{' '}
                      {bill.service_branch_name}
                    </p>
                  )}
                  {bill?.service_type && (
                    <p className="mb-1">
                      <span className="font-medium">Service Type:</span>{' '}
                      {bill.service_type}
                    </p>
                  )}
                </div>

                <div className="border border-gray-300 p-1.5 rounded">
                  <h3 className="font-semibold text-gray-900 mb-1 border-b pb-0.5">Bill To</h3>
                  <p className="font-semibold text-sm mb-1">{bill?.billing_party_name}</p>
                  <p className="mb-1 text-gray-700">Code: {bill?.billing_party_code}</p>
                  {bill?.bill_to_address && (
                    <p className="mb-1 text-gray-700">{bill.bill_to_address}</p>
                  )}
                  {bill?.bill_to_state && (
                    <p className="mb-1 text-gray-700">State: {bill.bill_to_state}</p>
                  )}
                  {bill?.bill_to_gstin && (
                    <p className="mb-1 text-gray-700">
                      <span className="font-medium">GSTIN:</span> {bill.bill_to_gstin}
                    </p>
                  )}
                </div>
              </div>

              <div className="border border-gray-300 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-300 p-2 text-left">Sr. No.</th>
                      <th className="border-b border-gray-300 p-2 text-left">Description of Service</th>
                      <th className="border-b border-gray-300 p-2 text-left">SAC Code</th>
                      <th className="border-b border-gray-300 p-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill && bill.warehouse_charges > 0 && (
                      <tr>
                        <td className="border-b border-gray-300 p-2">1</td>
                        <td className="border-b border-gray-300 p-2">
                          {bill.sac_description || 'Warehouse Charges'}
                        </td>
                        <td className="border-b border-gray-300 p-2">{bill.sac_code}</td>
                        <td className="border-b border-gray-300 p-2 text-right">
                          {formatCurrency(bill.warehouse_charges)}
                        </td>
                      </tr>
                    )}
                    {bill && bill.other_charges > 0 && (
                      <tr>
                        <td className="border-b border-gray-300 p-2">
                          {bill.warehouse_charges > 0 ? 2 : 1}
                        </td>
                        <td className="border-b border-gray-300 p-2">Other Charges</td>
                        <td className="border-b border-gray-300 p-2">{bill.sac_code}</td>
                        <td className="border-b border-gray-300 p-2 text-right">
                          {formatCurrency(bill.other_charges)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="border-b border-gray-300 p-2 text-right font-semibold">
                        Sub Total
                      </td>
                      <td className="border-b border-gray-300 p-2 text-right font-semibold">
                        {formatCurrency(bill?.sub_total || 0)}
                      </td>
                    </tr>
                    {bill && bill.igst_amount > 0 && (
                      <tr>
                        <td colSpan={3} className="border-b border-gray-300 p-2 text-right">
                          IGST @ {bill.gst_percentage}%
                        </td>
                        <td className="border-b border-gray-300 p-2 text-right">
                          {formatCurrency(bill.igst_amount)}
                        </td>
                      </tr>
                    )}
                    {bill && bill.cgst_amount > 0 && (
                      <tr>
                        <td colSpan={3} className="border-b border-gray-300 p-2 text-right">
                          CGST @ {(bill.gst_percentage / 2).toFixed(2)}%
                        </td>
                        <td className="border-b border-gray-300 p-2 text-right">
                          {formatCurrency(bill.cgst_amount)}
                        </td>
                      </tr>
                    )}
                    {bill && bill.sgst_amount > 0 && (
                      <tr>
                        <td colSpan={3} className="border-b border-gray-300 p-2 text-right">
                          SGST @ {(bill.gst_percentage / 2).toFixed(2)}%
                        </td>
                        <td className="border-b border-gray-300 p-2 text-right">
                          {formatCurrency(bill.sgst_amount)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-blue-50">
                      <td colSpan={3} className="border-b-2 border-gray-400 p-2 text-right font-bold text-sm">
                        Total Amount
                      </td>
                      <td className="border-b-2 border-gray-400 p-2 text-right font-bold text-sm">
                        {formatCurrency(bill?.total_amount || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border border-gray-300 rounded p-1.5 bg-gray-50">
                <p className="font-semibold text-xs text-gray-900">
                  Amount in Words:{' '}
                  <span className="font-normal">
                    {bill ? numberToWords(bill.total_amount) : '-'}
                  </span>
                </p>
              </div>

              {bill?.remarks && (
                <div className="border border-gray-300 rounded p-1.5">
                  <p className="font-semibold text-xs text-gray-900 mb-0.5">Remarks:</p>
                  <p className="text-xs text-gray-700">{bill.remarks}</p>
                </div>
              )}

              {company?.bank_name && (
                <div className="border border-gray-300 rounded p-1.5">
                  <h3 className="font-semibold text-xs text-gray-900 mb-1 border-b pb-0.5">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="mb-1">
                        <span className="font-medium">Bank Name:</span> {company.bank_name}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Account No:</span> {company.account_number}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1">
                        <span className="font-medium">IFSC Code:</span> {company.ifsc_code}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Branch:</span> {company.bank_branch}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t-2 border-gray-300 pt-1 mt-1 page-break-avoid">
                <div className="flex justify-between items-start gap-2">
                  <div className="text-xs text-gray-600 leading-tight" style={{ fontSize: '9px', lineHeight: '1.2', maxWidth: '55%' }}>
                    {company?.bill_footer2 && <p className="mb-0.5">{company.bill_footer2}</p>}
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="font-semibold text-xs text-gray-900 mb-1">For {company?.company_name}</p>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <img
                        src="/round_stamp.jpg"
                        alt="Company Seal"
                        className="h-14 w-14 object-contain"
                        crossOrigin="anonymous"
                      />
                      <img
                        src="/signature.jpg"
                        alt="Signature"
                        className="h-12 w-auto object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <p className="border-t border-gray-400 pt-1 text-xs font-medium">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .page-break-avoid {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }

          body * {
            visibility: hidden;
          }

          .bill-print-content,
          .bill-print-content * {
            visibility: visible;
          }

          .bill-print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }

          .print-page {
            width: 100% !important;
            max-width: 100% !important;
            padding: 4mm !important;
            margin: 0 !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          /* Ensure proper scaling */
          html, body {
            width: 210mm;
            height: 297mm;
          }

          /* Optimize image sizes for print */
          .print-logo {
            height: 45px !important;
          }

          /* Reduce spacing in print */
          .space-y-1 > * + * {
            margin-top: 0.15rem !important;
          }

          /* Compact borders */
          .border-b-2 {
            padding-bottom: 0.15rem !important;
          }

          .border-t-2 {
            padding-top: 0.15rem !important;
            margin-top: 0.15rem !important;
          }

          /* Prevent page breaks in footer */
          .page-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
