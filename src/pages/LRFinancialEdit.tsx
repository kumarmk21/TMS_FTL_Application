import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, DollarSign, Save, X, Calculator } from 'lucide-react';

interface LRFinancial {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  consignor: string;
  consignee: string;
  from_city: string;
  to_city: string;
  no_of_pkgs: number;
  chrg_wt: number;
  billing_party_name: string;
  freight_rate: number;
  freight_amount: number;
  freight_type: string;
  loading_charges: number;
  unloading_charges: number;
  detention_charges: number;
  docket_charges: number;
  penalties_oth_charges: number;
  subtotal: number;
  gst_charge_type: string;
  gst_amount: number;
  lr_total_amount: number;
  bill_to_gstin: string;
}

export default function LRFinancialEdit() {
  const [lrList, setLrList] = useState<LRFinancial[]>([]);
  const [filteredLRs, setFilteredLRs] = useState<LRFinancial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingLR, setEditingLR] = useState<LRFinancial | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [financialData, setFinancialData] = useState({
    freight_type: 'Fixed',
    freight_rate: 0,
    freight_amount: 0,
    loading_charges: 0,
    unloading_charges: 0,
    detention_charges: 0,
    docket_charges: 0,
    penalties_oth_charges: 0,
    subtotal: 0,
    gst_charge_type: 'Under RCM',
    gst_amount: 0,
    lr_total_amount: 0,
  });

  useEffect(() => {
    fetchLRs();
  }, []);

  useEffect(() => {
    filterLRs();
  }, [searchTerm, lrList]);

  useEffect(() => {
    calculateTotals();
  }, [
    financialData.freight_amount,
    financialData.loading_charges,
    financialData.unloading_charges,
    financialData.detention_charges,
    financialData.docket_charges,
    financialData.penalties_oth_charges,
    financialData.gst_charge_type,
  ]);

  const fetchLRs = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_lr')
        .select('*')
        .is('bill_no', null)
        .order('lr_date', { ascending: false });

      if (error) throw error;
      setLrList(data || []);
      setFilteredLRs(data || []);
    } catch (error) {
      console.error('Error fetching LRs:', error);
      alert('Error loading LRs');
    } finally {
      setLoading(false);
    }
  };

  const filterLRs = () => {
    if (!searchTerm.trim()) {
      setFilteredLRs(lrList);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = lrList.filter(
      (lr) =>
        lr.manual_lr_no.toLowerCase().includes(term) ||
        lr.consignor?.toLowerCase().includes(term) ||
        lr.consignee?.toLowerCase().includes(term) ||
        lr.billing_party_name?.toLowerCase().includes(term)
    );
    setFilteredLRs(filtered);
  };

  const calculateTotals = () => {
    const subtotal =
      Number(financialData.freight_amount) +
      Number(financialData.docket_charges) +
      Number(financialData.loading_charges) +
      Number(financialData.unloading_charges) +
      Number(financialData.detention_charges) +
      Number(financialData.penalties_oth_charges);

    let gstAmount = 0;

    if (financialData.gst_charge_type === 'Under RCM') {
      gstAmount = 0;
    } else if (financialData.gst_charge_type === 'Inclusive') {
      gstAmount = (subtotal * 18) / 118;
    } else if (financialData.gst_charge_type === 'Exclusive') {
      gstAmount = (subtotal * 18) / 100;
    }

    const totalAmount = subtotal + gstAmount;

    setFinancialData((prev) => ({
      ...prev,
      subtotal: Math.round(subtotal * 100) / 100,
      gst_amount: Math.round(gstAmount * 100) / 100,
      lr_total_amount: Math.round(totalAmount * 100) / 100,
    }));
  };

  const calculateFreightAmount = () => {
    if (!editingLR) return;

    const rate = Number(financialData.freight_rate);
    const weight = editingLR.chrg_wt || 0;

    let amount = 0;
    if (financialData.freight_type === 'Per KG') {
      amount = rate * weight;
    } else if (financialData.freight_type === 'Fixed') {
      amount = rate;
    }

    setFinancialData((prev) => ({
      ...prev,
      freight_amount: Math.round(amount * 100) / 100,
    }));
  };

  const handleEdit = (lr: LRFinancial) => {
    setEditingLR(lr);
    setFinancialData({
      freight_type: lr.freight_type || 'Fixed',
      freight_rate: lr.freight_rate || 0,
      freight_amount: lr.freight_amount || 0,
      loading_charges: lr.loading_charges || 0,
      unloading_charges: lr.unloading_charges || 0,
      detention_charges: lr.detention_charges || 0,
      docket_charges: lr.docket_charges || 0,
      penalties_oth_charges: lr.penalties_oth_charges || 0,
      subtotal: lr.subtotal || 0,
      gst_charge_type: lr.gst_charge_type || 'Under RCM',
      gst_amount: lr.gst_amount || 0,
      lr_total_amount: lr.lr_total_amount || 0,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editingLR) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('booking_lr')
        .update({
          freight_type: financialData.freight_type,
          freight_rate: financialData.freight_rate,
          freight_amount: financialData.freight_amount,
          loading_charges: financialData.loading_charges,
          unloading_charges: financialData.unloading_charges,
          detention_charges: financialData.detention_charges,
          docket_charges: financialData.docket_charges,
          penalties_oth_charges: financialData.penalties_oth_charges,
          subtotal: financialData.subtotal,
          gst_charge_type: financialData.gst_charge_type,
          gst_amount: financialData.gst_amount,
          lr_total_amount: financialData.lr_total_amount,
          lr_financial_status: 'LR Finalised',
        })
        .eq('tran_id', editingLR.tran_id);

      if (error) throw error;

      alert('Financial details saved successfully!');
      await fetchLRs();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving financial details:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingLR(null);
    setFinancialData({
      freight_type: 'Fixed',
      freight_rate: 0,
      freight_amount: 0,
      loading_charges: 0,
      unloading_charges: 0,
      detention_charges: 0,
      docket_charges: 0,
      penalties_oth_charges: 0,
      subtotal: 0,
      gst_charge_type: 'Under RCM',
      gst_amount: 0,
      lr_total_amount: 0,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-800">LR Financial Edit</h1>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by LR No, Consignor, Consignee, or Billing Party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading LRs...</div>
          </div>
        ) : filteredLRs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No unbilled LRs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LR No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From - To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consignor - Consignee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billing Party
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight (KG)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Freight
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLRs.map((lr) => (
                  <tr key={lr.tran_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lr.manual_lr_no}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(lr.lr_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lr.from_city} - {lr.to_city || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lr.consignor} - {lr.consignee}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lr.billing_party_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {lr.chrg_wt || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(lr.freight_amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(lr.lr_total_amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(lr)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit Financials
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEditModal && editingLR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                Edit Financial Details - {editingLR.manual_lr_no}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">Consignor:</span>
                  <p className="font-medium">{editingLR.consignor}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Consignee:</span>
                  <p className="font-medium">{editingLR.consignee}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Weight:</span>
                  <p className="font-medium">{editingLR.chrg_wt} KG</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Packages:</span>
                  <p className="font-medium">{editingLR.no_of_pkgs}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Freight Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Freight Type *
                    </label>
                    <select
                      value={financialData.freight_type}
                      onChange={(e) =>
                        setFinancialData({ ...financialData, freight_type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Per KG">Per KG</option>
                      <option value="Fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Freight Rate *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={financialData.freight_rate}
                      onChange={(e) =>
                        setFinancialData({ ...financialData, freight_rate: Number(e.target.value) })
                      }
                      onBlur={calculateFreightAmount}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Freight Amount *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={financialData.freight_amount}
                        onChange={(e) =>
                          setFinancialData({
                            ...financialData,
                            freight_amount: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button
                        onClick={calculateFreightAmount}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        title="Calculate"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Additional Charges</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loading Charges
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={financialData.loading_charges}
                      onChange={(e) =>
                        setFinancialData({
                          ...financialData,
                          loading_charges: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unloading Charges
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={financialData.unloading_charges}
                      onChange={(e) =>
                        setFinancialData({
                          ...financialData,
                          unloading_charges: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detention Charges
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={financialData.detention_charges}
                      onChange={(e) =>
                        setFinancialData({
                          ...financialData,
                          detention_charges: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Docket Charges
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={financialData.docket_charges}
                      onChange={(e) =>
                        setFinancialData({
                          ...financialData,
                          docket_charges: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Penalties & Other Charges
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={financialData.penalties_oth_charges}
                      onChange={(e) =>
                        setFinancialData({
                          ...financialData,
                          penalties_oth_charges: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">GST & Total</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Type *
                    </label>
                    <select
                      value={financialData.gst_charge_type}
                      onChange={(e) =>
                        setFinancialData({ ...financialData, gst_charge_type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Under RCM">Under RCM (No GST applicable)</option>
                      <option value="Inclusive">Inclusive (18% included in total)</option>
                      <option value="Exclusive">Exclusive (18% added to total)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatCurrency(financialData.subtotal)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">
                      {financialData.gst_charge_type === 'Under RCM'
                        ? 'GST Amount (Under RCM):'
                        : 'GST Amount (18%):'}
                    </span>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatCurrency(financialData.gst_amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total LR Amount:</span>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialData.lr_total_amount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Financial Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
