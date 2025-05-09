"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import RequestCard from "@/components/customer/RequestCard";
import type { ProjectRequest, User } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authService, requestService } from "@/services/api";

const Marketplace = () => {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ProjectRequest[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndFetchRequests = async () => {
      try {
        const userData = await authService.getCurrentUser();
        const normalizedRole = userData?.role?.toLowerCase();

        if (!userData || normalizedRole !== "designer") {
          navigate("/auth");
          return;
        }

        // Normalize role to expected type ("Designer" | "Customer")
        const normalizedUser: User = {
          ...userData,
          role:
            userData.role?.toLowerCase() === "designer"
              ? "Designer"
              : userData.role?.toLowerCase() === "customer"
              ? "Customer"
              : undefined,
        } as User;
        setUser(normalizedUser);

        const response = await requestService.getRequests({ status: "open" });
        const openRequests = response.data;
        setRequests(openRequests);
        setFilteredRequests(openRequests);
      } catch (error) {
        console.error("Error fetching user or requests:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem("token");
    if (token) {
      checkAuthAndFetchRequests();
    } else {
      navigate("/auth");
    }
  }, [navigate]);

  useEffect(() => {
    let filtered = [...requests];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.title.toLowerCase().includes(term) ||
          req.description.toLowerCase().includes(term)
      );
    }

    if (materialFilter !== "all") {
      filtered = filtered.filter((req) => req.material === materialFilter);
    }

    setFilteredRequests(filtered);
  }, [searchTerm, materialFilter, requests]);

  const handleLogout = async () => {
    try {
      authService.logout();
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const uniqueMaterials = Array.from(
    new Set(requests.map((req) => req.material))
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex-1 container mx-auto py-8 px-4 max-w-screen-xl">
        <h1 className="text-3xl font-serif text-fashion-purple mb-8">
          Designer Marketplace
        </h1>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="w-full md:w-3/4">
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-1/4">
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Materials</SelectItem>
                {uniqueMaterials.map((material) => (
                  <SelectItem key={material} value={material}>
                    {material}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">Loading available requests...</div>
        ) : filteredRequests.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">
              {requests.length > 0
                ? "No requests match your search criteria."
                : "There are no open requests at the moment."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
