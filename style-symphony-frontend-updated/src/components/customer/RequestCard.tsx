
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectRequest } from '@/types';
import { Link } from 'react-router-dom';

interface RequestCardProps {
  request: ProjectRequest;
  showActions?: boolean;
}

const RequestCard = ({ request, showActions = true }: RequestCardProps) => {
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
      case 'open':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="aspect-[16/9] overflow-hidden">
        {request.images && request.images.length > 0 ? (
          <img 
            src={request.images[0]} 
            alt={request.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}
      </div>
      
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-serif">{request.title}</CardTitle>
          <Badge className={`${getStatusColor(request.status)} capitalize`}>
            {request.status}
          </Badge>
        </div>
        <CardDescription>
          Posted on {formatDate(request.createdAt)} by {request.customerName}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm line-clamp-2 mb-2">
          {request.description}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline" className="bg-fashion-purple-light text-fashion-purple-dark">
            {request.material}
          </Badge>
          {request.budget && !request.acceptedPrice && (
            <Badge variant="outline" className="bg-fashion-purple-light text-fashion-purple-dark">
              Budget: ${request.budget}
            </Badge>
          )}
          {request.acceptedPrice && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              Price: ${request.acceptedPrice}
            </Badge>
          )}
          {request.timeframe && (
            <Badge variant="outline" className="bg-fashion-purple-light text-fashion-purple-dark">
              {request.timeframe}
            </Badge>
          )}
        </div>
      </CardContent>
      
      {showActions && (
        <CardFooter className="flex justify-between">
          <Link to={`/requests/${request.id}`} className="w-full">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
};

export default RequestCard;
