export type VtigerModule =
    'calendar'
    | 'leads'
    | 'accounts'
    | 'contacts'
    | 'potentials'
    | 'products'
    | 'documents'
    | 'emails'
    | 'helpdesk'
    | 'faq'
    | 'vendors'
    | 'pricebooks'
    | 'quotes'
    | 'purchaseorder'
    | 'salesorder'
    | 'invoice'
    | 'campaigns'
    | 'events'
    | 'users'
    | 'groups'
    | 'currency'
    | 'documentfolders';


export interface VtigerResponse {
    success: true;
    result: any;
}