import { useState } from 'react';
import { X, Plus, Trash2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CustomField } from '../../hooks/useCompanyGSTNumbers';

interface CompanyGSTModalProps {
  companyId: string;
  existingEntry?: {
    id: string;
    gst_number: string;
    label: string | null;
    custom_fields: CustomField[];
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompanyGSTModal({ companyId, existingEntry, onClose, onSuccess }: CompanyGSTModalProps) {
  const isEdit = !!existingEntry;
  const [loading, setLoading] = useState(false);
  const [gstNumber, setGstNumber] = useState(existingEntry?.gst_number || '');
  const [label, setLabel] = useState(existingEntry?.label || '');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    existingEntry?.custom_fields || []
  );

  const addCustomField = () => {
    setCustomFields([...customFields, { label: '', value: '' }]);
  };

  const updateCustomField = (index: number, field: 'label' | 'value', value: string) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], [field]: value };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gstNumber.trim()) {
      alert('GST Number is required');
      return;
    }

    const cleanedCustomFields = customFields.filter(
      (f) => f.label.trim() !== '' || f.value.trim() !== ''
    );

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isEdit && existingEntry) {
        const { error } = await supabase
          .from('company_gst_numbers')
          .update({
            gst_number: gstNumber.trim(),
            label: label.trim() || null,
            custom_fields: cleanedCustomFields,
            updated_by: user.id,
          })
          .eq('id', existingEntry.id);

        if (error) throw error;
        alert('GST Number updated successfully!');
      } else {
        const { error } = await supabase
          .from('company_gst_numbers')
          .insert([
            {
              company_id: companyId,
              gst_number: gstNumber.trim(),
              label: label.trim() || null,
              custom_fields: cleanedCustomFields,
              created_by: user.id,
              updated_by: user.id,
            },
          ]);

        if (error) throw error;
        alert('GST Number added successfully!');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving GST number:', error);
      alert(error.message || 'Failed to save GST number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">
              {isEdit ? 'Edit GST Number' : 'Add GST Number'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number *
              </label>
              <input
                type="text"
                required
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="Enter GST Number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label (Optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Maharashtra Office"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                A friendly name to help identify this GST number in dropdowns
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Custom Fields</h3>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-4 h-4" />
                  Add Field
                </button>
              </div>

              {customFields.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No custom fields added. Click "Add Field" to add metadata like State, Branch Name, etc.
                </p>
              ) : (
                <div className="space-y-3">
                  {customFields.map((field, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                        placeholder="Field label (e.g. State)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                        placeholder="Field value (e.g. Maharashtra)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Remove field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Saving...' : isEdit ? 'Update GST Number' : 'Add GST Number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
