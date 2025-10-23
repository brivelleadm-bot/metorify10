'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Search, Edit2 } from 'lucide-react';
import { EditCostDialog } from '@/components/products/edit-cost-dialog';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  website: {
    name: string;
    currency: string;
  };
}

interface Variant {
  id: string;
  sku: string | null;
  price_regular: number;
  price_sale: number | null;
  attributes: any;
  product_id: string;
  product_name: string;
  website_name: string;
  website_currency: string;
  current_cost: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Variant[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState<string>('all');
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);

  useEffect(() => {
    fetchWebsites();
    fetchProducts();
  }, [selectedWebsite]);

  const fetchWebsites = async () => {
    const { data } = await supabase
      .from('websites')
      .select('id, name')
      .order('name');

    if (data) {
      setWebsites(data);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('variants')
        .select(`
          id,
          sku,
          price_regular,
          price_sale,
          attributes,
          product_id,
          product:products(name, website:websites(name, currency))
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (selectedWebsite !== 'all') {
        query = query.eq('website_id', selectedWebsite);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        price_regular: variant.price_regular,
        price_sale: variant.price_sale,
        attributes: variant.attributes,
        product_id: variant.product_id,
        product_name: variant.product?.name || '',
        website_name: variant.product?.website?.name || '',
        website_currency: variant.product?.website?.currency || 'USD',
        current_cost: 0,
      })) || [];

      for (const variant of formattedData) {
        const { data: costData } = await supabase
          .from('costs')
          .select('cost_amount')
          .eq('variant_id', variant.id)
          .order('effective_from', { ascending: false })
          .limit(1)
          .maybeSingle();

        variant.current_cost = (costData as any)?.cost_amount || 0;
      }

      setProducts(formattedData);
    } catch (error: any) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleCostUpdated = () => {
    fetchProducts();
    setEditingVariant(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Products"
        description="Manage products and set cost data"
      />

      <div className="flex-1 p-8">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All websites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All websites</SelectItem>
              {websites.map((website) => (
                <SelectItem key={website.id} value={website.id}>
                  {website.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="text-right">Regular Price</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.product_name}
                      {Object.keys(product.attributes || {}).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(product.attributes || {}).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{product.sku || '-'}</TableCell>
                    <TableCell>{product.website_name}</TableCell>
                    <TableCell className="text-right">
                      {product.website_currency} {product.price_regular.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.price_sale
                        ? `${product.website_currency} ${product.price_sale.toFixed(2)}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {product.website_currency} {product.current_cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingVariant(product)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {editingVariant && (
        <EditCostDialog
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
          onSuccess={handleCostUpdated}
        />
      )}
    </div>
  );
}
