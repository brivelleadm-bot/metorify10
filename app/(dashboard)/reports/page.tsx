'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportsPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    const { data } = await supabase
      .from('websites')
      .select('id, name')
      .order('name');

    if (data) {
      setWebsites(data);
    }
  };

  const generateReport = async () => {
    setGenerating(true);

    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      let query = supabase
        .from('order_items')
        .select(`
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

      const csvRows = [
        ['Order Number', 'Date', 'Website', 'Product', 'SKU', 'Country', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Currency']
      ];

      data?.forEach((item: any) => {
        csvRows.push([
          item.order?.order_number || '',
          item.order?.order_date ? format(new Date(item.order.order_date), 'yyyy-MM-dd') : '',
          item.order?.website?.name || '',
          item.product_name,
          item.sku || '',
          item.order?.country || '',
          item.quantity.toString(),
          item.net_revenue.toFixed(2),
          item.total_cost.toFixed(2),
          item.profit.toFixed(2),
          item.profit_margin.toFixed(2),
          item.order?.website?.currency || 'USD',
        ]);
      });

      const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `metorify-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report generated successfully');
    } catch (error: any) {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Reports"
        description="Generate and export custom reports"
      />

      <div className="flex-1 p-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Export Order Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Website</label>
                <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                  <SelectTrigger>
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
            </div>

            <div className="pt-4">
              <Button onClick={generateReport} disabled={generating} className="w-full">
                {generating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export to CSV
                  </>
                )}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Report Includes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Order details and dates</li>
                <li>• Product information and SKUs</li>
                <li>• Revenue, cost, and profit per item</li>
                <li>• Profit margin percentages</li>
                <li>• Geographic data (country)</li>
                <li>• Multi-store support</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
