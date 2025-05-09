
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Proposal } from '@/types';

interface ProposalCardProps {
  proposal: Proposal;
  isCustomer?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onMessage?: () => void;
  onManageOrder?: () => void;
}

const ProposalCard = ({ 
  proposal, 
  isCustomer = false, 
  onAccept, 
  onReject,
  onMessage,
  onManageOrder
}: ProposalCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={proposal.designerImage} alt={proposal.designerName} />
              <AvatarFallback>{getInitials(proposal.designerName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-serif">{proposal.designerName}</CardTitle>
              <CardDescription>
                Submitted on {formatDate(proposal.createdAt)}
              </CardDescription>
            </div>
          </div>
          <Badge className={`${getStatusColor(proposal.status)} capitalize`}>
            {proposal.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap justify-between mb-4">
          <div className="bg-fashion-purple-light p-2 rounded text-center flex-1 mr-2">
            <p className="text-sm text-fashion-purple-dark">Price</p>
            <p className="text-lg font-semibold text-fashion-purple">${proposal.price.toFixed(2)}</p>
          </div>
          <div className="bg-fashion-purple-light p-2 rounded text-center flex-1">
            <p className="text-sm text-fashion-purple-dark">Time to Complete</p>
            <p className="text-lg font-semibold text-fashion-purple">{proposal.estimatedTime}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-1">Message:</h4>
          <p className="text-sm text-gray-600">
            {proposal.message}
          </p>
        </div>
      </CardContent>
      
      {isCustomer && proposal.status === 'pending' && (
        <CardFooter className="flex-col gap-2">
          <Button 
            onClick={onAccept}
            className="w-full bg-fashion-purple hover:bg-fashion-purple-dark"
          >
            Accept Proposal
          </Button>
          <Button 
            onClick={onReject}
            variant="outline" 
            className="w-full text-red-500 border-red-200 hover:bg-red-50"
          >
            Decline
          </Button>
        </CardFooter>
      )}
      
      {proposal.status === 'accepted' && (
        <CardFooter className="flex-col gap-2">
          <Button 
            onClick={onMessage}
            className="w-full bg-fashion-purple hover:bg-fashion-purple-dark mb-2"
          >
            {isCustomer ? "Message Designer" : "Message Customer"}
          </Button>
          
          {!isCustomer && proposal.status === 'accepted' && (
            <Button 
              onClick={onManageOrder}
              variant="outline"
              className="w-full border-fashion-purple text-fashion-purple hover:bg-fashion-purple-light"
            >
              Manage Order
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default ProposalCard;
