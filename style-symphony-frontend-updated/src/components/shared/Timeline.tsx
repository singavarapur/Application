
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimelineUpdate } from "@/types";

interface TimelineProps {
  updates: TimelineUpdate[];
  isDesigner?: boolean;
  isCustomer?: boolean;
  onAddUpdate?: (status: TimelineUpdate['status'], message: string, paymentRequired: boolean, paymentAmount?: number) => void;
  onMakePayment?: (updateId: string, amount: number) => void;
}

const Timeline = ({ 
  updates, 
  isDesigner = false, 
  isCustomer = false,
  onAddUpdate,
  onMakePayment
}: TimelineProps) => {
  const sortedUpdates = [...updates].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const getStatusDetails = (status: TimelineUpdate['status']) => {
    switch(status) {
      case 'design':
        return { 
          label: 'Design Complete', 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'The design phase is complete.'
        };
      case 'material':
        return { 
          label: 'Materials Selected', 
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          description: 'All materials have been selected and procured.'
        };
      case 'production':
        return { 
          label: 'Production Started', 
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          description: 'Your item is now in production.'
        };
      case 'quality':
        return { 
          label: 'Quality Check', 
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          description: 'Quality inspection is complete.'
        };
      case 'shipping':
        return { 
          label: 'Shipped', 
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'Your item has been shipped.'
        };
      case 'delivered':
        return { 
          label: 'Delivered', 
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          description: 'Your item has been delivered.'
        };
      case 'assigned':
        return { 
          label: 'Order Assigned', 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'The order has been assigned to the designer.'
        };
      case 'stitched':
        return { 
          label: 'Stitching Complete', 
          color: 'bg-pink-100 text-pink-800 border-pink-200',
          description: 'Stitching phase is complete.'
        };
      case 'dyed':
        return { 
          label: 'Dyeing Complete', 
          color: 'bg-violet-100 text-violet-800 border-violet-200',
          description: 'Dyeing process is complete.'
        };
      case 'fitting':
        return { 
          label: 'Fitting Complete', 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'Fitting adjustments are complete.'
        };
      case 'out_for_delivery':
        return { 
          label: 'Out for Delivery', 
          color: 'bg-lime-100 text-lime-800 border-lime-200',
          description: 'Your item is out for delivery.'
        };
      default:
        return { 
          label: 'Update', 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Status update.'
        };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-serif font-medium">Project Timeline</h3>
      
      {sortedUpdates.length > 0 ? (
        <ol className="relative border-l border-gray-200">
          {sortedUpdates.map((update, index) => {
            const { label, color, description } = getStatusDetails(update.status);
            
            return (
              <li key={update.id} className="mb-10 ml-6">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-fashion-purple-light rounded-full -left-3 ring-8 ring-white">
                  <span className="text-xs text-fashion-purple-dark">{index + 1}</span>
                </span>
                <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={color}>{label}</Badge>
                    <time className="text-xs text-gray-500">{formatDate(update.timestamp)}</time>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{update.message || description}</p>
                  
                  {update.paymentRequired && update.paymentAmount && (
                    <div className="mt-2 p-2 border border-dashed border-amber-300 rounded bg-amber-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-amber-800">
                            Payment Required: ${update.paymentAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-amber-700">
                            Status: {update.paymentStatus === 'paid' ? 'Paid ✓' : 'Pending'}
                          </p>
                        </div>
                        
                        {isCustomer && update.paymentStatus === 'pending' && onMakePayment && (
                          <Button 
                            size="sm"
                            onClick={() => onMakePayment(update.id, update.paymentAmount!)}
                            className="bg-amber-500 hover:bg-amber-600"
                          >
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="p-6 text-center border border-dashed rounded-lg">
          <p className="text-gray-500">No updates yet. The timeline will be updated as the project progresses.</p>
        </div>
      )}
    </div>
  );
};

export default Timeline;
