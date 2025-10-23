'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface OrderItem {
  id: string;
  order_number: string;
  order_date: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  net_revenue: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
  country: string | null;
  status: string;
  website_name: string;
  currency: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  useEffect(() => {
    fetchWebsites();
    fetchOrders();
  }, [selectedWebsite, selectedCountry, dateRange]);

  const fetchWebsites = async () => {
    const { data } = await supabase
      .from('websites')
      .select('id, name')
      .order('name');

    if (data) {
      setWebsites(data);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);

    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      let query = supabase
        .from('order_items')
        .select(`
          id,
          product_name,
          sku,
          quantity,
          net_revenue,
          total_cost,
          profit,
          profit_margin,
          order:orders(
            order_number,
            order_date,
            status,
            country,
            website:websites(name, currency)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (selectedWebsite !== 'all') {
        query = query.eq('website_id', selectedWebsite);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        id: item.id,
        order_number: item.order?.order_number || '',
        order_date: item.order?.order_date || '',
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        net_revenue: item.net_revenue,
        total_cost: item.total_cost,
        profit: item.profit,
        profit_margin: item.profit_margin,
        country: item.order?.country,
        status: item.order?.status || '',
        website_name: item.order?.website?.name || '',
        currency: item.order?.website?.currency || 'USD',
      })) || [];

      setOrders(formattedData);

      const countrySet = new Set(formattedData.map((o: any) => o.country).filter(Boolean));
      const uniqueCountries = Array.from(countrySet);
      setCountries(uniqueCountries.sort());
    } catch (error: any) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCountry = selectedCountry === 'all' || order.country === selectedCountry;

    return matchesSearch && matchesCountry;
  });

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Orders"
        description="View and analyze order details with profit tracking"
      />

      <div className="flex-1 p-8">
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="w-[180px]">
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
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No orders found
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{format(new Date(order.order_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {order.product_name}
                        {order.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {order.sku}</div>
                        )}
                      </TableCell>
                      <TableCell>{order.website_name}</TableCell>
                      <TableCell>{order.country || '-'}</TableCell>
                      <TableCell className="text-right">{order.quantity}</TableCell>
                      <TableCell className="text-right">
                        {order.currency} {order.net_revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.currency} {order.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right ${order.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {order.currency} {order.profit.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right ${order.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {order.profit_margin.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
