import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DocType } from '../lib/database.types';
import { AddDocTypeModal } from '../components/modals/AddDocTypeModal';
import { EditDocTypeModal } from '../components/modals/EditDocTypeModal';
import { useAuth } from '../contexts/AuthContext';

export function DocTypeMaster() {
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [filteredDocTypes, setFilteredDocTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocType | null>(null);
  const { profile } = useAuth();

  const fetchDocTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('doc_types')
        .select('*')
        .order('doc_type', { ascending: true });

      if (error) throw error;
      setDocTypes(data || []);
      setFilteredDocTypes(data || []);
    } catch (error) {
      console.error('Error fetching document types:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocTypes();
  }, []);

  useEffect(() => {
    const filtered = docTypes.filter((docType) =>
      docType.doc_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDocTypes(filtered);
  }, [searchTerm, docTypes]);

  const handleEdit = (docType: DocType) => {
    setSelectedDocType(docType);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (docTypeId: string) => {
    if (!confirm('Are you sure you want to delete this document type?')) return;

    try {
      const { error } = await supabase.from('doc_types').delete().eq('id', docTypeId);
      if (error) throw error;
      alert('Document type deleted successfully!');
      fetchDocTypes();
    } catch (error: any) {
      console.error('Error deleting document type:', error);
      alert(error.message || 'Failed to delete document type');
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <p className="text-gray-600">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doc Type Master</h1>
          <p className="text-gray-600 mt-1">Manage document types</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Doc Type
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by document type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading document types...</div>
          ) : filteredDocTypes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? 'No document types found matching your search' : 'No document types found'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocTypes.map((docType) => (
                  <tr key={docType.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{docType.doc_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(docType.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(docType)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit document type"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(docType.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete document type"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {filteredDocTypes.length} of {docTypes.length} document types
          </div>
        </div>
      </div>

      <AddDocTypeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchDocTypes}
      />

      <EditDocTypeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDocType(null);
        }}
        onSuccess={fetchDocTypes}
        docType={selectedDocType}
      />
    </div>
  );
}
