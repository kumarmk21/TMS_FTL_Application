import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EditStatusModalProps {
  status: {
    id: string;
    status_type: string;
    status_name: string;
  };
  onClose: () => void;
}

interface DocType {
  id: string;
  doc_type: string;
}

export default function EditStatusModal({ status, onClose }: EditStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [formData, setFormData] = useState({
    status_name: status.status_name,
    status_type: status.status_type,
  });

  useEffect(() => {
    fetchDocTypes();
  }, []);

  const fetchDocTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('doc_types')
        .select('id, doc_type')
        .order('doc_type');

      if (error) throw error;
      setDocTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching document types:', error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('status_master')
        .update({
          status_name: formData.status_name,
          status_type: formData.status_type,
        })
        .eq('id', status.id);

      if (error) throw error;

      onClose();
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Status</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.status_type}
              onChange={(e) =>
                setFormData({ ...formData, status_type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Select document type</option>
              {docTypes.map((docType) => (
                <option key={docType.id} value={docType.id}>
                  {docType.doc_type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.status_name}
              onChange={(e) =>
                setFormData({ ...formData, status_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter status name"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
