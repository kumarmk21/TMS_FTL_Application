import { useState, useEffect, useRef } from 'react';
import { Search, Printer, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import html2pdf from 'html2pdf.js';

interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
  is_active: boolean;
}

interface Company {
  id: string;
  company_code: string;
  company_name: string;
  company_tagline: string | null;
  company_address: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  logo_url: string | null;
  contact_number: string | null;
  email: string | null;
  website: string | null;
  gstin: string | null;
  cin: string | null;
  branch_master?: {
    branch_name: string;
    branch_code: string;
  };
  city_master?: {
    city_name: string;
    state_master?: {
      state_name: string;
    };
  };
}

interface LRData {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string | null;
  booking_branch: string | null;
  from_city: string | null;
  to_city: string | null;
  consignor: string | null;
  consignee: string | null;
  billing_party_name: string | null;
  billing_party_code: string | null;
  bill_to_gstin: string | null;
  bill_to_address: string | null;
  bill_to_state: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_number: string | null;
  no_of_pkgs: number | null;
  act_wt: number | null;
  chrg_wt: number | null;
  product: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_value: number | null;
  eway_bill_number: string | null;
  eway_bill_exp_date: string | null;
  freight_amount: number | null;
  docket_charges: number | null;
  loading_charges: number | null;
  unloading_charges: number | null;
  detention_charges: number | null;
  penalties_oth_charges: number | null;
  subtotal: number | null;
  gst_charge_type: string | null;
  gst_amount: number | null;
  lr_total_amount: number | null;
  pay_basis: string | null;
  booking_type: string | null;
  loading_date: string | null;
  est_del_date: string | null;
  lr_status: string | null;
  seal_no: string | null;
}

export function LRPrint() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [allLrList, setAllLrList] = useState<{ manual_lr_no: string; tran_id: string; booking_branch: string | null }[]>([]);
  const [lrList, setLrList] = useState<{ manual_lr_no: string; tran_id: string }[]>([]);
  const [selectedLR, setSelectedLR] = useState<string>('');
  const [lrData, setLRData] = useState<LRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompanies();
    fetchBranches();
    fetchLRList();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      filterLRListByBranch(selectedBranch.branch_code);
    } else {
      setLrList([]);
    }
    setSelectedLR('');
    setLRData(null);
  }, [selectedBranch]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('company_master')
        .select(`
          *,
          branch_master:branch_id (branch_name, branch_code),
          city_master:city_id (
            city_name,
            state_master:state_id (state_name)
          )
        `)
        .order('company_code');

      if (error) throw error;
      setCompanies(data || []);
      if (data && data.length > 0) {
        setSelectedCompany(data[0]);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_master')
        .select('*')
        .order('branch_code');

      if (error) throw error;
      setBranches(data || []);
      if (data && data.length > 0) {
        setSelectedBranch(data[0]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchLRList = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('manual_lr_no, tran_id, booking_branch')
        .order('manual_lr_no', { ascending: false });

      if (error) throw error;
      setAllLrList(data || []);
    } catch (error) {
      console.error('Error fetching LR list:', error);
    }
  };

  const filterLRListByBranch = (branchCode: string) => {
    const filtered = allLrList.filter(
      (lr) => lr.booking_branch === branchCode
    );
    setLrList(filtered.map(({ manual_lr_no, tran_id }) => ({ manual_lr_no, tran_id })));
  };

  const fetchLRData = async (lrNo: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('*')
        .eq('manual_lr_no', lrNo)
        .maybeSingle();

      if (error) throw error;
      setLRData(data);
    } catch (error) {
      console.error('Error fetching LR data:', error);
      alert('Failed to fetch LR data');
    } finally {
      setLoading(false);
    }
  };

  const handleLRSelect = (lrNo: string) => {
    setSelectedLR(lrNo);
    if (lrNo) {
      fetchLRData(lrNo);
    } else {
      setLRData(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.querySelector('.lr-print-content');
    if (!element) return;

    const filename = lrData?.manual_lr_no
      ? `LR_${lrData.manual_lr_no}.pdf`
      : 'lorry_receipt.pdf';

    const opt = {
      margin: [5, 5, 5, 5],
      filename,
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
        orientation: 'landscape',
        compress: true
      },
      pagebreak: {
        mode: 'avoid-all',
        avoid: ['tr', 'td', 'th', 'img', '.page-break-avoid']
      }
    };

    await html2pdf().set(opt).from(element).save();
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '0.00';
    return amount.toFixed(2);
  };

  const filteredLRList = lrList.filter((lr) =>
    lr.manual_lr_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <style>
        {`
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .no-print {
              display: none !important;
            }

            .print-container {
              width: 100%;
              height: auto;
              margin: 0;
              padding: 0;
              page-break-after: always;
              overflow: visible;
            }

            .print-content {
              width: 100%;
              height: auto;
              padding: 8mm;
              box-sizing: border-box;
              font-size: 8pt;
              line-height: 1.3;
            }

            .print-content h1 {
              font-size: 11pt;
              margin-bottom: 2px;
              line-height: 1.2;
            }

            .print-content h3 {
              font-size: 9pt;
              margin-bottom: 3px;
              line-height: 1.2;
            }

            .print-content .text-sm {
              font-size: 7.5pt;
              line-height: 1.3;
            }

            .print-content .text-xs {
              font-size: 7pt;
              line-height: 1.3;
            }

            .print-content .logo-img {
              height: 35px;
              max-height: 35px;
            }

            .print-content .header-section {
              margin-bottom: 6px;
              padding-bottom: 4px;
            }

            .print-content .section-heading {
              font-size: 8.5pt;
              font-weight: 600;
              margin-bottom: 2px;
              padding-bottom: 1px;
              border-bottom: 1px solid #333;
            }

            .print-content .detail-section {
              margin-bottom: 6px;
            }

            .print-content .detail-grid {
              display: grid;
              gap: 4px;
            }

            .print-content .disclaimer-box {
              margin-top: 6px;
              margin-bottom: 6px;
              padding: 6px;
              border: 1px solid #333;
              background-color: #f5f5f5;
            }

            .print-content .disclaimer-text {
              font-size: 6.5pt;
              line-height: 1.3;
            }

            .print-content .signature-section {
              margin-top: 8px;
              padding-top: 6px;
            }

            .print-content .signature-space {
              margin-bottom: 15px;
            }

            .print-content .footer-text {
              margin-top: 4px;
              padding-top: 4px;
              font-size: 6.5pt;
            }

            .print-content p {
              margin: 0;
              padding: 0;
            }
          }
        `}
      </style>
      <div className="bg-white rounded-lg shadow-md p-6 print:hidden no-print">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">LR Print</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Company
            </label>
            <select
              value={selectedCompany?.id || ''}
              onChange={(e) => {
                const company = companies.find((c) => c.id === e.target.value);
                setSelectedCompany(company || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {companies.length === 0 && (
                <option value="">Loading companies...</option>
              )}
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_code} - {company.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Branch
            </label>
            <select
              value={selectedBranch?.id || ''}
              onChange={(e) => {
                const branch = branches.find((b) => b.id === e.target.value);
                setSelectedBranch(branch || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {branches.length === 0 && (
                <option value="">Loading branches...</option>
              )}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_code} - {branch.branch_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search & Select LR Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search LR Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <select
              value={selectedLR}
              onChange={(e) => handleLRSelect(e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              disabled={!selectedBranch}
            >
              <option value="">
                {!selectedBranch ? 'Select a branch first' : 'Select LR Number'}
              </option>
              {filteredLRList.map((lr) => (
                <option key={lr.tran_id} value={lr.manual_lr_no}>
                  {lr.manual_lr_no}
                </option>
              ))}
            </select>
          </div>
        </div>

        {lrData && (
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print LR
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center no-print">
          <div className="text-gray-500">Loading LR data...</div>
        </div>
      )}

      {lrData && selectedCompany && !loading && (
        <div ref={printRef} className="bg-white rounded-lg shadow-md print:shadow-none print:p-0 print-container">
          <div className="lr-print-content" style={{ maxWidth: '297mm', margin: '0 auto', padding: '8mm' }}>
            <div className="border-2 border-gray-800" style={{ padding: '6mm' }}>
              <div className="flex items-start justify-between pb-2 border-b-2 border-gray-300" style={{ marginBottom: '4mm' }}>
                <div style={{ maxWidth: '60%' }}>
                  {selectedCompany.logo_url && (
                    <img
                      src={selectedCompany.logo_url}
                      alt={selectedCompany.company_name}
                      className="object-contain mb-1"
                      style={{ height: '40px' }}
                      crossOrigin="anonymous"
                    />
                  )}
                  <h1 className="font-bold text-gray-900" style={{ fontSize: '14pt', lineHeight: '1.2' }}>
                    {selectedCompany.company_name}
                  </h1>
                  {selectedCompany.company_tagline && (
                    <p className="text-gray-600 italic" style={{ fontSize: '8pt' }}>{selectedCompany.company_tagline}</p>
                  )}
                  <div className="mt-1 text-gray-700" style={{ fontSize: '8pt', lineHeight: '1.4' }}>
                    {selectedCompany.company_address && <p>{selectedCompany.company_address}</p>}
                    <p>
                      {selectedCompany.city && `${selectedCompany.city}`}
                      {selectedCompany.state && `, ${selectedCompany.state}`}
                      {selectedCompany.pin_code && ` - ${selectedCompany.pin_code}`}
                    </p>
                    {selectedCompany.contact_number && <p>Phone: {selectedCompany.contact_number}</p>}
                    {selectedCompany.email && <p>Email: {selectedCompany.email}</p>}
                    {selectedCompany.gstin && <p>GSTIN: {selectedCompany.gstin}</p>}
                    {selectedCompany.branch_master && (
                      <p className="text-gray-500" style={{ fontSize: '7pt' }}>
                        Branch: {selectedCompany.branch_master.branch_code} - {selectedCompany.branch_master.branch_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900" style={{ fontSize: '16pt', marginBottom: '4px' }}>LORRY RECEIPT</div>
                  <div className="font-semibold text-gray-800" style={{ fontSize: '11pt' }}>
                    LR No: {lrData.manual_lr_no}
                  </div>
                  <div className="text-gray-600" style={{ fontSize: '9pt' }}>
                    Date: {formatDate(lrData.lr_date)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '4mm', marginBottom: '3mm' }}>
                <div>
                  <h3 className="font-semibold text-gray-900 border-b border-gray-300" style={{ fontSize: '9pt', paddingBottom: '1px', marginBottom: '2px' }}>
                    Consignor Details
                  </h3>
                  <div style={{ fontSize: '8pt', lineHeight: '1.4' }}>
                    <p className="font-medium">{lrData.consignor || '-'}</p>
                    <p className="text-gray-600">From: {lrData.from_city || '-'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 border-b border-gray-300" style={{ fontSize: '9pt', paddingBottom: '1px', marginBottom: '2px' }}>
                    Consignee Details
                  </h3>
                  <div style={{ fontSize: '8pt', lineHeight: '1.4' }}>
                    <p className="font-medium">{lrData.consignee || '-'}</p>
                    <p className="text-gray-600">To: {lrData.to_city || '-'}</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '3mm' }}>
                <h3 className="font-semibold text-gray-900 border-b border-gray-300" style={{ fontSize: '9pt', paddingBottom: '1px', marginBottom: '2px' }}>
                  Billing Party Details
                </h3>
                <div className="grid grid-cols-2" style={{ gap: '4mm', fontSize: '8pt', lineHeight: '1.4' }}>
                  <div>
                    <p className="font-medium">{lrData.billing_party_name || '-'}</p>
                    <p className="text-gray-600">{lrData.bill_to_address || '-'}</p>
                    <p className="text-gray-600">State: {lrData.bill_to_state || '-'}</p>
                  </div>
                  <div>
                    <p>Party Code: {lrData.billing_party_code || '-'}</p>
                    <p>GSTIN: {lrData.bill_to_gstin || '-'}</p>
                    <p>Payment: {lrData.pay_basis || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '4mm', marginBottom: '3mm' }}>
                <div>
                  <h3 className="font-semibold text-gray-900 border-b border-gray-300" style={{ fontSize: '9pt', paddingBottom: '1px', marginBottom: '2px' }}>
                    Shipment Details
                  </h3>
                  <div className="grid grid-cols-2" style={{ gap: '3mm', fontSize: '8pt', lineHeight: '1.4' }}>
                    <div>
                      <p className="text-gray-600">Vehicle Type</p>
                      <p className="font-medium">{lrData.vehicle_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Vehicle No.</p>
                      <p className="font-medium">{lrData.vehicle_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Driver Name</p>
                      <p className="font-medium">{lrData.driver_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Driver Contact</p>
                      <p className="font-medium">{lrData.driver_number || '-'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 border-b border-gray-300" style={{ fontSize: '9pt', paddingBottom: '1px', marginBottom: '2px' }}>
                    Package & Weight Details
                  </h3>
                  <div className="grid grid-cols-2" style={{ gap: '3mm', fontSize: '8pt', lineHeight: '1.4' }}>
                    <div>
                      <p className="text-gray-600">No. of Packages</p>
                      <p className="font-medium">{lrData.no_of_pkgs || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Actual Weight (KG)</p>
                      <p className="font-medium">{lrData.act_wt || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Charged Weight (KG)</p>
                      <p className="font-medium">{lrData.chrg_wt || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Product</p>
                      <p className="font-medium">{lrData.product || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '4mm', marginBottom: '3mm' }}>
                <div>
                  <h3 className="font-semibold text-gray-900 border-b border-gray-300" style={{ fontSize: '9pt', paddingBottom: '1px', marginBottom: '2px' }}>
                    Invoice & E-Way Bill
                  </h3>
                  <div className="grid grid-cols-2" style={{ gap: '3mm', fontSize: '8pt', lineHeight: '1.4' }}>
                    <div>
                      <p className="text-gray-600">Invoice No.</p>
                      <p className="font-medium">{lrData.invoice_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Invoice Date</p>
                      <p className="font-medium">{formatDate(lrData.invoice_date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Invoice Value</p>
                      <p className="font-medium">₹{formatCurrency(lrData.invoice_value)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">E-Way Bill</p>
                      <p className="font-medium">{lrData.eway_bill_number || '-'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 border-b border-gray-300" style={{ fontSize: '9pt', paddingBottom: '1px', marginBottom: '2px' }}>
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-2" style={{ gap: '3mm', fontSize: '8pt', lineHeight: '1.4' }}>
                    <div>
                      <p className="text-gray-600">Loading Date</p>
                      <p className="font-medium">{formatDate(lrData.loading_date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Est. Delivery Date</p>
                      <p className="font-medium">{formatDate(lrData.est_del_date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Seal No.</p>
                      <p className="font-medium">{lrData.seal_no || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className="font-medium">{lrData.lr_status || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-400 bg-gray-50 page-break-avoid" style={{ padding: '4mm', marginBottom: '3mm' }}>
                <h3 className="font-bold text-gray-900 text-center uppercase" style={{ fontSize: '8pt', marginBottom: '2mm' }}>
                  DISCLAIMER / DECLARATION BY CONSIGNOR
                </h3>
                <div className="text-gray-800 text-justify" style={{ fontSize: '6.5pt', lineHeight: '1.35' }}>
                  <p style={{ marginBottom: '1mm' }}>
                    The Consignor hereby declares and warrants that the consignment covered under this Lorry Receipt does not contain any goods which are prohibited, restricted, hazardous, illegal, contraband, or banned under any applicable law, rule, regulation, or notification in force.
                  </p>
                  <p style={{ marginBottom: '1mm' }}>
                    The Consignor further confirms that the contents of the consignment have been accurately declared, correctly valued, lawfully sourced, and properly packed, marked, labeled, and addressed in a manner suitable for safe handling, transportation, and delivery under normal conditions of carriage.
                  </p>
                  <p style={{ marginBottom: '1mm' }}>
                    The Consignor accepts full responsibility for the accuracy of declarations, compliance with all applicable laws (including tax, customs, and regulatory requirements), and for any consequences arising out of mis-declaration, improper packing, or non-compliance.
                  </p>
                  <p style={{ marginBottom: '1mm' }}>
                    The Carrier / Transporter ({selectedCompany.company_name}) shall have the right to inspect or verify the contents of the consignment at any stage of transportation. Such inspection shall not absolve the Consignor of their statutory or contractual responsibilities.
                  </p>
                  <p style={{ marginBottom: '1mm' }}>
                    By handing over the consignment and accepting this Lorry Receipt, the Consignor unconditionally agrees to and accepts the above terms and conditions.
                  </p>
                  <p className="font-bold text-center uppercase" style={{ marginTop: '2mm' }}>
                    READ, UNDERSTOOD, AND ACCEPTED BY THE CONSIGNOR
                  </p>
                </div>
              </div>

              <div className="border-t-2 border-gray-300 grid grid-cols-3 page-break-avoid" style={{ gap: '6mm', paddingTop: '3mm' }}>
                <div>
                  <p className="text-gray-600" style={{ fontSize: '8pt', marginBottom: '12mm' }}>For {selectedCompany.company_name}</p>
                  <div className="border-t border-gray-400" style={{ paddingTop: '2px' }}>
                    <p className="font-medium" style={{ fontSize: '8pt' }}>Authorized Signatory</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600" style={{ fontSize: '8pt', marginBottom: '12mm' }}>Consignor Signature</p>
                  <div className="border-t border-gray-400" style={{ paddingTop: '2px' }}>
                    <p className="font-medium" style={{ fontSize: '8pt' }}>Signature & Stamp</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600" style={{ fontSize: '8pt', marginBottom: '12mm' }}>Received by Consignee</p>
                  <div className="border-t border-gray-400" style={{ paddingTop: '2px' }}>
                    <p className="font-medium" style={{ fontSize: '8pt' }}>Signature & Stamp</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300 text-gray-500 text-center" style={{ marginTop: '2mm', paddingTop: '2mm', fontSize: '6.5pt' }}>
                <p>This is a computer-generated document and does not require a physical signature.</p>
                <p style={{ marginTop: '1px' }}>
                  For any queries, please contact: {selectedCompany.contact_number || '-'} | {selectedCompany.email || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!lrData && !loading && selectedLR && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center no-print">
          <div className="text-gray-500">No LR data found</div>
        </div>
      )}

      {!selectedLR && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center no-print">
          <div className="text-gray-500">
            {!selectedBranch
              ? 'Please select a branch to view available LR numbers'
              : 'Please select an LR number to view and print'}
          </div>
        </div>
      )}
    </div>
  );
}
