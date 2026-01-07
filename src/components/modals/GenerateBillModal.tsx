import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Building2, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Company {
  id: string;
  company_name: string;
  branch_id: string;
  branch_name?: string;
}

interface CustomerGST {
  id: string;
  customer_code: string;
  gstin: string;
  state_name: string;
  billing_address: string;
}

interface LRData {
  tran_id: string;
  billing_party_code: string;
  billing_party_name: string;
  freight_amount: number;
  manual_lr_no: string;
  lr_date: string;
  from_city: string;
  to_city: string;
  vehicle_type: string;
  chrg_wt: number;
  lr_total_amount: number;
}

interface GenerateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLRs: LRData[];
  onBillGenerated: () => void;
}

export default function GenerateBillModal({
  isOpen,
  onClose,
  selectedLRs,
  onBillGenerated,
}: GenerateBillModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customerGSTOptions, setCustomerGSTOptions] = useState<CustomerGST[]>([]);
  const [formData, setFormData] = useState({
    bill_generation_branch: '',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    credit_days: 0,
    bill_due_date: '',
    bill_to_state: '',
    bill_to_gstin: '',
    bill_to_address: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      generateBillNumber();
      if (selectedLRs.length > 0) {
        fetchCustomerDetails();
      }
    }
  }, [isOpen, selectedLRs]);

  useEffect(() => {
    calculateBillDueDate();
  }, [formData.bill_date, formData.credit_days]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('company_master')
        .select('id, company_name, branch_id, branch_master(branch_name)')
        .order('company_name');

      if (error) throw error;

      const formattedData = data?.map(company => ({
        id: company.id,
        company_name: company.company_name,
        branch_id: company.branch_id,
        branch_name: (company.branch_master as any)?.branch_name || '',
      })) || [];

      setCompanies(formattedData);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchCustomerDetails = async () => {
    if (selectedLRs.length === 0) return;

    const billingPartyCode = selectedLRs[0].billing_party_code;
    const billingPartyName = selectedLRs[0].billing_party_name;

    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customer_master')
        .select('credit_days')
        .eq('customer_id', billingPartyCode)
        .maybeSingle();

      if (customerError) throw customerError;

      const { data: gstData, error: gstError } = await supabase
        .from('customer_gst_master')
        .select('id, customer_code, gstin, bill_to_address, state_id, state_master(state_name)')
        .eq('customer_name', billingPartyName);

      if (gstError) throw gstError;

      const formattedGSTData = gstData?.map(gst => ({
        id: gst.id,
        customer_code: gst.customer_code,
        gstin: gst.gstin || '',
        state_name: (gst.state_master as any)?.state_name || '',
        billing_address: gst.bill_to_address || '',
      })) || [];

      setCustomerGSTOptions(formattedGSTData);

      setFormData((prev) => ({
        ...prev,
        credit_days: customerData?.credit_days || 0,
      }));
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  const generateBillNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('lr_bill')
        .select('lr_bill_number')
        .not('lr_bill_number', 'is', null)
        .order('lr_bill_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      let nextNumber = 29100001;
      if (data?.lr_bill_number) {
        const currentNumber = parseInt(data.lr_bill_number);
        if (!isNaN(currentNumber) && currentNumber >= 29100001) {
          nextNumber = currentNumber + 1;
        }
      }

      setFormData((prev) => ({
        ...prev,
        bill_number: nextNumber.toString(),
      }));
    } catch (error) {
      console.error('Error generating bill number:', error);
      setFormData((prev) => ({
        ...prev,
        bill_number: '29100001',
      }));
    }
  };

  const calculateBillDueDate = () => {
    if (formData.bill_date && formData.credit_days >= 0) {
      const billDate = new Date(formData.bill_date);
      billDate.setDate(billDate.getDate() + formData.credit_days);
      setFormData((prev) => ({
        ...prev,
        bill_due_date: billDate.toISOString().split('T')[0],
      }));
    }
  };

  const calculateSubTotal = () => {
    return selectedLRs.reduce((sum, lr) => sum + (lr.freight_amount || 0), 0);
  };

  const handleGSTChange = (gstId: string) => {
    const selectedGST = customerGSTOptions.find((gst) => gst.id === gstId);
    if (selectedGST) {
      setFormData((prev) => ({
        ...prev,
        bill_to_state: selectedGST.state_name || '',
        bill_to_gstin: selectedGST.gstin || '',
        bill_to_address: selectedGST.billing_address || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bill_generation_branch) {
      alert('Please select bill generation branch');
      return;
    }

    if (!formData.bill_to_gstin) {
      alert('Please select bill to state/GSTIN');
      return;
    }

    setLoading(true);
    try {
      const subTotal = calculateSubTotal();
      const billAmount = subTotal;

      const billRecord = {
        lr_bill_number: formData.bill_number,
        lr_bill_date: formData.bill_date,
        lr_bill_due_date: formData.bill_due_date,
        bill_generation_branch: formData.bill_generation_branch,
        billing_party_code: selectedLRs[0].billing_party_code,
        billing_party_name: selectedLRs[0].billing_party_name,
        bill_to_state: formData.bill_to_state,
        bill_to_gstin: formData.bill_to_gstin,
        bill_to_address: formData.bill_to_address,
        credit_days: formData.credit_days,
        sub_total: subTotal,
        bill_amount: billAmount,
        lr_bill_status: 'Generated',
        created_by: user?.id,
      };

      const { data: billData, error: billError } = await supabase
        .from('lr_bill')
        .insert([billRecord])
        .select()
        .single();

      if (billError) throw billError;

      for (const lr of selectedLRs) {
        const { error: lrError } = await supabase
          .from('booking_lr')
          .update({
            bill_no: formData.bill_number,
            bill_date: formData.bill_date,
            bill_due_date: formData.bill_due_date,
            bill_amount: billAmount,
            lr_financial_status: 'Bill Generated',
          })
          .eq('tran_id', lr.tran_id);

        if (lrError) throw lrError;
      }

      alert(
        `Bill ${formData.bill_number} generated successfully!\nTotal Amount: ₹${billAmount.toFixed(2)}`
      );
      onBillGenerated();
      onClose();
    } catch (error) {
      console.error('Error generating bill:', error);
      alert('Error generating bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Generate Customer Bill</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Generation Branch *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <select
                  required
                  value={formData.bill_generation_branch}
                  onChange={(e) =>
                    setFormData({ ...formData, bill_generation_branch: e.target.value })
                  }
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Branch</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.branch_id}>
                      {company.branch_name ? `${company.branch_name} - ${company.company_name}` : company.company_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Number
              </label>
              <input
                type="text"
                value={formData.bill_number}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  required
                  value={formData.bill_date}
                  onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credit Days
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={formData.credit_days}
                  readOnly
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Due Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={formData.bill_due_date}
                  readOnly
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill To State *
              </label>
              <select
                required
                onChange={(e) => handleGSTChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select State/GSTIN</option>
                {customerGSTOptions.map((gst) => (
                  <option key={gst.id} value={gst.id}>
                    {gst.state_name} - {gst.gstin}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill To Address
              </label>
              <textarea
                value={formData.bill_to_address}
                readOnly
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected LRs ({selectedLRs.length})
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          LR No
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          LR Date
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          From - To
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vehicle Type
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Weight
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedLRs.map((lr) => (
                        <tr key={lr.tran_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {lr.manual_lr_no}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                            {new Date(lr.lr_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {lr.from_city} - {lr.to_city}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {lr.vehicle_type || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                            {lr.chrg_wt || 0} kg
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                            ₹{(lr.lr_total_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-700">
                  Total Sub Total (Freight):
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  ₹{calculateSubTotal().toFixed(2)}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Based on {selectedLRs.length} selected LR(s)
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Generating Bill...' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
