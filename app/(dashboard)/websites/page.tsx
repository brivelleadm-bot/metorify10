'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Globe, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { toast } from 'sonner';
import { AddWebsiteDialog } from '@/components/websites/add-website-dialog';
import { formatDistanceToNow } from 'date-fns';

type Website = Database['public']['Tables']['websites']['Row'];

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchWebsites = async () => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);
    } catch (error: any) {
      toast.error('Failed to load websites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleWebsiteAdded = () => {
    fetchWebsites();
    setShowAddDialog(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header
          title="Websites"
          description="Manage your WooCommerce store connections"
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Websites"
        description="Manage your WooCommerce store connections"
      />

      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold">Connected Stores</h2>
            <p className="text-sm text-muted-foreground">
              {websites.length} {websites.length === 1 ? 'store' : 'stores'} connected
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Website
          </Button>
        </div>

        {websites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No websites connected</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Connect your first WooCommerce store to start tracking your metrics
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Website
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {websites.map((website) => (
              <Card key={website.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{website.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {website.base_url}
                      </CardDescription>
                    </div>
                    {website.sync_enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency:</span>
                      <span className="font-medium">{website.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={website.sync_enabled ? 'text-green-600' : 'text-slate-600'}>
                        {website.sync_enabled ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last sync:</span>
                      <span className="font-medium">
                        {website.last_sync_at
                          ? formatDistanceToNow(new Date(website.last_sync_at), { addSuffix: true })
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddWebsiteDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleWebsiteAdded}
      />
    </div>
  );
}
