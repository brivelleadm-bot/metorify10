'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const websiteSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  base_url: z.string().url('Must be a valid URL'),
  consumer_key: z.string().min(1, 'Consumer key is required'),
  consumer_secret: z.string().min(1, 'Consumer secret is required'),
  currency: z.string().min(1, 'Currency is required'),
});

type WebsiteFormValues = z.infer<typeof websiteSchema>;

interface AddWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddWebsiteDialog({ open, onOpenChange, onSuccess }: AddWebsiteDialogProps) {
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteSchema),
    defaultValues: {
      name: '',
      base_url: '',
      consumer_key: '',
      consumer_secret: '',
      currency: 'USD',
    },
  });

  const onSubmit = async (values: WebsiteFormValues) => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await (supabase.from('websites') as any).insert({
        user_id: user.id,
        name: values.name,
        base_url: values.base_url,
        consumer_key: values.consumer_key,
        consumer_secret: values.consumer_secret,
        currency: values.currency,
      });

      if (error) throw error;

      toast.success('Website added successfully');
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add website');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);

    try {
      const values = form.getValues();

      const response = await fetch('/api/websites/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: values.base_url,
          consumer_key: values.consumer_key,
          consumer_secret: values.consumer_secret,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (error: any) {
      toast.error('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add WooCommerce Website</DialogTitle>
          <DialogDescription>
            Connect your WooCommerce store to start tracking metrics
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="base_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://mystore.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your WooCommerce store base URL
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consumer_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumer Key</FormLabel>
                  <FormControl>
                    <Input placeholder="ck_..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consumer_secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumer Secret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="cs_..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={testing || saving}
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              <Button type="submit" disabled={saving || testing}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Add Website'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
