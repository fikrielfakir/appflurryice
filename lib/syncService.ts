import { supabase, Database } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Product = Database['public']['Tables']['products']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'];
type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];

const STORAGE_KEYS = {
  PRODUCTS: '@bizpos_products',
  CONTACTS: '@bizpos_contacts',
  SALES: '@bizpos_sales',
  SALE_ITEMS: '@bizpos_sale_items',
  LAST_SYNC: '@bizpos_last_sync',
  LAST_SYNC_PRODUCTS: '@bizpos_last_sync_products',
  LAST_SYNC_CONTACTS: '@bizpos_last_sync_contacts',
  LAST_SYNC_SALES: '@bizpos_last_sync_sales',
};

export interface SyncResult {
  success: boolean;
  error?: string;
  syncedAt?: string;
  count?: number;
  message?: string;
}

export interface SyncProgress {
  stage: 'products' | 'contacts' | 'sales' | 'sale_items' | 'complete';
  progress: number;
  message: string;
}

class SyncService {
  private isSyncing = false;
  private onProgressCallback?: (progress: SyncProgress) => void;

  /**
   * Set a callback to receive sync progress updates
   */
  setProgressCallback(callback: (progress: SyncProgress) => void) {
    this.onProgressCallback = callback;
  }

  private emitProgress(stage: SyncProgress['stage'], progress: number, message: string) {
    if (this.onProgressCallback) {
      this.onProgressCallback({ stage, progress, message });
    }
  }

  /**
   * Pull products from Supabase and update local storage
   * Uses incremental sync based on last sync timestamp
   */
  async pullProducts(): Promise<SyncResult> {
    try {
      this.emitProgress('products', 0, 'Fetching products from server...');

      // Get last sync time for incremental updates
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_PRODUCTS);
      
      let query = supabase
        .from('products')
        .select('*')
        .order('updated_at', { ascending: false });

      // Only fetch updated products if we have a last sync time
      if (lastSync) {
        query = query.gte('updated_at', lastSync);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase products fetch error:', error);
        throw new Error(`Failed to fetch products: ${error.message}`);
      }

      this.emitProgress('products', 50, `Processing ${data?.length || 0} products...`);

      if (!data || data.length === 0) {
        this.emitProgress('products', 100, 'No new products to sync');
        return { 
          success: true, 
          syncedAt: new Date().toISOString(),
          count: 0,
          message: 'No new products' 
        };
      }

      // Get existing products from local storage
      const existingProductsJson = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const existingProducts = existingProductsJson ? JSON.parse(existingProductsJson) : [];
      const productMap = new Map(existingProducts.map((p: any) => [String(p.id), p]));

      // Format and merge products
      const formattedProducts = data.map(p => ({
        id: String(p.id),
        name: p.name,
        sku: p.sku,
        price: Number(p.price),
        category: p.category || 'General',
        unit: p.unit || 'pcs',
        image: p.image_url || null,
        // Don't set stock here - it will be preserved from local storage
        active: true,
        updatedAt: p.updated_at,
      }));

      // Merge: update existing products and add new ones, ALWAYS preserving local stock
      formattedProducts.forEach(product => {
        const existing = productMap.get(product.id);
        // Always preserve the local stock value - server doesn't manage stock
        if (existing && existing.stock !== undefined) {
          // Update product info but keep the local stock
          productMap.set(product.id, { ...product, stock: existing.stock });
        } else {
          // New product - initialize with 0 stock
          productMap.set(product.id, { ...product, stock: 0 });
        }
      });

      const mergedProducts = Array.from(productMap.values());

      // Save to local storage
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(mergedProducts));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_PRODUCTS, new Date().toISOString());

      this.emitProgress('products', 100, `Synced ${data.length} products`);

      return { 
        success: true, 
        syncedAt: new Date().toISOString(),
        count: data.length,
        message: `${data.length} products synced successfully`
      };
    } catch (error: any) {
      console.error('Pull products error:', error);
      return { 
        success: false, 
        error: error.message,
        message: `Failed to sync products: ${error.message}`
      };
    }
  }

  /**
   * Pull contacts from Supabase and update local storage
   */
  async pullContacts(): Promise<SyncResult> {
    try {
      this.emitProgress('contacts', 0, 'Fetching contacts from server...');

      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_CONTACTS);
      
      let query = supabase
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (lastSync) {
        query = query.gte('updated_at', lastSync);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase contacts fetch error:', error);
        throw new Error(`Failed to fetch contacts: ${error.message}`);
      }

      this.emitProgress('contacts', 50, `Processing ${data?.length || 0} contacts...`);

      if (!data || data.length === 0) {
        this.emitProgress('contacts', 100, 'No new contacts to sync');
        return { 
          success: true, 
          syncedAt: new Date().toISOString(),
          count: 0,
          message: 'No new contacts'
        };
      }

      // Get existing contacts
      const existingContactsJson = await AsyncStorage.getItem(STORAGE_KEYS.CONTACTS);
      const existingContacts = existingContactsJson ? JSON.parse(existingContactsJson) : [];
      const contactMap = new Map(existingContacts.map((c: any) => [String(c.id), c]));

      // Format and merge contacts
      const formattedContacts = data.map(c => ({
        id: String(c.id),
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        balance: Number(c.balance || 0),
        type: c.type || 'customer',
        updatedAt: c.updated_at,
      }));

      formattedContacts.forEach(contact => {
        contactMap.set(contact.id, contact);
      });

      const mergedContacts = Array.from(contactMap.values());

      await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(mergedContacts));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_CONTACTS, new Date().toISOString());

      this.emitProgress('contacts', 100, `Synced ${data.length} contacts`);

      return { 
        success: true, 
        syncedAt: new Date().toISOString(),
        count: data.length,
        message: `${data.length} contacts synced successfully`
      };
    } catch (error: any) {
      console.error('Pull contacts error:', error);
      return { 
        success: false, 
        error: error.message,
        message: `Failed to sync contacts: ${error.message}`
      };
    }
  }

  /**
   * Pull sales from Supabase and update local storage
   */
  async pullSales(): Promise<SyncResult> {
    try {
      this.emitProgress('sales', 0, 'Fetching sales from server...');

      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_SALES);
      
      let query = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (lastSync) {
        query = query.gte('created_at', lastSync);
      }

      const { data: salesData, error: salesError } = await query;

      if (salesError) {
        console.error('Supabase sales fetch error:', salesError);
        throw new Error(`Failed to fetch sales: ${salesError.message}`);
      }

      this.emitProgress('sales', 30, `Processing ${salesData?.length || 0} sales...`);

      if (!salesData || salesData.length === 0) {
        this.emitProgress('sales', 100, 'No new sales to sync');
        return { 
          success: true, 
          syncedAt: new Date().toISOString(),
          count: 0,
          message: 'No new sales'
        };
      }

      // Fetch sale items for these sales
      this.emitProgress('sale_items', 50, 'Fetching sale items...');
      
      const saleIds = salesData.map(s => s.id);
      const { data: saleItemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .in('sale_id', saleIds);

      if (itemsError) {
        console.error('Sale items fetch error:', itemsError);
        // Continue without items if they fail
      }

      this.emitProgress('sales', 70, 'Merging sales data...');

      // Get existing sales
      const existingSalesJson = await AsyncStorage.getItem(STORAGE_KEYS.SALES);
      const existingSales = existingSalesJson ? JSON.parse(existingSalesJson) : [];
      const salesMap = new Map(existingSales.map((s: any) => [String(s.id), s]));

      // Get products to enrich sale items with product names
      const productsJson = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const products = productsJson ? JSON.parse(productsJson) : [];
      const productMap = new Map(products.map((p: any) => [String(p.id), p]));

      // Format and merge sales
      const formattedSales = salesData.map((s) => {
        const items = (saleItemsData || [])
          .filter((si) => String(si.sale_id) === String(s.id))
          .map((i) => {
            const product = productMap.get(String(i.product_id));
            return {
              id: String(i.product_id || i.id),
              name: product?.name || 'Product',
              qty: i.quantity,
              price: Number(i.unit_price),
            };
          });

        return {
          id: String(s.id),
          invoiceNumber: String(s.id).slice(-8).toUpperCase(),
          customerName: 'Customer', // You can fetch from contacts if contact_id exists
          customerPhone: '',
          amount: Number(s.total_amount),
          paid: Number(s.total_amount),
          discount: 0,
          shippingFee: 0,
          status: (s.status || 'completed') as 'paid' | 'partial' | 'due',
          paymentMethod: s.payment_method || 'cash',
          date: s.created_at,
          items,
        };
      });

      formattedSales.forEach(sale => {
        salesMap.set(sale.id, sale);
      });

      const mergedSales = Array.from(salesMap.values());

      await AsyncStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(mergedSales));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_SALES, new Date().toISOString());

      this.emitProgress('sales', 100, `Synced ${salesData.length} sales`);

      return { 
        success: true, 
        syncedAt: new Date().toISOString(),
        count: salesData.length,
        message: `${salesData.length} sales synced successfully`
      };
    } catch (error: any) {
      console.error('Pull sales error:', error);
      return { 
        success: false, 
        error: error.message,
        message: `Failed to sync sales: ${error.message}`
      };
    }
  }

  /**
   * Full sync: Pull all data from Supabase
   */
  async pullAll(): Promise<{
    products: SyncResult;
    contacts: SyncResult;
    sales: SyncResult;
    overall: SyncResult;
  }> {
    if (this.isSyncing) {
      const inProgressResult = { success: false, error: 'Sync already in progress' };
      return {
        products: inProgressResult,
        contacts: inProgressResult,
        sales: inProgressResult,
        overall: inProgressResult,
      };
    }

    this.isSyncing = true;

    try {
      console.log('🔄 Starting full pull sync from Supabase...');

      const productsResult = await this.pullProducts();
      const contactsResult = await this.pullContacts();
      const salesResult = await this.pullSales();

      const allSuccess = productsResult.success && contactsResult.success && salesResult.success;
      const totalCount = (productsResult.count || 0) + (contactsResult.count || 0) + (salesResult.count || 0);

      if (allSuccess) {
        const now = new Date().toISOString();
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
        this.emitProgress('complete', 100, 'Sync completed successfully');
      }

      const overallResult: SyncResult = {
        success: allSuccess,
        syncedAt: new Date().toISOString(),
        count: totalCount,
        message: allSuccess 
          ? `Synced ${totalCount} total items successfully` 
          : 'Some items failed to sync',
        error: allSuccess ? undefined : 'Check individual sync results for errors',
      };

      console.log('✅ Full pull sync completed:', {
        products: productsResult.count,
        contacts: contactsResult.count,
        sales: salesResult.count,
        total: totalCount,
      });

      return {
        products: productsResult,
        contacts: contactsResult,
        sales: salesResult,
        overall: overallResult,
      };
    } catch (error: any) {
      console.error('❌ Pull sync failed:', error);
      const errorResult: SyncResult = {
        success: false,
        error: error.message,
        message: `Sync failed: ${error.message}`,
      };
      return {
        products: errorResult,
        contacts: errorResult,
        sales: errorResult,
        overall: errorResult,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Force full refresh: Clear local data and pull everything
   */
  async forceFullSync(): Promise<{
    products: SyncResult;
    contacts: SyncResult;
    sales: SyncResult;
    overall: SyncResult;
  }> {
    console.log('🔄 Starting FORCE FULL sync (clearing local data)...');
    
    // Clear last sync times to force full download
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.LAST_SYNC_PRODUCTS,
      STORAGE_KEYS.LAST_SYNC_CONTACTS,
      STORAGE_KEYS.LAST_SYNC_SALES,
    ]);

    return this.pullAll();
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  }

  /**
   * Get individual sync times
   */
  async getSyncTimes(): Promise<{
    products: string | null;
    contacts: string | null;
    sales: string | null;
    overall: string | null;
  }> {
    const [products, contacts, sales, overall] = await AsyncStorage.multiGet([
      STORAGE_KEYS.LAST_SYNC_PRODUCTS,
      STORAGE_KEYS.LAST_SYNC_CONTACTS,
      STORAGE_KEYS.LAST_SYNC_SALES,
      STORAGE_KEYS.LAST_SYNC,
    ]);

    return {
      products: products[1],
      contacts: contacts[1],
      sales: sales[1],
      overall: overall[1],
    };
  }

  /**
   * Clear all sync data
   */
  async clearSyncData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PRODUCTS,
      STORAGE_KEYS.CONTACTS,
      STORAGE_KEYS.SALES,
      STORAGE_KEYS.SALE_ITEMS,
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.LAST_SYNC_PRODUCTS,
      STORAGE_KEYS.LAST_SYNC_CONTACTS,
      STORAGE_KEYS.LAST_SYNC_SALES,
    ]);
  }

  /**
   * Get sync status
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();