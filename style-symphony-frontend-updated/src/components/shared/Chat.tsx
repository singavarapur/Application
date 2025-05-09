
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message, User } from "@/types";
import { PaperclipIcon, XCircleIcon } from 'lucide-react';

interface ChatProps {
  messages: Message[];
  currentUser: User;
  otherUser: User;
  onSendMessage: (content: string, image?: File) => void;
}

const Chat = ({ messages, currentUser, otherUser, onSendMessage }: ChatProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  // Create preview URL when image is selected
  useEffect(() => {
    if (selectedImage) {
      const url = URL.createObjectURL(selectedImage);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedImage]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() || selectedImage) {
      onSendMessage(newMessage, selectedImage || undefined);
      setNewMessage("");
      setSelectedImage(null);
      setPreviewUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const cancelImageUpload = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMessageContent = (message: Message) => {
    if (message.image) {
      return (
        <div className="flex flex-col gap-2">
          {message.content && <p className="text-sm">{message.content}</p>}
          <img 
            src={message.image} 
            alt="Shared image" 
            className="max-w-full rounded-lg object-cover max-h-60" 
          />
        </div>
      );
    }
    return <p className="text-sm">{message.content}</p>;
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg overflow-hidden">
      <div className="flex items-center p-4 border-b">
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser.profileImage} alt={otherUser.name} />
          <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="font-medium">{otherUser.name}</p>
          <p className="text-xs text-gray-500">{otherUser.role === 'designer' ? 'Designer' : 'Customer'}</p>
        </div>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => {
              const isCurrentUser = message.senderId === currentUser.id;
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`
                      max-w-[70%] rounded-lg px-4 py-2 
                      ${isCurrentUser 
                        ? 'bg-fashion-purple text-white' 
                        : 'bg-gray-100 text-gray-800'}
                    `}
                  >
                    {renderMessageContent(message)}
                    <p className={`text-xs mt-1 ${isCurrentUser ? 'text-purple-100' : 'text-gray-500'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        )}
      </ScrollArea>

      {previewUrl && (
        <div className="p-2 border-t">
          <div className="relative inline-block">
            <img 
              src={previewUrl} 
              alt="Upload preview" 
              className="h-20 rounded-md object-cover" 
            />
            <button 
              onClick={cancelImageUpload}
              className="absolute -top-2 -right-2 rounded-full bg-white shadow"
            >
              <XCircleIcon size={20} className="text-red-500" />
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleAttachClick}
          className="flex-shrink-0"
        >
          <PaperclipIcon size={20} />
        </Button>
        <Input 
          placeholder="Type a message..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
        />
        <Button 
          type="submit" 
          className="bg-fashion-purple hover:bg-fashion-purple-dark"
        >
          Send
        </Button>
      </form>
    </div>
  );
};

export default Chat;
