'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { DollarSign, ShoppingCart, TrendingUp, Percent, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Metrics {
  totalRevenue: number;
  totalOrders: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
}

export default function AnalysisPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCost: 0,
    totalProfit: 0,
    avgMargin: 0,
  });
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWebsites();
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [selectedWebsite, dateRange]);

  const fetchWebsites = async () => {
    const { data } = await supabase
      .from('websites')
      .select('id, name, currency')
      .order('name');

    if (data) {
      setWebsites(data);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);

    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      let query = supabase
        .from('order_items')
        .select(`
          net_revenue,
          total_cost,
          profit,
          profit_margin,
          order:orders!inner(
            id,
            order_date,
            status,
            website_id
          )
        `)
        .gte('order.order_date', startDate.toISOString())
        .in('order.status', ['completed', 'processing', 'on-hold']);

      if (selectedWebsite !== 'all') {
        query = query.eq('order.website_id', selectedWebsite);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const totalRevenue = data.reduce((sum, item: any) => sum + item.net_revenue, 0);
        const totalCost = data.reduce((sum, item: any) => sum + item.total_cost, 0);
        const totalProfit = data.reduce((sum, item: any) => sum + item.profit, 0);
        const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        const uniqueOrders = new Set(data.map((item: any) => item.order.id));

        setMetrics({
          totalRevenue,
          totalOrders: uniqueOrders.size,
          totalCost,
          totalProfit,
          avgMargin,
        });
      } else {
        setMetrics({
          totalRevenue: 0,
          totalOrders: 0,
          totalCost: 0,
          totalProfit: 0,
          avgMargin: 0,
        });
      }
    } catch (error: any) {
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const currency = selectedWebsite !== 'all'
    ? websites.find(w => w.id === selectedWebsite)?.currency || 'USD'
    : 'USD';

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Analysis"
        description="Analyze revenue, costs, and profit across your stores"
      />

      <div className="flex-1 p-8">
        <div className="flex gap-4 mb-6">
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
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currency} {metrics.totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {metrics.totalOrders} orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currency} {metrics.totalCost.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cost of goods sold
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currency} {metrics.totalProfit.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Revenue minus cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.avgMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.avgMargin.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Profit margin percentage
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm font-medium">Revenue per Order</span>
                <span className="text-sm">
                  {metrics.totalOrders > 0
                    ? `${currency} ${(metrics.totalRevenue / metrics.totalOrders).toFixed(2)}`
                    : '-'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm font-medium">Cost per Order</span>
                <span className="text-sm">
                  {metrics.totalOrders > 0
                    ? `${currency} ${(metrics.totalCost / metrics.totalOrders).toFixed(2)}`
                    : '-'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm font-medium">Profit per Order</span>
                <span className={`text-sm ${metrics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.totalOrders > 0
                    ? `${currency} ${(metrics.totalProfit / metrics.totalOrders).toFixed(2)}`
                    : '-'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
