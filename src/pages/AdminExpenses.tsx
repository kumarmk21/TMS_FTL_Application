import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AddAdminExpenseModal from '../components/modals/AddAdminExpenseModal';
import EditAdminExpenseModal from '../components/modals/EditAdminExpenseModal';

export interface AdminExpense {
  expense_id: string;
  voucher_number: string | null;
  voucher_date: string;
  account_id: string;
  account_group_id: string | null;
  vendor_id: string;
  amount: number;
  narration: string | null;
  payment_mode: string | null;
  reference_number: string | null;
  is_cancelled: boolean | null;
  branch_id: string | null;
  created_at: string | null;
  accounting_head?: string;
  account_sub_group?: string;
  account_main_group?: string;
  vendor_name?: string;
  branch_name?: string;
}

export interface AccountOption {
  id: string;
  accounting_head: string;
  sub_group: string;
  main_group: string;
}

export interface AccountGroupOption {
  id: string;
  sub_group: string;
  main_group: string;
}

export interface VendorOption {
  id: string;
  vendor_name: string;
  account_no: string | null;
  bank_name: string | null;
  ifsc_code: string | null;
}

export interface BranchOption {
  id: string;
  branch_name: string;
}

export default function AdminExpenses() {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cancelled'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<AdminExpense | null>(null);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountGroups, setAccountGroups] = useState<AccountGroupOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fromDate, toDate, filterStatus]);

  const fetchMasterData = async () => {
    const [accRes, agRes, venRes, brRes] = await Promise.all([
      supabase.from('accounts_master').select('id, accounting_head, sub_group, main_group').eq('active', true).order('accounting_head'),
      supabase.from('account_group_master').select('id, sub_group, main_group').eq('active', true).order('sub_group'),
      supabase.from('vendor_master').select('id, vendor_name, account_no, bank_name, ifsc_code').eq('is_active', true).order('vendor_name'),
      supabase.from('branch_master').select('id, branch_name').eq('is_active', true).order('branch_name'),
    ]);
    if (accRes.data) setAccounts(accRes.data);
    if (agRes.data) setAccountGroups(agRes.data);
    if (venRes.data) setVendors(venRes.data);
    if (brRes.data) setBranches(brRes.data);
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_expenses_transaction')
        .select(`
          expense_id, voucher_number, voucher_date, account_id, account_group_id,
          vendor_id, amount, narration, payment_mode, reference_number,
          is_cancelled, branch_id, created_at
        `)
        .order('voucher_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fromDate) query = query.gte('voucher_date', fromDate);
      if (toDate) query = query.lte('voucher_date', toDate);
      if (filterStatus === 'active') query = query.or('is_cancelled.is.null,is_cancelled.eq.false');
      if (filterStatus === 'cancelled') query = query.eq('is_cancelled', true);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const accMap = new Map(accounts.map(a => [a.id, a]));
        const venMap = new Map(vendors.map(v => [v.id, v.vendor_name]));
        const brMap = new Map(branches.map(b => [b.id, b.branch_name]));

        const enriched = data.map(e => ({
          ...e,
          accounting_head: accMap.get(e.account_id)?.accounting_head || 'Unknown',
          account_sub_group: accMap.get(e.account_id)?.sub_group || '',
          account_main_group: accMap.get(e.account_id)?.main_group || '',
          vendor_name: venMap.get(e.vendor_id) || 'Unknown',
          branch_name: brMap.get(e.branch_id || '') || '-',
        }));
        setExpenses(enriched);
      } else {
        setExpenses([]);
      }
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Cancel this expense entry? This action marks it as cancelled.')) return;
    try {
      const { error } = await supabase
        .from('admin_expenses_transaction')
        .update({ is_cancelled: true })
        .eq('expense_id', expenseId);
      if (error) throw error;
      fetchExpenses();
    } catch (err: any) {
      alert('Failed to cancel expense: ' + err.message);
    }
  };

  const filtered = expenses.filter(e => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (e.voucher_number || '').toLowerCase().includes(s) ||
      (e.accounting_head || '').toLowerCase().includes(s) ||
      (e.vendor_name || '').toLowerCase().includes(s) ||
      (e.payment_mode || '').toLowerCase().includes(s) ||
      (e.narration || '').toLowerCase().includes(s) ||
      (e.reference_number || '').toLowerCase().includes(s)
    );
  });

  const totalAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Expenses</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search voucher, account, vendor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Head</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor / Payee</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500">No expense records found</td>
                </tr>
              ) : (
                filtered.map(expense => (
                  <tr key={expense.expense_id} className={`hover:bg-gray-50 ${expense.is_cancelled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {expense.voucher_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {expense.voucher_date}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {expense.accounting_head}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      <div className="text-xs text-gray-500">{expense.account_main_group}</div>
                      <div>{expense.account_sub_group}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {expense.vendor_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                      ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        expense.payment_mode === 'Cash'
                          ? 'bg-yellow-100 text-yellow-800'
                          : expense.payment_mode === 'Cheque'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {expense.payment_mode || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {expense.reference_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={expense.narration || ''}>
                      {expense.narration || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {expense.is_cancelled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Cancelled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {!expense.is_cancelled && (
                          <>
                            <button
                              onClick={() => { setSelectedExpense(expense); setShowEditModal(true); }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(expense.expense_id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Cancel"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filtered.length}</span> records
            </p>
            <p className="text-sm font-semibold text-gray-900">
              Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddAdminExpenseModal
          accounts={accounts}
          accountGroups={accountGroups}
          vendors={vendors}
          branches={branches}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchExpenses(); }}
        />
      )}

      {showEditModal && selectedExpense && (
        <EditAdminExpenseModal
          expense={selectedExpense}
          accounts={accounts}
          accountGroups={accountGroups}
          vendors={vendors}
          branches={branches}
          onClose={() => { setShowEditModal(false); setSelectedExpense(null); }}
          onSuccess={() => { setShowEditModal(false); setSelectedExpense(null); fetchExpenses(); }}
        />
      )}
    </div>
  );
}
