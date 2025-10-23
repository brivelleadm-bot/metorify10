interface WooCommerceConfig {
  base_url: string;
  consumer_key: string;
  consumer_secret: string;
}

export class WooCommerceClient {
  private base_url: string;
  private consumer_key: string;
  private consumer_secret: string;

  constructor(config: WooCommerceConfig) {
    this.base_url = config.base_url.replace(/\/$/, '');
    this.consumer_key = config.consumer_key;
    this.consumer_secret = config.consumer_secret;
  }

  private getAuthUrl(endpoint: string): string {
    const url = new URL(`${this.base_url}/wp-json/wc/v3${endpoint}`);
    url.searchParams.append('consumer_key', this.consumer_key);
    url.searchParams.append('consumer_secret', this.consumer_secret);
    return url.toString();
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = this.getAuthUrl(endpoint);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`WooCommerce API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/system_status');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getProducts(params: {
    page?: number;
    per_page?: number;
    after?: string;
  } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.per_page) query.append('per_page', params.per_page.toString());
    if (params.after) query.append('after', params.after);

    return this.request(`/products?${query.toString()}`);
  }

  async getProduct(id: number) {
    return this.request(`/products/${id}`);
  }

  async getProductVariations(productId: number, params: {
    page?: number;
    per_page?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.per_page) query.append('per_page', params.per_page.toString());

    return this.request(`/products/${productId}/variations?${query.toString()}`);
  }

  async getOrders(params: {
    page?: number;
    per_page?: number;
    after?: string;
    status?: string;
  } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.per_page) query.append('per_page', params.per_page.toString());
    if (params.after) query.append('after', params.after);
    if (params.status) query.append('status', params.status);

    return this.request(`/orders?${query.toString()}`);
  }

  async getOrder(id: number) {
    return this.request(`/orders/${id}`);
  }
}

export function createWooCommerceClient(config: WooCommerceConfig): WooCommerceClient {
  return new WooCommerceClient(config);
}
