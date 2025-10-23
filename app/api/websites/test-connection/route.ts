import { NextRequest, NextResponse } from 'next/server';
import { createWooCommerceClient } from '@/lib/woocommerce/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base_url, consumer_key, consumer_secret } = body;

    if (!base_url || !consumer_key || !consumer_secret) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = createWooCommerceClient({
      base_url,
      consumer_key,
      consumer_secret,
    });

    const isConnected = await client.testConnection();

    if (isConnected) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Connection failed' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
