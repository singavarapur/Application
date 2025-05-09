"use client"

import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import Navbar from "@/components/layout/Navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { User, ProjectRequest, Proposal } from "@/types"
import { authService, requestService, proposalService } from "@/services/api"

const ManageOrders = () => {
  const [user, setUser] = useState<User | null>(null)
  const [acceptedProposals, setAcceptedProposals] = useState<Proposal[]>([])
  const [requests, setRequests] = useState<ProjectRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await authService.getCurrentUser();

        if (!userData) {
          navigate("/auth");
          return;
        }

        if (userData.role.toLowerCase() !== "designer") {
          navigate("/");
          return;
        }

        // Normalize for UI
        const normalizedUser: User = {
          ...userData,
          role: "Designer", // Capitalized for Navbar usage
        };

        setUser(normalizedUser);

        // Fetch accepted proposals
        const proposalsResponse = await proposalService.getProposals({
          designerId: userData.id,
          status: "accepted",
        });
        const designerProposals = proposalsResponse.data;
        setAcceptedProposals(designerProposals);

        // Fetch corresponding requests
        const requestIds = designerProposals.map((p) => p.requestId);
        const requestsData = [];

        for (const requestId of requestIds) {
          const requestResponse = await requestService.getRequestById(
            requestId
          );
          requestsData.push(requestResponse.data);
        }

        setRequests(requestsData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load orders data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate, toast]);
  
  const handleLogout = async () => {
    try {
      authService.logout()
      navigate("/auth")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      default:
        return "bg-yellow-500"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="container mx-auto py-10 px-4">
          <p className="text-center">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-serif text-fashion-purple mb-6">Manage Orders</h1>

        {acceptedProposals.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center py-8 text-gray-500">
                You don't have any accepted proposals yet.
                <br />
                Visit the{" "}
                <Link to="/marketplace" className="text-fashion-purple hover:underline">
                  marketplace
                </Link>{" "}
                to submit proposals.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const proposal = acceptedProposals.find((p) => p.requestId === request.id)
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.title}</TableCell>
                        <TableCell>{request.customerName}</TableCell>
                        <TableCell>${proposal?.price}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(request.status)}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/manage-order/${request.id}`)}>
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ManageOrders
