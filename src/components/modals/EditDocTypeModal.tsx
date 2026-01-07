import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DocType } from '../../lib/database.types';

interface EditDocTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  docType: DocType | null;
}

export function EditDocTypeModal({ isOpen, onClose, onSuccess, docType }: EditDocTypeModalProps) {
  const [loading, setLoading] = useState(false);
  const [docTypeName, setDocTypeName] = useState('');

  useEffect(() => {
    if (docType) {
      setDocTypeName(docType.doc_type);
    }
  }, [docType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docType) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('doc_types')
        .update({
          doc_type: docTypeName.trim(),
        })
        .eq('id', docType.id);

      if (error) throw error;

      alert('Document type updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating document type:', error);
      alert(error.message || 'Failed to update document type');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !docType) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Document Type</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={docTypeName}
              onChange={(e) => setDocTypeName(e.target.value)}
              required
              placeholder="e.g., Invoice, Purchase Order, Delivery Challan"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500 mt-1">Enter a descriptive name for the document type</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Doc Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
