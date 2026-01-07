import { useState, useEffect, useRef } from 'react';
import { Search, Printer, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  const handleExportPDF = () => {
    window.print();
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
            margin: 0;
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
            }

            .print-container {
              width: 297mm;
              height: 210mm;
              margin: 0;
              padding: 0;
              page-break-after: always;
            }

            .print-content {
              width: 297mm;
              height: 210mm;
              padding: 10mm;
              box-sizing: border-box;
              font-size: 10pt;
            }

            .print-content h1 {
              font-size: 16pt;
            }

            .print-content h3 {
              font-size: 11pt;
            }

            .print-content .text-sm {
              font-size: 9pt;
            }

            .print-content .text-xs {
              font-size: 8pt;
            }

            .print-content .logo-img {
              height: 48px;
            }
          }
        `}
      </style>
      <div className="bg-white rounded-lg shadow-md p-6 print:hidden">
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
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export to PDF
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-500">Loading LR data...</div>
        </div>
      )}

      {lrData && selectedCompany && !loading && (
        <div ref={printRef} className="bg-white rounded-lg shadow-md p-8 print:shadow-none print:p-0 print-container">
          <div className="border-2 border-gray-800 p-6 print:p-3 print:border print-content">
            <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-300 print:mb-2 print:pb-2 print:border-b">
              <div className="flex-1">
                {selectedCompany.logo_url && (
                  <img
                    src={selectedCompany.logo_url}
                    alt={selectedCompany.company_name}
                    className="h-16 object-contain mb-2 print:h-12 print:mb-1 logo-img"
                  />
                )}
                <h1 className="text-2xl font-bold text-gray-900 print:text-lg print:mb-1">
                  {selectedCompany.company_name}
                </h1>
                {selectedCompany.company_tagline && (
                  <p className="text-sm text-gray-600 italic print:text-xs">{selectedCompany.company_tagline}</p>
                )}
                <div className="mt-2 text-sm text-gray-700 print:mt-1 print:text-xs">
                  {selectedCompany.company_address && (
                    <p>{selectedCompany.company_address}</p>
                  )}
                  <p>
                    {selectedCompany.city && `${selectedCompany.city}`}
                    {selectedCompany.state && `, ${selectedCompany.state}`}
                    {selectedCompany.pin_code && ` - ${selectedCompany.pin_code}`}
                  </p>
                  {selectedCompany.contact_number && (
                    <p>Phone: {selectedCompany.contact_number}</p>
                  )}
                  {selectedCompany.email && <p>Email: {selectedCompany.email}</p>}
                  {selectedCompany.gstin && <p>GSTIN: {selectedCompany.gstin}</p>}
                  {selectedCompany.branch_master && (
                    <p className="text-xs text-gray-500 mt-1">
                      Branch: {selectedCompany.branch_master.branch_code} - {selectedCompany.branch_master.branch_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 mb-2 print:text-lg print:mb-1">LORRY RECEIPT</div>
                <div className="text-lg font-semibold text-gray-800 print:text-base">
                  LR No: {lrData.manual_lr_no}
                </div>
                <div className="text-sm text-gray-600 print:text-xs">
                  Date: {formatDate(lrData.lr_date)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4 print:gap-3 print:mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1 print:text-sm print:mb-1 print:pb-0">
                  Consignor Details
                </h3>
                <div className="text-sm space-y-1 print:text-xs print:space-y-0">
                  <p className="font-medium">{lrData.consignor || '-'}</p>
                  <p className="text-gray-600">From: {lrData.from_city || '-'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1 print:text-sm print:mb-1 print:pb-0">
                  Consignee Details
                </h3>
                <div className="text-sm space-y-1 print:text-xs print:space-y-0">
                  <p className="font-medium">{lrData.consignee || '-'}</p>
                  <p className="text-gray-600">To: {lrData.to_city || '-'}</p>
                </div>
              </div>
            </div>

            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1 print:text-sm print:mb-1 print:pb-0">
                Billing Party Details
              </h3>
              <div className="text-sm grid grid-cols-2 gap-4 print:text-xs print:gap-2">
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

            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1 print:text-xs print:mb-1 print:pb-0">
                Shipment Details
              </h3>
              <div className="grid grid-cols-4 gap-4 text-sm print:gap-2 print:text-xs">
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

            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1 print:text-xs print:mb-1 print:pb-0">
                Package & Weight Details
              </h3>
              <div className="grid grid-cols-4 gap-4 text-sm print:gap-2 print:text-xs">
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

            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1 print:text-xs print:mb-1 print:pb-0">
                Invoice & E-Way Bill
              </h3>
              <div className="grid grid-cols-4 gap-4 text-sm print:gap-2 print:text-xs">
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

            <div className="mb-4 print:mb-2">
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-300 pb-1 print:text-xs print:mb-1 print:pb-0">
                Additional Information
              </h3>
              <div className="grid grid-cols-4 gap-4 text-sm print:gap-2 print:text-xs">
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

            <div className="mt-6 mb-6 p-4 border-2 border-gray-400 bg-gray-50 print:mt-3 print:mb-3 print:p-3 print:border">
              <h3 className="font-bold text-gray-900 mb-2 text-center uppercase print:text-sm print:mb-1">
                DISCLAIMER / DECLARATION BY CONSIGNOR
              </h3>
              <div className="text-xs text-gray-800 leading-relaxed text-justify space-y-2 print:text-[8pt] print:space-y-1 print:leading-relaxed">
                <p>
                  The Consignor hereby declares and warrants that the consignment covered under this Lorry Receipt does not contain any goods which are prohibited, restricted, hazardous, illegal, contraband, or banned under any applicable law, rule, regulation, or notification in force, including but not limited to those prescribed by statutory authorities from time to time.
                </p>
                <p>
                  The Consignor further confirms that the contents of the consignment have been accurately declared, correctly valued, lawfully sourced, and properly packed, marked, labeled, and addressed in a manner suitable for safe handling, transportation, and delivery under normal conditions of carriage.
                </p>
                <p>
                  The Consignor accepts full responsibility for the accuracy of declarations, compliance with all applicable laws (including tax, customs, and regulatory requirements), and for any consequences arising out of mis-declaration, improper packing, or non-compliance.
                </p>
                <p>
                  The Carrier / Transporter ({selectedCompany.company_name}) shall have the right, but not the obligation, to inspect or verify the contents of the consignment and/or related documents at any stage of transportation to prevent misuse of its services. Such inspection shall not absolve the Consignor of their statutory or contractual responsibilities.
                </p>
                <p>
                  By handing over the consignment and accepting this Lorry Receipt, the Consignor unconditionally agrees to and accepts the above terms and conditions.
                </p>
                <p className="font-bold text-center mt-3 uppercase">
                  READ, UNDERSTOOD, AND ACCEPTED BY THE CONSIGNOR
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-gray-300 grid grid-cols-3 gap-8 print:mt-4 print:pt-3 print:gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-8 print:text-xs print:mb-6">For {selectedCompany.company_name}</p>
                <div className="border-t border-gray-400 pt-2 print:pt-1">
                  <p className="text-sm font-medium print:text-xs">Authorized Signatory</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-8 print:text-xs print:mb-6">Consignor Signature</p>
                <div className="border-t border-gray-400 pt-2 print:pt-1">
                  <p className="text-sm font-medium print:text-xs">Signature & Stamp</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-8 print:text-xs print:mb-6">Received by Consignee</p>
                <div className="border-t border-gray-400 pt-2 print:pt-1">
                  <p className="text-sm font-medium print:text-xs">Signature & Stamp</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center print:mt-2 print:pt-2 print:text-[8pt]">
              <p>This is a computer-generated document and does not require a physical signature.</p>
              <p className="mt-1">
                For any queries, please contact: {selectedCompany.contact_number || '-'} | {selectedCompany.email || '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!lrData && !loading && selectedLR && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-500">No LR data found</div>
        </div>
      )}

      {!selectedLR && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
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
