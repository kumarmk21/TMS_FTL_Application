import { X, AlertCircle, Loader2, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

export interface PushToZohoItem {
  thc_id: string;
  thc_number: string;
  thc_id_number: string;
  vendor_name: string;
  thc_gross_amount: number;
}

interface PushResultDetail {
  thc_id: string;
  thc_number: string;
  vendor_name: string;
  amount: number;
  zoho_bill_id?: string;
  zoho_bill_number?: string;
  status: string;
  detail?: string;
}

interface PushResult {
  total: number;
  pushed: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  details: PushResultDetail[];
}

interface PushToZohoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: PushToZohoItem[];
  onPushComplete?: () => void;
}

export function PushToZohoConfirmModal({
  isOpen,
  onClose,
  selectedItems,
  onPushComplete,
}: PushToZohoConfirmModalProps) {
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  if (!isOpen) return null;

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + (item.thc_gross_amount || 0),
    0,
  );

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-api`;

  const handleConfirm = async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch(`${apiUrl}?action=push-purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          thc_ids: selectedItems.map((i) => i.thc_id),
          dry_run: false,
        }),
      });
      const data: PushResult = await res.json();
      if (!res.ok || (data as any).error) {
        throw new Error((data as any).error || `Push failed (${res.status})`);
      }
      setPushResult(data);
      if (onPushComplete) {
        setTimeout(() => {
          onPushComplete();
        }, 100);
      }
    } catch (error: any) {
      console.error('[Zoho Push] Error:', error);
      alert(error.message || 'Failed to push to Zoho Books');
    } finally {
      setPushing(false);
    }
  };

  const handleClose = () => {
    setPushResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Push to Zoho Books
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={pushing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!pushResult && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Confirm Zoho Books Push
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    You are about to push{' '}
                    <span className="font-semibold">
                      {selectedItems.length}
                    </span>{' '}
                    THC record(s) as purchases to Zoho Books. Total gross amount:{' '}
                    <span className="font-semibold">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        THC Number
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        THC ID
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedItems.map((item) => (
                      <tr key={item.thc_id}>
                        <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">
                          {item.thc_number || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">
                          {item.thc_id_number || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">
                          {item.vendor_name || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-medium">
                          ₹{(item.thc_gross_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleClose}
                  disabled={pushing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={pushing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {pushing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Pushing...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      Confirm Push
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {pushResult && (
            <>
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{pushResult.total}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">{pushResult.pushed}</p>
                  <p className="text-xs text-green-600 mt-0.5">Pushed</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-700">{pushResult.skipped}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Skipped</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-700">{pushResult.errors}</p>
                  <p className="text-xs text-red-600 mt-0.5">Errors</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">THC No.</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Zoho Bill</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pushResult.details.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700 font-mono text-xs">{d.thc_number || '-'}</td>
                          <td className="px-4 py-2 text-gray-900">{d.vendor_name || '-'}</td>
                          <td className="px-4 py-2 text-right text-gray-700 font-medium">
                            ₹{(d.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-gray-500 font-mono text-xs">{d.zoho_bill_number || d.zoho_bill_id || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center gap-1 text-xs ${
                              d.status === 'pushed' ? 'text-green-700' :
                              d.status.startsWith('skipped') ? 'text-amber-700' :
                              'text-red-700'
                            }`}>
                              {d.status === 'pushed' && <CheckCircle className="w-3 h-3" />}
                              {d.status.startsWith('skipped') && <AlertCircle className="w-3 h-3" />}
                              {d.status.includes('error') && <XCircle className="w-3 h-3" />}
                              {d.status}
                            </span>
                            {d.detail && (
                              <p className="text-xs text-gray-400 mt-0.5">{d.detail}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
