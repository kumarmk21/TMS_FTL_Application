import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { AccountOption, AccountGroupOption, VendorOption, BranchOption } from '../../pages/AdminExpenses';

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'NEFT', 'RTGS', 'UPI'];

interface Props {
  accounts: AccountOption[];
  accountGroups: AccountGroupOption[];
  vendors: VendorOption[];
  branches: BranchOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAdminExpenseModal({ accounts, accountGroups, vendors, branches, onClose, onSuccess }: Props) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    voucher_number: '',
    voucher_date: new Date().toISOString().split('T')[0],
    account_id: '',
    account_group_id: '',
    vendor_id: '',
    amount: '',
    payment_mode: 'Bank Transfer',
    reference_number: '',
    narration: '',
    branch_id: '',
  });

  useEffect(() => {
    if (form.account_id) {
      const acc = accounts.find(a => a.id === form.account_id);
      if (acc) {
        const group = accountGroups.find(
          g => g.sub_group === acc.sub_group && g.main_group === acc.main_group
        );
        setForm(prev => ({ ...prev, account_group_id: group?.id || '' }));
      }
    }
  }, [form.account_id]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_id || !form.vendor_id || !form.amount || !form.voucher_date) {
      alert('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('admin_expenses_transaction').insert({
        voucher_number: form.voucher_number || null,
        voucher_date: form.voucher_date,
        account_id: form.account_id,
        account_group_id: form.account_group_id || null,
        vendor_id: form.vendor_id,
        amount: parseFloat(form.amount),
        payment_mode: form.payment_mode || null,
        reference_number: form.reference_number || null,
        narration: form.narration || null,
        branch_id: form.branch_id || null,
        created_by: profile?.id,
        is_cancelled: false,
      });
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === form.account_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Admin Expense</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Number</label>
              <input
                type="text"
                value={form.voucher_number}
                onChange={e => handleChange('voucher_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Auto / Manual"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.voucher_date}
                onChange={e => handleChange('voucher_date', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Head <span className="text-red-500">*</span></label>
              <select
                value={form.account_id}
                onChange={e => handleChange('account_id', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Account</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.accounting_head}</option>
                ))}
              </select>
              {selectedAccount && (
                <p className="mt-1 text-xs text-gray-500">{selectedAccount.main_group} &rarr; {selectedAccount.sub_group}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Group</label>
              <select
                value={form.account_group_id}
                onChange={e => handleChange('account_group_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
              >
                <option value="">Auto from Account</option>
                {accountGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.main_group} - {g.sub_group}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / Payee <span className="text-red-500">*</span></label>
            <select
              value={form.vendor_id}
              onChange={e => handleChange('vendor_id', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.vendor_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={form.amount}
                onChange={e => handleChange('amount', e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
              <select
                value={form.payment_mode}
                onChange={e => handleChange('payment_mode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
              <input
                type="text"
                value={form.reference_number}
                onChange={e => handleChange('reference_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Cheque / Transaction No"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={form.branch_id}
                onChange={e => handleChange('branch_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Narration</label>
            <textarea
              value={form.narration}
              onChange={e => handleChange('narration', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Description / remarks"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
