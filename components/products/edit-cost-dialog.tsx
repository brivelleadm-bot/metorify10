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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const costSchema = z.object({
  cost_amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: 'Must be a valid positive number',
  }),
});

type CostFormValues = z.infer<typeof costSchema>;

interface EditCostDialogProps {
  variant: {
    id: string;
    product_name: string;
    current_cost: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCostDialog({ variant, onClose, onSuccess }: EditCostDialogProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<CostFormValues>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      cost_amount: variant.current_cost.toString(),
    },
  });

  const onSubmit = async (values: CostFormValues) => {
    setSaving(true);

    try {
      const costAmount = parseFloat(values.cost_amount);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await (supabase.from('costs') as any).insert([{
        variant_id: variant.id,
        cost_amount: costAmount,
        effective_from: new Date().toISOString(),
      }]);

      if (error) throw error;

      await (supabase.from('audit_logs') as any).insert([{
        user_id: user.id,
        action: 'update_cost',
        resource_type: 'variant',
        resource_id: variant.id,
        old_values: { cost: variant.current_cost },
        new_values: { cost: costAmount },
      }]);

      toast.success('Cost updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update cost');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit Product Cost</DialogTitle>
          <DialogDescription>
            Update the cost for {variant.product_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cost_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Cost'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
