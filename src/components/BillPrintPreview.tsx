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
  branch_id: string | null;
  state_id: string | null;
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

interface BillDetails {
  bill_id: string;
  lr_bill_number: string;
  lr_bill_date: string;
  billing_party_name: string;
  billing_party_code: string;
  bill_to_address: string | null;
  bill_to_gstin: string | null;
  bill_to_state: string | null;
  bill_amount: number;
  sub_total: number | null;
  credit_days: number | null;
  lr_bill_due_date: string | null;
  sac_code: string | null;
  sac_description: string | null;
  tran_id: string | null;
}

interface LRDetails {
  manual_lr_no: string | null;
  lr_date: string | null;
  act_del_date: string | null;
  from_city: string | null;
  to_city: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_value: number | null;
  eway_bill_number: string | null;
  pod_upload: string | null;
}

interface BillPrintPreviewProps {
  billId: string;
  onClose: () => void;
}

export function BillPrintPreview({ billId, onClose }: BillPrintPreviewProps) {
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [bill, setBill] = useState<BillDetails | null>(null);
  const [lrDetails, setLrDetails] = useState<LRDetails | null>(null);
  const [podImageUrls, setPodImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillData();
  }, [billId]);

  const fetchBillData = async () => {
    try {
      const [companyResult, billResult] = await Promise.all([
        supabase.from('company_master').select('*').limit(1).maybeSingle(),
        supabase
          .from('lr_bill')
          .select('*')
          .eq('bill_id', billId)
          .maybeSingle()
      ]);

      if (companyResult.error) throw companyResult.error;
      if (billResult.error) throw billResult.error;

      setCompany(companyResult.data);
      setBill(billResult.data);

      if (billResult.data?.lr_bill_number) {
        const lrResult = await supabase
          .from('booking_lr')
          .select('manual_lr_no, lr_date, act_del_date, from_city, to_city, vehicle_type, vehicle_number, invoice_number, invoice_date, invoice_value, eway_bill_number, pod_upload')
          .eq('bill_no', billResult.data.lr_bill_number)
          .maybeSingle();

        if (lrResult.error) throw lrResult.error;
        setLrDetails(lrResult.data);

        if (lrResult.data?.pod_upload) {
          const podPaths = lrResult.data.pod_upload.split(',').map((path: string) => path.trim());
          const urls: string[] = [];

          for (const path of podPaths) {
            const { data } = supabase.storage
              .from('pod-documents')
              .getPublicUrl(path);

            if (data?.publicUrl) {
              urls.push(data.publicUrl);
            }
          }

          setPodImageUrls(urls);
        }
      }
    } catch (error) {
      console.error('Error fetching bill data:', error);
      alert('Error loading bill data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    if (bill?.billing_party_name && bill?.lr_bill_number) {
      document.title = `${bill.billing_party_name.replace(/[^a-zA-Z0-9]/g, '_')}_${bill.lr_bill_number}`;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const handleDownloadPDF = async () => {
    const element = document.querySelector('.bill-print-content');
    if (!element) return;

    const filename = bill?.billing_party_name && bill?.lr_bill_number
      ? `${bill.billing_party_name.replace(/[^a-zA-Z0-9]/g, '_')}_${bill.lr_bill_number}.pdf`
      : 'lr_bill.pdf';

    const opt = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2.5,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 800
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: {
        mode: 'avoid-all',
        avoid: ['tr', 'td', 'th', 'img', 'div']
      }
    };

    await html2pdf().set(opt).from(element).save();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Loading bill details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden">
          <h2 className="text-xl font-semibold text-gray-800">Bill Preview</h2>
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

        <div className="p-4 bill-print-content">
          <div className="bg-white" style={{ maxWidth: '190mm', margin: '0 auto', padding: '0', fontSize: '11px' }}>
            <div className="space-y-2">
              <div className="border-b border-gray-300 pb-2">
                <div className="flex items-start justify-between mb-2">
                  {company?.logo_url && (
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="h-14 w-auto object-contain"
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
                    <p className="text-gray-700">
                      <span className="font-semibold">Website:</span>{' '}
                      {company?.website || '-'}
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
                    <p className="text-gray-700">
                      <span className="font-semibold">MSME No:</span>{' '}
                      {company?.msme_no || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-gray-900">TAX INVOICE</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="border border-gray-300 p-2 rounded">
                  <h3 className="font-semibold text-xs text-gray-900 mb-1">Bill Details</h3>
                  <p className="text-xs text-gray-700 mb-0.5">
                    <span className="font-medium">Bill Number:</span>{' '}
                    {bill?.lr_bill_number || '-'}
                  </p>
                  <p className="text-xs text-gray-700 mb-0.5">
                    <span className="font-medium">Bill Date:</span>{' '}
                    {formatDate(bill?.lr_bill_date || null)}
                  </p>
                  <p className="text-xs text-gray-700 mb-0.5">
                    <span className="font-medium">Due Date:</span>{' '}
                    {formatDate(bill?.lr_bill_due_date || null)}
                  </p>
                  <p className="text-xs text-gray-700">
                    <span className="font-medium">Credit Days:</span>{' '}
                    {bill?.credit_days || '-'}
                  </p>
                </div>

                <div className="border border-gray-300 p-2 rounded">
                  <h3 className="font-semibold text-xs text-gray-900 mb-1">Bill To</h3>
                  <p className="text-xs font-semibold text-gray-900 mb-0.5">
                    {bill?.billing_party_name || '-'}
                  </p>
                  <p className="text-xs text-gray-700 mb-0.5">
                    {bill?.bill_to_address || '-'}
                  </p>
                  <p className="text-xs text-gray-700 mb-0.5">
                    <span className="font-medium">State:</span>{' '}
                    {bill?.bill_to_state || '-'}
                  </p>
                  <p className="text-xs text-gray-700">
                    <span className="font-medium">GSTIN:</span>{' '}
                    {bill?.bill_to_gstin || '-'}
                  </p>
                </div>
              </div>

              <div className="border border-gray-300 rounded p-2 mb-2">
                <h3 className="font-semibold text-xs text-gray-900 mb-1">LR Details</h3>
                <div className="grid grid-cols-4 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <span className="font-medium text-gray-700">LR No:</span>
                    <p className="text-gray-900">{lrDetails?.manual_lr_no || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">LR Date:</span>
                    <p className="text-gray-900">{formatDate(lrDetails?.lr_date || null)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Delivery Date:</span>
                    <p className="text-gray-900">{formatDate(lrDetails?.act_del_date || null)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">From:</span>
                    <p className="text-gray-900">{lrDetails?.from_city || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">To:</span>
                    <p className="text-gray-900">{lrDetails?.to_city || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Vehicle Type:</span>
                    <p className="text-gray-900">{lrDetails?.vehicle_type || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Vehicle No:</span>
                    <p className="text-gray-900">{lrDetails?.vehicle_number || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Invoice No:</span>
                    <p className="text-gray-900">{lrDetails?.invoice_number || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Invoice Date:</span>
                    <p className="text-gray-900">{formatDate(lrDetails?.invoice_date || null)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Invoice Value:</span>
                    <p className="text-gray-900">{lrDetails?.invoice_value ? `₹${lrDetails.invoice_value.toFixed(2)}` : '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">E-Way Bill:</span>
                    <p className="text-gray-900">{lrDetails?.eway_bill_number || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 rounded overflow-hidden mb-2">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-900 border-b border-gray-300">
                        Description
                      </th>
                      <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-900 border-b border-gray-300">
                        SAC Code
                      </th>
                      <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-900 border-b border-gray-300">
                        Amount (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-2 py-1.5 text-xs text-gray-700">
                        {bill?.sac_description || 'Transportation Charges'}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-center text-gray-700">
                        {bill?.sac_code || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-right text-gray-900">
                        {(bill?.sub_total || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mb-2">
                <div className="w-64 border border-gray-300 rounded overflow-hidden">
                  <div className="bg-gray-100 px-2 py-1.5 flex justify-between items-center">
                    <span className="font-semibold text-xs text-gray-900">Total Amount</span>
                    <span className="text-base font-bold text-gray-900">
                      ₹{(bill?.bill_amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {podImageUrls.length > 0 && (
                <div className="mt-3 mb-3 border border-gray-300 rounded p-2">
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Proof of Delivery (POD)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {podImageUrls.map((url, index) => (
                      <div key={index} className="border border-gray-200 rounded overflow-hidden">
                        <img
                          src={url}
                          alt={`POD ${index + 1}`}
                          className="w-full h-auto object-contain"
                          style={{ maxHeight: '200px' }}
                          crossOrigin="anonymous"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-gray-300">
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-gray-900 mb-1">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <p className="text-gray-700">
                      <span className="font-medium">Bank Name:</span>{' '}
                      {company?.bank_name || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Account Number:</span>{' '}
                      {company?.account_number || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">IFSC Code:</span>{' '}
                      {company?.ifsc_code || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Branch:</span>{' '}
                      {company?.bank_branch || '-'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-900 mb-2">
                    For {company?.company_name}
                  </p>
                  <div className="mt-2 flex items-end justify-end gap-2">
                    <div className="relative">
                      <img
                        src="/signature.jpg"
                        alt="Authorized Signature"
                        className="h-12 w-auto object-contain"
                      />
                    </div>
                    <div className="relative">
                      <img
                        src="/round_stamp.jpg"
                        alt="Company Seal"
                        className="h-14 w-14 object-contain"
                      />
                    </div>
                  </div>
                  <div className="mt-1">
                    <p className="text-xs text-gray-700">Authorized Signatory</p>
                  </div>
                </div>
              </div>

              {(company?.bill_footer1 || company?.bill_footer2 || company?.bill_footer3) && (
                <div className="mt-2 pt-2 border-t border-gray-300 space-y-1">
                  {company?.bill_footer1 && (
                    <p className="text-xs text-gray-700 text-center break-words whitespace-pre-wrap">
                      {company.bill_footer1}
                    </p>
                  )}
                  {company?.bill_footer2 && (
                    <p className="text-xs text-gray-700 text-center break-words whitespace-pre-wrap">
                      {company.bill_footer2}
                    </p>
                  )}
                  {company?.bill_footer3 && (
                    <p className="text-xs text-gray-700 text-center break-words whitespace-pre-wrap">
                      {company.bill_footer3}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
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
            padding: 0;
            font-size: 10px !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
        }
      `}</style>
    </div>
  );
}
