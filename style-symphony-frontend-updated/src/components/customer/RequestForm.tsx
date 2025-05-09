
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const materialOptions = [
  "Cotton", "Silk", "Linen", "Polyester", "Wool", "Denim", "Leather", "Velvet", "Satin", "Other"
];

const sizeOptions = [
  "XS", "S", "M", "L", "XL", "XXL", "Custom"
];

interface RequestFormProps {
  onSubmit: (requestData: {
    title: string;
    description: string;
    material: string;
    budget?: number;
    timeframe: string;
    images: File[];
    additionalDetails?: string;
    size?: string;
  }) => void;
}

const RequestForm = ({ onSubmit }: RequestFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [material, setMaterial] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [timeframe, setTimeframe] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [size, setSize] = useState("");
  const { toast } = useToast();

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      
      if (files.length + images.length > 5) {
        toast({
          title: "Too many images",
          description: "You can upload up to 5 images.",
          variant: "destructive",
        });
        return;
      }
      
      setImages(prevImages => [...prevImages, ...files]);
      
      // Generate preview URLs
      const newImageUrls = files.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prevUrls => [...prevUrls, ...newImageUrls]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
    
    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !material || !timeframe || images.length === 0) {
      toast({
        title: "Missing fields",
        description: "Please fill out all required fields and upload at least one image.",
        variant: "destructive",
      });
      return;
    }
    
    onSubmit({
      title,
      description,
      material,
      budget: budget ? parseFloat(budget) : undefined,
      timeframe,
      images,
      additionalDetails,
      size
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-fashion-purple font-serif">Create Custom Fashion Request</CardTitle>
        <CardDescription>
          Describe your fashion item in detail to receive accurate proposals from designers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Request Title *</Label>
            <Input 
              id="title" 
              placeholder="E.g., Custom Wedding Dress, Tailored Suit, etc." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea 
              id="description" 
              placeholder="Describe your fashion item in detail. Include style preferences, patterns, fit, etc." 
              className="min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material">Preferred Material *</Label>
              <Select 
                value={material} 
                onValueChange={setMaterial}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materialOptions.map((mat) => (
                    <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select 
                value={size} 
                onValueChange={setSize}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((sizeOption) => (
                    <SelectItem key={sizeOption} value={sizeOption}>{sizeOption}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (Optional)</Label>
              <Input 
                id="budget" 
                type="number" 
                min="0"
                placeholder="Your budget in USD" 
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe Needed *</Label>
              <Select 
                value={timeframe} 
                onValueChange={setTimeframe}
              >
                <SelectTrigger>
                  <SelectValue placeholder="When do you need it?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
                  <SelectItem value="3-4 weeks">3-4 weeks</SelectItem>
                  <SelectItem value="1-2 months">1-2 months</SelectItem>
                  <SelectItem value="3+ months">3+ months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="images">Upload Images *</Label>
            <div className="border border-dashed border-gray-300 rounded-md p-4 text-center">
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <Label htmlFor="images" className="cursor-pointer w-full block">
                <div className="flex flex-col items-center justify-center py-4">
                  <p className="text-sm text-muted-foreground">Drag & drop images or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">(Up to 5 images, max 5MB each)</p>
                </div>
              </Label>
            </div>
            
            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-2">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`} 
                      className="h-24 w-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="additionalDetails">Additional Details (Optional)</Label>
            <Textarea 
              id="additionalDetails" 
              placeholder="Any other details that might help designers understand your request better." 
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
            />
          </div>
          
          <Button type="submit" className="w-full bg-fashion-purple hover:bg-fashion-purple-dark">
            Submit Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RequestForm;
