
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface ProposalFormProps {
  onSubmit: (proposalData: {
    price: number;
    estimatedTime: string;
    message: string;
  }) => void;
  requestTitle: string;
}

const ProposalForm = ({ onSubmit, requestTitle }: ProposalFormProps) => {
  const [price, setPrice] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!price || !estimatedTime || !message) {
      toast({
        title: "Missing fields",
        description: "Please fill out all fields before submitting your proposal.",
        variant: "destructive",
      });
      return;
    }
    
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    onSubmit({
      price: priceValue,
      estimatedTime,
      message
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-fashion-purple font-serif">Submit Proposal</CardTitle>
        <CardDescription>
          For: {requestTitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price">Your Price (USD) *</Label>
            <Input 
              id="price" 
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter your price" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="estimatedTime">Estimated Completion Time *</Label>
            <Select 
              value={estimatedTime} 
              onValueChange={setEstimatedTime}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 week">1 week</SelectItem>
                <SelectItem value="2 weeks">2 weeks</SelectItem>
                <SelectItem value="3 weeks">3 weeks</SelectItem>
                <SelectItem value="1 month">1 month</SelectItem>
                <SelectItem value="2 months">2 months</SelectItem>
                <SelectItem value="3+ months">3+ months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message to Customer *</Label>
            <Textarea 
              id="message" 
              placeholder="Describe your approach, experience with similar projects, and why you're the best designer for this project." 
              className="min-h-[120px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          
          <Button type="submit" className="w-full bg-fashion-purple hover:bg-fashion-purple-dark">
            Submit Proposal
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProposalForm;
