import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { syncProducts } from '@/lib/sync/product-sync';
import { syncOrders } from '@/lib/sync/order-sync';

export async function POST(
  request: NextRequest,
  { params }: { params: { websiteId: string } }
) {
  try {
    const { data: website, error } = await supabase
      .from('websites')
      .select('*')
      .eq('id', params.websiteId)
      .single();

    if (error || !website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    const productsResult = await syncProducts(website);

    if (!productsResult.success) {
      return NextResponse.json(
        { success: false, error: productsResult.error },
        { status: 500 }
      );
    }

    const ordersResult = await syncOrders(website);

    if (!ordersResult.success) {
      return NextResponse.json(
        { success: false, error: ordersResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      productsProcessed: productsResult.processed,
      ordersProcessed: ordersResult.processed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
