import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

type Website = Database['public']['Tables']['websites']['Row'];

interface WooOrder {
  id: number;
  number: string;
  status: string;
  currency: string;
  date_created: string;
  total: string;
  total_tax: string;
  shipping_total: string;
  discount_total: string;
  billing: {
    email: string;
  };
  shipping: {
    country: string;
  };
  line_items: WooLineItem[];
}

interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  sku: string;
  quantity: number;
  price: number;
  subtotal: string;
  total: string;
}

export async function syncOrders(website: Website, daysBack: number = 365) {
  const syncLogId = await createSyncLog(website.id, 'orders');

  try {
    const client = createWooCommerceClient({
      base_url: website.base_url,
      consumer_key: website.consumer_key,
      consumer_secret: website.consumer_secret,
    });

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);

    let page = 1;
    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
      const orders = await client.getOrders({
        page,
        per_page: 50,
        after: afterDate.toISOString(),
      });

      if (!orders || orders.length === 0) {
        hasMore = false;
        break;
      }

      for (const wooOrder of orders) {
        await syncOrder(website.id, wooOrder);
        totalProcessed++;
      }

      page++;
      hasMore = orders.length === 50;

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await completeSyncLog(syncLogId, totalProcessed);

    await supabase
      .from('websites')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('id', website.id);

    return { success: true, processed: totalProcessed };
  } catch (error: any) {
    await failSyncLog(syncLogId, error.message);
    return { success: false, error: error.message };
  }
}

async function syncOrder(websiteId: string, wooOrder: WooOrder) {
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('website_id', websiteId)
    .eq('woo_order_id', wooOrder.id)
    .maybeSingle();

  const orderData = {
    website_id: websiteId,
    woo_order_id: wooOrder.id,
    order_number: wooOrder.number,
    status: wooOrder.status,
    currency: wooOrder.currency,
    country: wooOrder.shipping?.country || null,
    customer_email: wooOrder.billing?.email || null,
    total_amount: parseFloat(wooOrder.total),
    total_tax: parseFloat(wooOrder.total_tax),
    total_shipping: parseFloat(wooOrder.shipping_total),
    total_discount: parseFloat(wooOrder.discount_total),
    order_date: wooOrder.date_created,
    deleted_at: null,
  };

  let orderId: string;

  if (existingOrder) {
    const { data } = await supabase
      .from('orders')
      .update(orderData)
      .eq('id', existingOrder.id)
      .select('id')
      .single();

    orderId = data!.id;

    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);
  } else {
    const { data } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id')
      .single();

    orderId = data!.id;
  }

  for (const lineItem of wooOrder.line_items) {
    await syncOrderItem(websiteId, orderId, lineItem, wooOrder.date_created);
  }
}

async function syncOrderItem(
  websiteId: string,
  orderId: string,
  lineItem: WooLineItem,
  orderDate: string
) {
  let variantId: string | null = null;
  let productId: string | null = null;
  let costSnapshot = 0;

  if (lineItem.variation_id > 0) {
    const { data: variant } = await supabase
      .from('variants')
      .select('id, product_id')
      .eq('website_id', websiteId)
      .eq('woo_variation_id', lineItem.variation_id)
      .maybeSingle();

    if (variant) {
      variantId = variant.id;
      productId = variant.product_id;

      const { data: cost } = await supabase
        .from('costs')
        .select('cost_amount')
        .eq('variant_id', variantId)
        .lte('effective_from', orderDate)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      costSnapshot = cost?.cost_amount || 0;
    }
  } else {
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('website_id', websiteId)
      .eq('woo_product_id', lineItem.product_id)
      .maybeSingle();

    if (product) {
      productId = product.id;

      const { data: variant } = await supabase
        .from('variants')
        .select('id')
        .eq('product_id', productId)
        .is('woo_variation_id', null)
        .maybeSingle();

      if (variant) {
        variantId = variant.id;

        const { data: cost } = await supabase
          .from('costs')
          .select('cost_amount')
          .eq('variant_id', variantId)
          .lte('effective_from', orderDate)
          .order('effective_from', { ascending: false })
          .limit(1)
          .maybeSingle();

        costSnapshot = cost?.cost_amount || 0;
      }
    }
  }

  const subtotal = parseFloat(lineItem.subtotal);
  const total = parseFloat(lineItem.total);
  const netRevenue = total;
  const totalCost = costSnapshot * lineItem.quantity;
  const profit = netRevenue - totalCost;
  const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  await supabase.from('order_items').insert({
    order_id: orderId,
    variant_id: variantId,
    product_id: productId,
    website_id: websiteId,
    woo_item_id: lineItem.id,
    product_name: lineItem.name,
    variant_name: null,
    sku: lineItem.sku || null,
    quantity: lineItem.quantity,
    price_per_item: lineItem.price,
    subtotal,
    total,
    net_revenue: netRevenue,
    cost_snapshot: costSnapshot,
    total_cost: totalCost,
    profit,
    profit_margin: profitMargin,
  });
}

async function createSyncLog(websiteId: string, syncType: string): Promise<string> {
  const { data } = await supabase
    .from('sync_logs')
    .insert({
      website_id: websiteId,
      sync_type: syncType,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  return data!.id;
}

async function completeSyncLog(syncLogId: string, recordsProcessed: number) {
  await supabase
    .from('sync_logs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      records_processed: recordsProcessed,
    })
    .eq('id', syncLogId);
}

async function failSyncLog(syncLogId: string, errorMessage: string) {
  await supabase
    .from('sync_logs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', syncLogId);
}
