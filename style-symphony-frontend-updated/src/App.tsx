
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NewRequest from "./pages/customer/NewRequest";
import MyRequests from "./pages/customer/MyRequests";
import Payment from "./pages/customer/Payment";
import Marketplace from "./pages/designer/Marketplace";
import ManageOrder from "./pages/designer/ManageOrder";
import ManageOrders from "./pages/designer/ManageOrders";
import RequestDetails from "./pages/shared/RequestDetails";
import Messages from "./pages/shared/Messages";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/new-request" element={<NewRequest />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/manage-orders" element={<ManageOrders />} />
          <Route path="/requests/:id" element={<RequestDetails />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:partnerId" element={<Messages />} />
          <Route path="/manage-order/:id" element={<ManageOrder />} />
          <Route path="/payment/:id/:updateId" element={<Payment />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/profile" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
