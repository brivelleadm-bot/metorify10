import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

type Website = Database['public']['Tables']['websites']['Row'];

interface WooProduct {
  id: number;
  name: string;
  sku: string;
  type: string;
  status: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
}

interface WooVariation {
  id: number;
  sku: string;
  attributes: any[];
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
}

export async function syncProducts(website: Website) {
  const syncLogId = await createSyncLog(website.id, 'products');

  try {
    const client = createWooCommerceClient({
      base_url: website.base_url,
      consumer_key: website.consumer_key,
      consumer_secret: website.consumer_secret,
    });

    let page = 1;
    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
      const products = await client.getProducts({
        page,
        per_page: 50,
      });

      if (!products || products.length === 0) {
        hasMore = false;
        break;
      }

      for (const wooProduct of products) {
        await syncProduct(website.id, wooProduct);
        totalProcessed++;
      }

      page++;
      hasMore = products.length === 50;

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await completeSyncLog(syncLogId, totalProcessed);

    await supabase
      .from('websites')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', website.id);

    return { success: true, processed: totalProcessed };
  } catch (error: any) {
    await failSyncLog(syncLogId, error.message);
    return { success: false, error: error.message };
  }
}

async function syncProduct(websiteId: string, wooProduct: WooProduct) {
  const { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .eq('website_id', websiteId)
    .eq('woo_product_id', wooProduct.id)
    .maybeSingle();

  const productData = {
    website_id: websiteId,
    woo_product_id: wooProduct.id,
    name: wooProduct.name,
    sku: wooProduct.sku || null,
    type: wooProduct.type,
    status: wooProduct.status,
    deleted_at: null,
  };

  let productId: string;

  if (existingProduct) {
    const { data } = await supabase
      .from('products')
      .update(productData)
      .eq('id', existingProduct.id)
      .select('id')
      .single();

    productId = data!.id;
  } else {
    const { data } = await supabase
      .from('products')
      .insert(productData)
      .select('id')
      .single();

    productId = data!.id;
  }

  if (wooProduct.type === 'simple') {
    await syncSimpleProductVariant(websiteId, productId, wooProduct);
  } else if (wooProduct.type === 'variable') {
    await syncVariableProduct(websiteId, productId, wooProduct.id);
  }
}

async function syncSimpleProductVariant(
  websiteId: string,
  productId: string,
  wooProduct: WooProduct
) {
  const { data: existingVariant } = await supabase
    .from('variants')
    .select('id')
    .eq('product_id', productId)
    .is('woo_variation_id', null)
    .maybeSingle();

  const variantData = {
    product_id: productId,
    website_id: websiteId,
    woo_variation_id: null,
    sku: wooProduct.sku || null,
    attributes: {},
    price_regular: parseFloat(wooProduct.regular_price) || 0,
    price_sale: wooProduct.sale_price ? parseFloat(wooProduct.sale_price) : null,
    sale_date_from: wooProduct.date_on_sale_from,
    sale_date_to: wooProduct.date_on_sale_to,
    deleted_at: null,
  };

  if (existingVariant) {
    await supabase
      .from('variants')
      .update(variantData)
      .eq('id', existingVariant.id);
  } else {
    await supabase
      .from('variants')
      .insert(variantData);
  }
}

async function syncVariableProduct(
  websiteId: string,
  productId: string,
  wooProductId: number
) {
  const client = createWooCommerceClient({
    base_url: '',
    consumer_key: '',
    consumer_secret: '',
  });

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const variations = await client.getProductVariations(wooProductId, {
      page,
      per_page: 50,
    });

    if (!variations || variations.length === 0) {
      break;
    }

    for (const variation of variations) {
      await syncVariation(websiteId, productId, variation);
    }

    page++;
    hasMore = variations.length === 50;
  }
}

async function syncVariation(
  websiteId: string,
  productId: string,
  wooVariation: WooVariation
) {
  const { data: existingVariant } = await supabase
    .from('variants')
    .select('id')
    .eq('product_id', productId)
    .eq('woo_variation_id', wooVariation.id)
    .maybeSingle();

  const attributes: Record<string, string> = {};
  wooVariation.attributes.forEach((attr: any) => {
    attributes[attr.name] = attr.option;
  });

  const variantData = {
    product_id: productId,
    website_id: websiteId,
    woo_variation_id: wooVariation.id,
    sku: wooVariation.sku || null,
    attributes,
    price_regular: parseFloat(wooVariation.regular_price) || 0,
    price_sale: wooVariation.sale_price ? parseFloat(wooVariation.sale_price) : null,
    sale_date_from: wooVariation.date_on_sale_from,
    sale_date_to: wooVariation.date_on_sale_to,
    deleted_at: null,
  };

  if (existingVariant) {
    await supabase
      .from('variants')
      .update(variantData)
      .eq('id', existingVariant.id);
  } else {
    await supabase
      .from('variants')
      .insert(variantData);
  }
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
