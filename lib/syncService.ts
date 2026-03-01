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
  LAST_SYNC: '@bizpos_last_sync',
};

export interface SyncResult {
  success: boolean;
  error?: string;
  syncedAt?: string;
}

class SyncService {
  private isSyncing = false;

  async syncProducts(localProducts: any[]): Promise<SyncResult> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedProducts = data.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          category: p.category || 'General',
          stock: p.stock_quantity,
          unit: p.unit,
          image: p.image_url,
          updatedAt: p.updated_at,
        }));

        await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(formattedProducts));
      }

      return { success: true, syncedAt: new Date().toISOString() };
    } catch (error: any) {
      console.error('Sync products error:', error);
      return { success: false, error: error.message };
    }
  }

  async pushProduct(product: any): Promise<SyncResult> {
    try {
      const { error } = await supabase
        .from('products')
        .upsert({
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          category: product.category,
          stock_quantity: product.stock,
          unit: product.unit,
          image_url: product.image,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'sku' });

      if (error) throw error;

      return { success: true, syncedAt: new Date().toISOString() };
    } catch (error: any) {
      console.error('Push product error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContacts(localContacts: any[]): Promise<SyncResult> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedContacts = data.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          balance: c.balance,
          type: c.type,
          updatedAt: c.updated_at,
        }));

        await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(formattedContacts));
      }

      return { success: true, syncedAt: new Date().toISOString() };
    } catch (error: any) {
      console.error('Sync contacts error:', error);
      return { success: false, error: error.message };
    }
  }

  async pushContact(contact: any): Promise<SyncResult> {
    try {
      const { error } = await supabase
        .from('contacts')
        .upsert({
          id: contact.id,
          name: contact.name,
          phone: contact.phone || null,
          email: contact.email || null,
          address: contact.address || null,
          balance: contact.balance || 0,
          type: contact.type || 'customer',
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true, syncedAt: new Date().toISOString() };
    } catch (error: any) {
      console.error('Push contact error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncSales(localSales: any[]): Promise<SyncResult> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const { data: saleItemsData } = await supabase
          .from('sale_items')
          .select('*');

        const formattedSales = await Promise.all(
          data.map(async (s) => {
            const items = saleItemsData?.filter((si) => si.sale_id === s.id) || [];
            return {
              id: s.id,
              invoiceNumber: s.id.slice(0, 8).toUpperCase(),
              customerName: 'Customer',
              customerPhone: '',
              amount: s.total_amount,
              paid: s.total_amount,
              discount: 0,
              shippingFee: 0,
              status: s.status as 'paid' | 'partial' | 'due',
              paymentMethod: s.payment_method,
              date: s.created_at,
              items: items.map((i) => ({
                id: i.product_id || i.id,
                name: 'Product',
                qty: i.quantity,
                price: i.unit_price,
              })),
            };
          })
        );

        await AsyncStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(formattedSales));
      }

      return { success: true, syncedAt: new Date().toISOString() };
    } catch (error: any) {
      console.error('Sync sales error:', error);
      return { success: false, error: error.message };
    }
  }

  async pushSale(sale: any): Promise<SyncResult> {
    try {
      const saleData = {
        id: sale.id,
        contact_id: null,
        total_amount: sale.amount,
        payment_method: sale.paymentMethod || 'cash',
        status: sale.status || 'completed',
        created_at: sale.date || new Date().toISOString(),
      };

      const { data: saleResult, error: saleError } = await supabase
        .from('sales')
        .upsert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      if (sale.items && sale.items.length > 0) {
        const saleItemsData = sale.items.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          sale_id: sale.id,
          product_id: item.id,
          quantity: item.qty,
          unit_price: item.price,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .upsert(saleItemsData);

        if (itemsError) throw itemsError;
      }

      return { success: true, syncedAt: new Date().toISOString() };
    } catch (error: any) {
      console.error('Push sale error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncAll(products: any[], contacts: any[], sales: any[]): Promise<{
    products: SyncResult;
    contacts: SyncResult;
    sales: SyncResult;
  }> {
    if (this.isSyncing) {
      return {
        products: { success: false, error: 'Sync already in progress' },
        contacts: { success: false, error: 'Sync already in progress' },
        sales: { success: false, error: 'Sync already in progress' },
      };
    }

    this.isSyncing = true;

    try {
      const [productsResult, contactsResult, salesResult] = await Promise.all([
        this.syncProducts(products),
        this.syncContacts(contacts),
        this.syncSales(sales),
      ]);

      const now = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);

      return {
        products: productsResult,
        contacts: contactsResult,
        sales: salesResult,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  async getLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  }

  async clearSyncData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PRODUCTS,
      STORAGE_KEYS.CONTACTS,
      STORAGE_KEYS.SALES,
      STORAGE_KEYS.LAST_SYNC,
    ]);
  }
}

export const syncService = new SyncService();
