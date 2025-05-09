
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TimelineUpdate } from '@/types';

interface TimelineUpdateFormProps {
  onSubmit: (status: TimelineUpdate['status'], message: string, paymentRequired?: boolean, paymentAmount?: number) => void;
  existingStatuses: string[];
  customStatuses?: { value: string; label: string }[];
}

const TimelineUpdateForm = ({ 
  onSubmit, 
  existingStatuses = [],
  customStatuses
}: TimelineUpdateFormProps) => {
  const [status, setStatus] = useState<TimelineUpdate['status']>('design');
  const [message, setMessage] = useState('');
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | undefined>(undefined);
  
  const defaultStatuses = [
    { value: 'design', label: 'Design Complete' },
    { value: 'material', label: 'Materials Selected' },
    { value: 'production', label: 'Production Started' },
    { value: 'quality', label: 'Quality Check' },
    { value: 'shipping', label: 'Shipping' },
    { value: 'delivered', label: 'Delivered' },
  ];
  
  const availableStatuses = customStatuses || defaultStatuses;
  
  // Filter out statuses that already exist in the timeline
  const filteredStatuses = availableStatuses.filter(
    statusOption => !existingStatuses.includes(statusOption.value)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status && message) {
      onSubmit(status, message, paymentRequired, paymentAmount);
      setMessage('');
      // Don't reset status to allow for multiple updates of same type
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Timeline Update</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as TimelineUpdate['status'])}
              disabled={filteredStatuses.length === 0}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {filteredStatuses.length > 0 ? (
                  filteredStatuses.map((statusOption) => (
                    <SelectItem key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-options" disabled>
                    All statuses have been used
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter details about this update"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="payment-required" 
              checked={paymentRequired}
              onCheckedChange={(checked) => setPaymentRequired(checked === true)}
            />
            <Label 
              htmlFor="payment-required" 
              className="text-sm font-normal cursor-pointer"
            >
              Require payment for this update
            </Label>
          </div>
          
          {paymentRequired && (
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount ($)</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit"
            disabled={!status || !message || (paymentRequired && !paymentAmount)}
            className="w-full bg-fashion-purple hover:bg-fashion-purple-dark"
          >
            Add Update
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TimelineUpdateForm;
