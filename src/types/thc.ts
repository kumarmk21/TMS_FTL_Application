export type ZohoSyncStatus = 'not_synced' | 'synced' | 'failed';

export interface THCZohoFields {
  zoho_books_id: string | null;
  zoho_sync_status: ZohoSyncStatus;
  zoho_synced_at: string | null;
}

export interface VendorOption {
  id: string;
  vendor_name: string;
  vendor_code: string;
}

export interface LRRecord {
  tran_id: string;
  manual_lr_no: string;
  lr_date: string;
  from_city: string;
  to_city: string;
  billing_party_name: string;
  vehicle_number: string;
  vehicle_type: string;
  pay_basis: string;
  thc_no: string | null;
  thc_id?: string | null;
  zoho_sync_status?: ZohoSyncStatus;
  vendor_name?: string | null;
}

export interface THCFilterState {
  fromDate: string;
  toDate: string;
  vendorId: string;
  lrNumber: string;
  thcNumber: string;
}

export const EMPTY_FILTERS: THCFilterState = {
  fromDate: '',
  toDate: '',
  vendorId: '',
  lrNumber: '',
  thcNumber: '',
};
