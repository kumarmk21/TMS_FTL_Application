import { useState, useEffect } from 'react';
import { X, Upload, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddCompanyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string | null;
}

interface City {
  id: string;
  city_name: string;
  state_master?: {
    state_name: string;
  };
}

export function AddCompanyModal({ onClose, onSuccess }: AddCompanyModalProps) {
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    company_tagline: '',
    company_address: '',
    branch_id: '',
    city_id: '',
    pin_code: '',
    cin: '',
    gstin: '',
    contact_number: '',
    email: '',
    website: '',
    msme_no: '',
    pan: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    bank_branch: '',
    bill_footer1: '',
    bill_footer2: '',
    bill_footer3: '',
    bill_footer4: '',
  });

  useEffect(() => {
    fetchBranches();
    fetchCities();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_master')
        .select('id, branch_name, branch_code')
        .eq('is_active', true)
        .order('branch_name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('city_master')
        .select(`
          id,
          city_name,
          state_master:state_id (state_name)
        `)
        .order('city_name');

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleCityChange = (cityId: string) => {
    setFormData({ ...formData, city_id: cityId });
    const city = cities.find(c => c.id === cityId);
    setSelectedCity(city || null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (companyCode: string): Promise<string | null> => {
    if (!logoFile) return null;

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `logos/${companyCode}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      throw new Error('Failed to upload logo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: companyCodeData, error: codeError } = await supabase
        .rpc('generate_company_code');

      if (codeError) throw codeError;

      const companyCode = companyCodeData;

      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadLogo(companyCode);
      }

      const { error } = await supabase.from('company_master').insert([
        {
          company_code: companyCode,
          company_name: formData.company_name,
          company_tagline: formData.company_tagline || null,
          company_address: formData.company_address,
          branch_id: formData.branch_id || null,
          city_id: formData.city_id || null,
          pin_code: formData.pin_code || null,
          cin: formData.cin || null,
          gstin: formData.gstin || null,
          contact_number: formData.contact_number || null,
          email: formData.email || null,
          website: formData.website || null,
          logo_url: logoUrl,
          msme_no: formData.msme_no || null,
          pan: formData.pan,
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          ifsc_code: formData.ifsc_code,
          bank_branch: formData.bank_branch,
          bill_footer1: formData.bill_footer1 || null,
          bill_footer2: formData.bill_footer2 || null,
          bill_footer3: formData.bill_footer3 || null,
          bill_footer4: formData.bill_footer4 || null,
          created_by: user.id,
          updated_by: user.id,
        },
      ]);

      if (error) throw error;

      alert('Company added successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error adding company:', error);
      alert(error.message || 'Failed to add company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Add Company</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 object-contain border rounded"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-100 border rounded flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {logoFile ? logoFile.name : 'Upload Logo (Max 5MB)'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Tagline
              </label>
              <input
                type="text"
                value={formData.company_tagline}
                onChange={(e) =>
                  setFormData({ ...formData, company_tagline: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Address *
              </label>
              <textarea
                required
                value={formData.company_address}
                onChange={(e) =>
                  setFormData({ ...formData, company_address: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch
              </label>
              <select
                value={formData.branch_id}
                onChange={(e) =>
                  setFormData({ ...formData, branch_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name} {branch.branch_code ? `(${branch.branch_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <select
                value={formData.city_id}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.city_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State (Auto-filled)
              </label>
              <input
                type="text"
                value={selectedCity?.state_master?.state_name || ''}
                readOnly
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pin Code
              </label>
              <input
                type="text"
                pattern="[0-9]{6}"
                maxLength={6}
                value={formData.pin_code}
                onChange={(e) =>
                  setFormData({ ...formData, pin_code: e.target.value })
                }
                placeholder="6 digits"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CIN
              </label>
              <input
                type="text"
                value={formData.cin}
                onChange={(e) =>
                  setFormData({ ...formData, cin: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GSTIN
              </label>
              <input
                type="text"
                maxLength={15}
                minLength={15}
                value={formData.gstin}
                onChange={(e) =>
                  setFormData({ ...formData, gstin: e.target.value })
                }
                placeholder="15 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number
              </label>
              <input
                type="text"
                pattern="[0-9]{10}"
                maxLength={10}
                value={formData.contact_number}
                onChange={(e) =>
                  setFormData({ ...formData, contact_number: e.target.value })
                }
                placeholder="10 digits"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2 mt-4 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Tax & Registration Details</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PAN *
              </label>
              <input
                type="text"
                required
                maxLength={10}
                minLength={10}
                value={formData.pan}
                onChange={(e) =>
                  setFormData({ ...formData, pan: e.target.value.toUpperCase() })
                }
                placeholder="10 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MSME No
              </label>
              <input
                type="text"
                value={formData.msme_no}
                onChange={(e) =>
                  setFormData({ ...formData, msme_no: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2 mt-4 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Details</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name *
              </label>
              <input
                type="text"
                required
                value={formData.bank_name}
                onChange={(e) =>
                  setFormData({ ...formData, bank_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number *
              </label>
              <input
                type="text"
                required
                value={formData.account_number}
                onChange={(e) =>
                  setFormData({ ...formData, account_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IFSC Code *
              </label>
              <input
                type="text"
                required
                maxLength={11}
                minLength={11}
                value={formData.ifsc_code}
                onChange={(e) =>
                  setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })
                }
                placeholder="11 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Branch *
              </label>
              <input
                type="text"
                required
                value={formData.bank_branch}
                onChange={(e) =>
                  setFormData({ ...formData, bank_branch: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2 mt-4 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Bill Footer Text (Optional)</h3>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Footer 1
              </label>
              <input
                type="text"
                value={formData.bill_footer1}
                onChange={(e) =>
                  setFormData({ ...formData, bill_footer1: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Footer 2
              </label>
              <input
                type="text"
                value={formData.bill_footer2}
                onChange={(e) =>
                  setFormData({ ...formData, bill_footer2: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Footer 3
              </label>
              <input
                type="text"
                value={formData.bill_footer3}
                onChange={(e) =>
                  setFormData({ ...formData, bill_footer3: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Footer 4
              </label>
              <input
                type="text"
                value={formData.bill_footer4}
                onChange={(e) =>
                  setFormData({ ...formData, bill_footer4: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
              {loading ? 'Adding...' : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
