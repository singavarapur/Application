"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import Navbar from "@/components/layout/Navbar"
import ProposalForm from "@/components/designer/ProposalForm"
import ProposalCard from "@/components/designer/ProposalCard"
import Timeline from "@/components/shared/Timeline"
import TimelineUpdateForm from "@/components/shared/TimelineUpdateForm"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { useToast } from "@/components/ui/use-toast"
import type { ProjectRequest, User, Proposal, TimelineUpdate } from "@/types"
import { Separator } from "@/components/ui/separator"
import { authService, requestService, proposalService } from "@/services/api"

const RequestDetails = () => {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [request, setRequest] = useState<ProjectRequest | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [timeline, setTimeline] = useState<TimelineUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("details")
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication
        const userData = authService.getCurrentUser()

        if (!userData) {
          navigate("/auth")
          return
        }

        setUser(await userData)

        if (!id) return

        // Fetch request details
        const requestResponse = await requestService.getRequestById(id)
        const requestData = requestResponse.data

        if (!requestData) {
          toast({
            title: "Request not found",
            description: "The requested project could not be found.",
            variant: "destructive",
          })
          navigate("/")
          return
        }

        setRequest(requestData)

        // Fetch proposals
        const proposalsResponse = await proposalService.getProposals({ requestId: id })
        setProposals(proposalsResponse.data)

        // Fetch timeline - assuming there's an API endpoint for this
        const timelineResponse = await fetch(`/api/timeline/${id}`)
        const timelineData = await timelineResponse.json()
        setTimeline(timelineData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load request details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate, toast])

  const handleLogout = async () => {
    try {
      authService.logout()
      navigate("/auth")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleSubmitProposal = async (proposalData: {
    price: number
    estimatedTime: string
    message: string
  }) => {
    if (!user || !request) return

    try {
      // Check if the user already submitted a proposal
      const existingProposal = proposals.find((p) => p.designerId === user.id)

      if (existingProposal) {
        toast({
          title: "Proposal already submitted",
          description: "You have already submitted a proposal for this request.",
          variant: "destructive",
        })
        return
      }

      const response = await proposalService.createProposal({
        requestId: request.id,
        ...proposalData,
      })
      const newProposal = response.data
      setProposals((prev) => [...prev, newProposal])

      toast({
        title: "Proposal submitted",
        description: "Your proposal has been successfully submitted.",
      })

      // Switch to the proposals tab
      setActiveTab("proposals")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit proposal",
        variant: "destructive",
      })
    }
  }

  const handleAcceptProposal = async (proposalId: string) => {
    try {
      await proposalService.updateProposal(proposalId, { status: "accepted" })

      // Update local state
      setProposals((prev) =>
        prev.map((prop) =>
          prop.id === proposalId
            ? { ...prop, status: "accepted" }
            : prop.id !== proposalId && prop.status !== "rejected"
              ? { ...prop, status: "rejected" } // Reject all other pending proposals
              : prop,
        ),
      )

      // Update request status
      if (request) {
        // Get the accepted proposal
        const acceptedProposal = proposals.find((p) => p.id === proposalId)
        if (acceptedProposal) {
          setRequest({
            ...request,
            status: "assigned",
            acceptedProposalId: proposalId,
            acceptedPrice: acceptedProposal.price,
            designerId: acceptedProposal.designerId,
            designerName: acceptedProposal.designerName,
          })

          // Update the request in the backend
          await requestService.updateRequest(request.id, {
            status: "assigned",
            acceptedProposalId: proposalId,
            acceptedPrice: acceptedProposal.price,
            designerId: acceptedProposal.designerId,
            designerName: acceptedProposal.designerName,
          })
        }
      }

      toast({
        title: "Proposal accepted",
        description: "You can now message the designer to discuss details.",
      })

      // Get the updated timeline
      const timelineResponse = await fetch(`/api/timeline/${id}`)
      const updatedTimelineData = await timelineResponse.json()
      setTimeline(updatedTimelineData)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept proposal",
        variant: "destructive",
      })
    }
  }

  const handleRejectProposal = async (proposalId: string) => {
    try {
      await proposalService.updateProposal(proposalId, { status: "rejected" })

      // Update local state
      setProposals((prev) => prev.map((prop) => (prop.id === proposalId ? { ...prop, status: "rejected" } : prop)))

      toast({
        title: "Proposal rejected",
        description: "The proposal has been rejected.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject proposal",
        variant: "destructive",
      })
    }
  }

  const handleAddTimelineUpdate = async (status: TimelineUpdate["status"], message: string) => {
    if (!request) return

    try {
      // Assuming there's an API endpoint for adding timeline updates
      const response = await fetch(`/api/timeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.id,
          status,
          message,
        }),
      })

      const newUpdate = await response.json()
      setTimeline((prev) => [...prev, newUpdate])

      // If status is 'delivered', update request status to 'completed'
      if (status === "delivered" && request) {
        try {
          // Create an updated request with the new status
          const updatedRequest: ProjectRequest = { 
            ...request, 
            status: "completed" // This matches the allowed type
          };
      
          // Update local state
          setRequest(updatedRequest);
      
          // Update the backend
          await requestService.updateRequest(request.id, { status: "completed" });
        } catch (error) {
          console.error("Failed to update request status:", error);
          // Optionally revert the state if the API call fails
          setRequest(request); // Reset to the original request
        }
      }

      toast({
        title: "Timeline updated",
        description: "The project timeline has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update timeline",
        variant: "destructive",
      })
    }
  }

  const handleMessageDesigner = (designerId: string) => {
    // In a real app, this would navigate to a chat page or open a chat modal
    navigate(`/messages/${designerId}`)
  }

  const handleManageOrder = (requestId: string) => {
    navigate(`/manage-order/${requestId}`)
  }

  const handleMakePayment = (updateId: string, amount: number) => {
    if (!id) return
    navigate(`/payment/${id}/${updateId}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800 border-green-200"
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "completed":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Check if user has already submitted a proposal
  const userProposal = user && proposals.find((p) => p.designerId === user.id)
  // Check if this request belongs to the current user
  const isUsersRequest = user && request && user.id === request.customerId
  // Check if this request has an accepted proposal
  const acceptedProposal = proposals.find((p) => p.status === "accepted")
  // Check if user is the designer with the accepted proposal
  const isAssignedDesigner = user && acceptedProposal && user.id === acceptedProposal.designerId
  // Get existing timeline status updates
  const existingTimelineStatuses = timeline.map((update) => update.status)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading request details...</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <p>Request not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex-1 container mx-auto py-8 px-4 max-w-screen-xl">
        <div className="mb-6">
          {user?.role === "customer" ? (
            <Link to="/my-requests" className="text-fashion-purple hover:underline">
              ← Back to My Requests
            </Link>
          ) : (
            <Link to="/marketplace" className="text-fashion-purple hover:underline">
              ← Back to Marketplace
            </Link>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif text-fashion-purple">{request.title}</h1>
            <div className="flex items-center mt-2">
              <Badge className={`${getStatusColor(request.status)} capitalize mr-2`}>{request.status}</Badge>
              <p className="text-sm text-gray-500">Posted on {formatDate(request.createdAt)}</p>
            </div>
            {request.acceptedPrice && (
              <p className="mt-1 text-green-600 font-medium">Accepted Price: ${request.acceptedPrice.toFixed(2)}</p>
            )}
          </div>

          {/* Customer can't submit proposals, Designer can't see their own request */}
          {user?.role === "designer" && !isAssignedDesigner && request.status === "open" && (
            <div className="mt-4 md:mt-0">
              {!userProposal ? (
                <Button
                  onClick={() => setActiveTab("submit-proposal")}
                  className="bg-fashion-purple hover:bg-fashion-purple-dark"
                >
                  Submit Proposal
                </Button>
              ) : (
                <Badge>Proposal Submitted</Badge>
              )}
            </div>
          )}

          {/* Designer has a button to manage the order if it's assigned to them */}
          {isAssignedDesigner && request.status === "assigned" && (
            <div className="mt-4 md:mt-0">
              <Button
                onClick={() => handleManageOrder(request.id)}
                className="bg-fashion-purple hover:bg-fashion-purple-dark"
              >
                Manage Order
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            {(isUsersRequest || user?.role === "designer") && (
              <TabsTrigger value="proposals">
                Proposals{proposals.length > 0 ? ` (${proposals.length})` : ""}
              </TabsTrigger>
            )}
            {request.status !== "open" && (isUsersRequest || isAssignedDesigner) && (
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            )}
            {user?.role === "designer" && request.status === "open" && !userProposal && (
              <TabsTrigger value="submit-proposal">Submit Proposal</TabsTrigger>
            )}
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card>
                  <CardContent className="pt-6">
                    {request.images && request.images.length > 0 ? (
                      <Carousel className="mb-6">
                        <CarouselContent>
                          {request.images.map((image, index) => (
                            <CarouselItem key={index}>
                              <div className="aspect-[16/9] overflow-hidden rounded-md">
                                <img
                                  src={image || "/placeholder.svg"}
                                  alt={`${request.title} - Image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                      </Carousel>
                    ) : (
                      <div className="w-full aspect-[16/9] bg-gray-100 flex items-center justify-center mb-6 rounded-md">
                        <span className="text-gray-400">No images</span>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-serif mb-2">Description</h2>
                        <p className="text-gray-700">{request.description}</p>
                      </div>

                      {request.additionalDetails && (
                        <div>
                          <h2 className="text-xl font-serif mb-2">Additional Details</h2>
                          <p className="text-gray-700">{request.additionalDetails}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-6">
                        <Avatar>
                          <AvatarFallback>{getInitials(request.customerName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{request.customerName}</h3>
                          <p className="text-sm text-gray-500">Customer</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="pt-4">
                        <h3 className="font-medium mb-2">Project Details</h3>

                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-500">Material</p>
                            <p className="font-medium">{request.material}</p>
                          </div>

                          {request.budget && (
                            <div>
                              <p className="text-sm text-gray-500">Budget</p>
                              <p className="font-medium">${request.budget}</p>
                            </div>
                          )}

                          <div>
                            <p className="text-sm text-gray-500">Timeframe</p>
                            <p className="font-medium">{request.timeframe}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals">
            {proposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {proposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    isCustomer={user?.role === "customer"}
                    onAccept={isUsersRequest ? () => handleAcceptProposal(proposal.id) : undefined}
                    onReject={isUsersRequest ? () => handleRejectProposal(proposal.id) : undefined}
                    onMessage={
                      isUsersRequest || isAssignedDesigner
                        ? () => handleMessageDesigner(proposal.designerId)
                        : undefined
                    }
                    onManageOrder={
                      isAssignedDesigner && proposal.status === "accepted"
                        ? () => handleManageOrder(request.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No proposals have been submitted yet.</p>
              </div>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Timeline
                  updates={timeline}
                  isDesigner={isAssignedDesigner}
                  isCustomer={isUsersRequest}
                  onMakePayment={isUsersRequest ? handleMakePayment : undefined}
                />
              </div>

              {isAssignedDesigner && (
                <div>
                  <TimelineUpdateForm
                    onSubmit={handleAddTimelineUpdate}
                    existingStatuses={existingTimelineStatuses}
                    customStatuses={[
                      { value: "assigned", label: "Order Assigned" },
                      { value: "stitched", label: "Stitching Complete" },
                      { value: "dyed", label: "Dyeing Complete" },
                      { value: "fitting", label: "Fitting Complete" },
                      { value: "out_for_delivery", label: "Out for Delivery" },
                      { value: "delivered", label: "Delivered" },
                    ]}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Submit Proposal Tab */}
          <TabsContent value="submit-proposal">
            <ProposalForm onSubmit={handleSubmitProposal} requestTitle={request.title} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default RequestDetails
