import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Edit2, FileText, Warehouse, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { EditLRBillModal } from '../components/modals/EditLRBillModal';
import { EditWarehouseBillModal } from '../components/modals/EditWarehouseBillModal';

interface LRBill {
  bill_id: string;
  lr_bill_number: string;
  lr_bill_date: string;
  lr_bill_due_date: string | null;
  lr_bill_status: string;
  billing_party_name: string;
  billing_party_code: string;
  bill_amount: number;
  bill_type: 'LR';
  tran_id: string;
}

interface WarehouseBill {
  bill_id: string;
  bill_number: string;
  bill_date: string;
  bill_due_date: string | null;
  bill_status: string;
  billing_party_name: string;
  billing_party_code: string;
  total_amount: number;
  bill_type: 'Warehouse';
}

type Bill = LRBill | WarehouseBill;

export default function CustomerBillEdit() {
  const { profile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingLRBill, setEditingLRBill] = useState<{ billId: string; tranId: string } | null>(null);
  const [editingWarehouseBill, setEditingWarehouseBill] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
  }, [profile]);

  const fetchBills = async () => {
    try {
      setLoading(true);

      // Fetch LR Bills (excluding Paid status)
      const lrBillsQuery = supabase
        .from('lr_bill')
        .select(`
          bill_id,
          lr_bill_number,
          lr_bill_date,
          lr_bill_due_date,
          lr_bill_status,
          tran_id,
          billing_party_name,
          billing_party_code,
          bill_amount
        `)
        .neq('lr_bill_status', 'Paid')
        .order('lr_bill_date', { ascending: false });

      // Fetch Warehouse Bills (excluding Paid status)
      const warehouseBillsQuery = supabase
        .from('warehouse_bill')
        .select(`
          bill_id,
          bill_number,
          bill_date,
          bill_due_date,
          bill_status,
          billing_party_name,
          billing_party_code,
          total_amount
        `)
        .neq('bill_status', 'Paid')
        .order('bill_date', { ascending: false });

      const [lrResult, warehouseResult] = await Promise.all([
        lrBillsQuery,
        warehouseBillsQuery,
      ]);

      if (lrResult.error) throw lrResult.error;
      if (warehouseResult.error) throw warehouseResult.error;

      // Transform LR bills
      const lrBills: LRBill[] = (lrResult.data || []).map((bill: any) => ({
        bill_id: bill.bill_id,
        lr_bill_number: bill.lr_bill_number,
        lr_bill_date: bill.lr_bill_date,
        lr_bill_due_date: bill.lr_bill_due_date,
        lr_bill_status: bill.lr_bill_status,
        billing_party_name: bill.billing_party_name || '-',
        billing_party_code: bill.billing_party_code || '-',
        bill_amount: bill.bill_amount || 0,
        bill_type: 'LR',
        tran_id: bill.tran_id,
      }));

      // Transform Warehouse bills
      const warehouseBills: WarehouseBill[] = (warehouseResult.data || []).map((bill: any) => ({
        bill_id: bill.bill_id,
        bill_number: bill.bill_number,
        bill_date: bill.bill_date,
        bill_due_date: bill.bill_due_date,
        bill_status: bill.bill_status,
        billing_party_name: bill.billing_party_name || '-',
        billing_party_code: bill.billing_party_code || '-',
        total_amount: bill.total_amount || 0,
        bill_type: 'Warehouse',
      }));

      // Combine both bill types
      const allBills = [...lrBills, ...warehouseBills];

      // Sort by date (most recent first)
      allBills.sort((a, b) => {
        const dateA = new Date('lr_bill_date' in a ? a.lr_bill_date : a.bill_date);
        const dateB = new Date('lr_bill_date' in b ? b.lr_bill_date : b.bill_date);
        return dateB.getTime() - dateA.getTime();
      });

      setBills(allBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      alert('Error loading bills');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getBillNumber = (bill: Bill) => {
    return bill.bill_type === 'LR' ? (bill as LRBill).lr_bill_number : (bill as WarehouseBill).bill_number;
  };

  const getBillDate = (bill: Bill) => {
    return bill.bill_type === 'LR' ? (bill as LRBill).lr_bill_date : (bill as WarehouseBill).bill_date;
  };

  const getBillDueDate = (bill: Bill) => {
    return bill.bill_type === 'LR' ? (bill as LRBill).lr_bill_due_date : (bill as WarehouseBill).bill_due_date;
  };

  const getBillStatus = (bill: Bill) => {
    return bill.bill_type === 'LR' ? (bill as LRBill).lr_bill_status : (bill as WarehouseBill).bill_status;
  };

  const getBillAmount = (bill: Bill) => {
    return bill.bill_type === 'LR' ? (bill as LRBill).bill_amount : (bill as WarehouseBill).total_amount;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditBill = (bill: Bill) => {
    if (bill.bill_type === 'LR') {
      const lrBill = bill as LRBill;
      setEditingLRBill({ billId: lrBill.bill_id, tranId: lrBill.tran_id });
    } else {
      const warehouseBill = bill as WarehouseBill;
      setEditingWarehouseBill(warehouseBill.bill_id);
    }
  };

  const handleCloseEditModal = () => {
    setEditingLRBill(null);
    setEditingWarehouseBill(null);
  };

  const handleEditSuccess = () => {
    fetchBills();
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      getBillNumber(bill)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billing_party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billing_party_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || getBillStatus(bill)?.toLowerCase() === filterStatus.toLowerCase();

    const matchesType = filterType === 'all' || bill.bill_type.toLowerCase() === filterType.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Bill Edit</h1>
        <p className="text-sm text-gray-600 mt-1">
          Edit and manage customer bills (excluding collected bills)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Bills
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by bill number, customer name, or code..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bill Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="lr">LR Bills</option>
              <option value="warehouse">Warehouse Bills</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bills found matching your criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Code
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBills.map((bill) => (
                  <tr key={bill.bill_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {bill.bill_type === 'LR' ? (
                          <>
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600">LR</span>
                          </>
                        ) : (
                          <>
                            <Warehouse className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Warehouse</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getBillNumber(bill) || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(getBillDate(bill))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(getBillDueDate(bill))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {bill.billing_party_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {bill.billing_party_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(getBillAmount(bill))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          getBillStatus(bill)
                        )}`}
                      >
                        {getBillStatus(bill) || 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleEditBill(bill)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredBills.length} of {bills.length} bills (excluding collected bills)
      </div>

      {editingLRBill && (
        <EditLRBillModal
          billId={editingLRBill.billId}
          tranId={editingLRBill.tranId}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}

      {editingWarehouseBill && (
        <EditWarehouseBillModal
          billId={editingWarehouseBill}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
