import { X, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { useState } from 'react';

export interface PushToZohoItem {
  thc_id: string;
  thc_number: string;
  thc_id_number: string;
  vendor_name: string;
  thc_gross_amount: number;
}

interface PushToZohoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: PushToZohoItem[];
}

export function PushToZohoConfirmModal({
  isOpen,
  onClose,
  selectedItems,
}: PushToZohoConfirmModalProps) {
  const [pushing, setPushing] = useState(false);

  if (!isOpen) return null;

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + (item.thc_gross_amount || 0),
    0,
  );

  const handleConfirm = async () => {
    setPushing(true);
    // Placeholder for future Zoho Books Purchases push flow
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('[Zoho Push] Selected THC IDs:', selectedItems.map((i) => i.thc_id));
    setPushing(false);
    alert(
      `Push initiated for ${selectedItems.length} THC record(s) — Zoho Books integration coming soon.`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Push to Zoho Books
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={pushing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
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
              onClick={onClose}
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
        </div>
      </div>
    </div>
  );
}
