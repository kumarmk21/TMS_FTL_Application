import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Plus, X, Calculator } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UniqueCustomer {
  customer_code: string;
  customer_name: string;
}

interface CustomerGST {
  id: string;
  customer_code: string;
  customer_name: string;
  gstin: string;
  bill_to_address: string;
  state_master?: {
    state_name: string;
  };
}

interface SACCode {
  sac_id: string;
  sac_code: string;
  sac_description: string;
}

interface Company {
  id: string;
  company_code: string;
  company_name: string;
  branch_id: string;
  gstin: string;
}

interface CustomerRate {
  sac_code: string | null;
  sac_description: string | null;
  service_type: string | null;
  service_type_rate: number;
  gst_charge_type: string | null;
  gst_percentage: number;
}

export default function GenerateWarehouseBill() {
  const { user } = useAuth();
  const [uniqueCustomers, setUniqueCustomers] = useState<UniqueCustomer[]>([]);
  const [allCustomerGSTs, setAllCustomerGSTs] = useState<CustomerGST[]>([]);
  const [customerGSTs, setCustomerGSTs] = useState<CustomerGST[]>([]);
  const [sacCodes, setSACCodes] = useState<SACCode[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customerRates, setCustomerRates] = useState<CustomerRate[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    bill_date: new Date().toISOString().split('T')[0],
    bill_sub_date: '',
    bill_sub_type: '',
    bill_sub_details: '',
    billing_party_id: '',
    billing_party_code: '',
    billing_party_name: '',
    bill_to_gstin: '',
    bill_to_state: '',
    bill_to_address: '',
    bill_generation_branch: '',
    credit_days: 0,
    bill_due_date: '',
    service_type: '',
    sac_code: '',
    sac_description: '',
    warehouse_charges: 0,
    other_charges: 0,
    sub_total: 0,
    gst_charge_type: 'IGST',
    gst_percentage: 18,
    igst_amount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    total_amount: 0,
    bill_status: 'Draft',
    tds_applicable: false,
    tds_amount: 0,
    remarks: ''
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    calculateAmounts();
  }, [formData.warehouse_charges, formData.other_charges, formData.gst_percentage, formData.bill_to_state]);

  useEffect(() => {
    if (formData.bill_sub_date && formData.credit_days) {
      const subDate = new Date(formData.bill_sub_date);
      subDate.setDate(subDate.getDate() + formData.credit_days);
      setFormData(prev => ({
        ...prev,
        bill_due_date: subDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.bill_sub_date, formData.credit_days]);

  const fetchMasterData = async () => {
    try {
      const [customerGSTData, sacCodesData, companiesData] = await Promise.all([
        supabase.from('customer_gst_master').select('*, state_master(state_name)').eq('is_active', true).order('customer_name'),
        supabase.from('sac_code_master').select('*').eq('is_active', true).order('sac_code'),
        supabase.from('company_master').select('*').order('company_name')
      ]);

      if (customerGSTData.error) throw customerGSTData.error;
      if (sacCodesData.error) throw sacCodesData.error;
      if (companiesData.error) throw companiesData.error;

      const gstData = customerGSTData.data || [];
      setAllCustomerGSTs(gstData);

      const uniqueCustomersMap = new Map<string, UniqueCustomer>();
      gstData.forEach(gst => {
        if (!uniqueCustomersMap.has(gst.customer_code)) {
          uniqueCustomersMap.set(gst.customer_code, {
            customer_code: gst.customer_code,
            customer_name: gst.customer_name
          });
        }
      });
      setUniqueCustomers(Array.from(uniqueCustomersMap.values()));

      setSACCodes(sacCodesData.data || []);
      setCompanies(companiesData.data || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
      alert('Error loading master data');
    }
  };

  const handleCustomerChange = async (customerCode: string) => {
    const customer = uniqueCustomers.find(c => c.customer_code === customerCode);
    if (!customer) return;

    const customerGSTRecords = allCustomerGSTs.filter(gst => gst.customer_code === customerCode);

    const { data: customerMasterData } = await supabase
      .from('customer_master')
      .select('customer_id, credit_days')
      .eq('customer_id', customerCode)
      .maybeSingle();

    const { data: customerRatesData } = await supabase
      .from('customer_rate_master')
      .select('sac_code, sac_description, service_type, service_type_rate, gst_charge_type, gst_percentage')
      .eq('customer_id', customerCode)
      .eq('is_active', true);

    setCustomerRates(customerRatesData || []);

    setFormData(prev => ({
      ...prev,
      billing_party_id: customerCode,
      billing_party_code: customer.customer_code,
      billing_party_name: customer.customer_name,
      credit_days: customerMasterData?.credit_days || 0,
      service_type: '',
      sac_code: '',
      sac_description: '',
      warehouse_charges: 0,
      gst_charge_type: 'IGST',
      gst_percentage: 18,
      bill_to_gstin: '',
      bill_to_state: '',
      bill_to_address: ''
    }));

    setCustomerGSTs(customerGSTRecords);

    if (customerGSTRecords.length === 1) {
      const singleGST = customerGSTRecords[0];
      setFormData(prev => ({
        ...prev,
        bill_to_gstin: singleGST.gstin,
        bill_to_state: singleGST.state_master?.state_name || '',
        bill_to_address: singleGST.bill_to_address || ''
      }));
    }
  };

  const handleGSTChange = (gstin: string) => {
    const gst = customerGSTs.find(g => g.gstin === gstin);
    if (!gst) return;

    setFormData(prev => ({
      ...prev,
      bill_to_gstin: gstin,
      bill_to_state: gst.state_master?.state_name || '',
      bill_to_address: gst.bill_to_address || ''
    }));
  };

  const handleServiceTypeChange = (serviceType: string) => {
    const rate = customerRates.find(r => r.service_type === serviceType);
    if (!rate) return;

    setFormData(prev => ({
      ...prev,
      service_type: serviceType,
      sac_code: rate.sac_code || '',
      sac_description: rate.sac_description || '',
      warehouse_charges: rate.service_type_rate || 0,
      gst_charge_type: rate.gst_charge_type || 'IGST',
      gst_percentage: rate.gst_percentage || 18
    }));
  };

  const calculateAmounts = () => {
    const subTotal = (formData.warehouse_charges || 0) + (formData.other_charges || 0);
    const gstPercent = formData.gst_percentage || 0;

    const selectedCompany = companies.find(c => c.id === formData.bill_generation_branch);
    const companyGSTState = selectedCompany?.gstin?.substring(0, 2);
    const customerGSTState = formData.bill_to_gstin?.substring(0, 2);
    const isInterstate = companyGSTState !== customerGSTState;

    let igst = 0, cgst = 0, sgst = 0;

    if (isInterstate) {
      igst = (subTotal * gstPercent) / 100;
    } else {
      cgst = (subTotal * gstPercent) / 200;
      sgst = (subTotal * gstPercent) / 200;
    }

    const totalAmount = subTotal + igst + cgst + sgst;

    setFormData(prev => ({
      ...prev,
      sub_total: subTotal,
      igst_amount: igst,
      cgst_amount: cgst,
      sgst_amount: sgst,
      total_amount: totalAmount
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.billing_party_id) {
      alert('Please select a customer');
      return;
    }

    if (!formData.bill_generation_branch) {
      alert('Please select bill generation branch');
      return;
    }

    if (!formData.service_type) {
      alert('Please select service type');
      return;
    }

    if (formData.warehouse_charges <= 0 && formData.other_charges <= 0) {
      alert('Please enter warehouse charges or other charges');
      return;
    }

    setLoading(true);

    try {
      const { data: billNumberData, error: billNumberError } = await supabase
        .rpc('generate_warehouse_bill_number');

      if (billNumberError) throw billNumberError;

      const billNumber = billNumberData;

      const { error: insertError } = await supabase
        .from('warehouse_bill')
        .insert([{
          bill_number: billNumber,
          bill_date: formData.bill_date,
          bill_sub_date: formData.bill_sub_date || null,
          bill_sub_type: formData.bill_sub_type || null,
          bill_sub_details: formData.bill_sub_details || null,
          credit_days: formData.credit_days,
          bill_due_date: formData.bill_due_date,
          bill_generation_branch: formData.bill_generation_branch,
          billing_party_code: formData.billing_party_code,
          billing_party_name: formData.billing_party_name,
          billing_party_id: formData.billing_party_id,
          bill_to_state: formData.bill_to_state,
          bill_to_gstin: formData.bill_to_gstin,
          bill_to_address: formData.bill_to_address,
          service_type: formData.service_type || null,
          sac_code: formData.sac_code,
          sac_description: formData.sac_description,
          warehouse_charges: formData.warehouse_charges,
          other_charges: formData.other_charges,
          sub_total: formData.sub_total,
          gst_charge_type: formData.gst_charge_type || null,
          gst_percentage: formData.gst_percentage,
          igst_amount: formData.igst_amount,
          cgst_amount: formData.cgst_amount,
          sgst_amount: formData.sgst_amount,
          total_amount: formData.total_amount,
          bill_status: formData.bill_status,
          tds_applicable: formData.tds_applicable,
          tds_amount: formData.tds_amount,
          remarks: formData.remarks,
          created_by: user?.id
        }]);

      if (insertError) throw insertError;

      alert(`Warehouse bill generated successfully!\nBill Number: ${billNumber}`);
      resetForm();
    } catch (error) {
      console.error('Error generating warehouse bill:', error);
      alert('Error generating warehouse bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bill_date: new Date().toISOString().split('T')[0],
      bill_sub_date: '',
      bill_sub_type: '',
      bill_sub_details: '',
      billing_party_id: '',
      billing_party_code: '',
      billing_party_name: '',
      bill_to_gstin: '',
      bill_to_state: '',
      bill_to_address: '',
      bill_generation_branch: '',
      credit_days: 0,
      bill_due_date: '',
      service_type: '',
      sac_code: '',
      sac_description: '',
      warehouse_charges: 0,
      other_charges: 0,
      sub_total: 0,
      gst_charge_type: 'IGST',
      gst_percentage: 18,
      igst_amount: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      total_amount: 0,
      bill_status: 'Draft',
      tds_applicable: false,
      tds_amount: 0,
      remarks: ''
    });
    setCustomerGSTs([]);
    setCustomerRates([]);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Generate Warehouse Bill</h1>
        <p className="text-gray-600 mt-1">Create warehouse service billing</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bill Date *
            </label>
            <input
              type="date"
              value={formData.bill_date}
              onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bill Generation Branch *
            </label>
            <select
              value={formData.bill_generation_branch}
              onChange={(e) => setFormData({ ...formData, bill_generation_branch: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Branch</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.company_name} ({company.company_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bill Status
            </label>
            <select
              value={formData.bill_status}
              onChange={(e) => setFormData({ ...formData, bill_status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer *
              </label>
              <select
                value={formData.billing_party_code}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Customer</option>
                {uniqueCustomers.map(customer => (
                  <option key={customer.customer_code} value={customer.customer_code}>
                    {customer.customer_name} ({customer.customer_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer GSTIN
              </label>
              <select
                value={formData.bill_to_gstin}
                onChange={(e) => handleGSTChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.billing_party_id}
              >
                <option value="">Select GSTIN</option>
                {customerGSTs.map(gst => (
                  <option key={gst.id} value={gst.gstin}>
                    {gst.gstin} - {gst.state_master?.state_name || 'Unknown State'}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Address
              </label>
              <textarea
                value={formData.bill_to_address}
                onChange={(e) => setFormData({ ...formData, bill_to_address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type *
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => handleServiceTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.billing_party_id}
                required
              >
                <option value="">Select Service Type</option>
                {customerRates.map((rate, index) => (
                  <option key={index} value={rate.service_type || ''}>
                    {rate.service_type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SAC Code
              </label>
              <input
                type="text"
                value={formData.sac_code}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SAC Description
              </label>
              <input
                type="text"
                value={formData.sac_description}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Charges & Tax Calculation</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse Charges
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.warehouse_charges}
                onChange={(e) => setFormData({ ...formData, warehouse_charges: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Charges
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.other_charges}
                onChange={(e) => setFormData({ ...formData, other_charges: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub Total
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sub_total.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Charge Type
              </label>
              <input
                type="text"
                value={formData.gst_charge_type}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST %
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.gst_percentage}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IGST Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.igst_amount.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CGST Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cgst_amount.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SGST Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sgst_amount.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total_amount.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-semibold text-lg"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center pt-2">
              <input
                type="checkbox"
                checked={formData.tds_applicable}
                onChange={(e) => setFormData({ ...formData, tds_applicable: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                TDS Applicable
              </label>
            </div>

            {formData.tds_applicable && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TDS Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tds_amount}
                  onChange={(e) => setFormData({ ...formData, tds_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Submission Date
              </label>
              <input
                type="date"
                value={formData.bill_sub_date}
                onChange={(e) => setFormData({ ...formData, bill_sub_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Submission Type
              </label>
              <select
                value={formData.bill_sub_type}
                onChange={(e) => setFormData({ ...formData, bill_sub_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                <option value="Email">Email</option>
                <option value="Hand Delivery">Hand Delivery</option>
                <option value="Courier">Courier</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Portal">Portal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Submission Details
              </label>
              <input
                type="text"
                value={formData.bill_sub_details}
                onChange={(e) => setFormData({ ...formData, bill_sub_details: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Email sent to finance@customer.com"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes or remarks"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credit Days
              </label>
              <input
                type="number"
                value={formData.credit_days}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date (Submission Date + Credit Days)
              </label>
              <input
                type="date"
                value={formData.bill_due_date}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Bill'}
          </button>
        </div>
      </form>
    </div>
  );
}
