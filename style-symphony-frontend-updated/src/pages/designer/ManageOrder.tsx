"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import Navbar from "@/components/layout/Navbar"
import Timeline from "@/components/shared/Timeline"
import TimelineUpdateForm from "@/components/shared/TimelineUpdateForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { authService, requestService } from "@/services/api"
import type { ProjectRequest, User, TimelineUpdate } from "@/types"

const ManageOrder = () => {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [request, setRequest] = useState<ProjectRequest | null>(null)
  const [timeline, setTimeline] = useState<TimelineUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication
        const userData = authService.getCurrentUser()

        if (!userData || userData.role !== "designer") {
          navigate("/auth")
          return
        }

        setUser(userData)

        if (!id) return

        // Fetch request details
        const requestResponse = await requestService.getRequestById(id)
        const requestData = requestResponse.data

        if (!requestData || requestData.designerId !== userData.id) {
          toast({
            title: "Access denied",
            description: "You don't have permission to manage this order.",
            variant: "destructive",
          })
          navigate("/marketplace")
          return
        }

        setRequest(requestData)

        // Fetch timeline - assuming there's an API endpoint for this
        const timelineResponse = await fetch(`/api/timeline/${id}`)
        const timelineData = await timelineResponse.json()
        setTimeline(timelineData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load order details",
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

  const handleAddTimelineUpdate = async (
    status: TimelineUpdate["status"],
    message: string,
    paymentRequired: boolean,
    paymentAmount?: number,
  ) => {
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
          paymentRequired,
          paymentAmount,
        }),
      })

      const newUpdate = await response.json()
      setTimeline((prev) => [...prev, newUpdate])

      // If status is 'delivered', update request status to 'completed'
      if (status === "delivered" && request) {
        setRequest({ ...request, status: "completed" })
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <p>Order not found</p>
        </div>
      </div>
    )
  }

  // Get existing timeline status updates
  const existingTimelineStatuses = timeline.map((update) => update.status)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex-1 container mx-auto py-8 px-4 max-w-screen-xl">
        <div className="mb-6">
          <Link to="/marketplace" className="text-fashion-purple hover:underline">
            ← Back to Marketplace
          </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif text-fashion-purple">Manage Order: {request.title}</h1>
            <div className="flex items-center mt-2">
              <Badge
                className={
                  request.status === "completed"
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }
              >
                {request.status === "completed" ? "Completed" : "In Progress"}
              </Badge>
              <span className="text-sm text-gray-500 ml-2">Accepted on {formatDate(request.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Timeline updates={timeline} isDesigner={true} />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Customer:</dt>
                    <dd className="text-sm font-medium">{request.customerName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Material:</dt>
                    <dd className="text-sm font-medium">{request.material}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Price:</dt>
                    <dd className="text-sm font-medium text-green-600">${request.acceptedPrice?.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Timeframe:</dt>
                    <dd className="text-sm font-medium">{request.timeframe}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <TimelineUpdateForm
              onSubmit={(status, message) => {
                // Calculate payment amount for different stages
                let paymentRequired = false
                let paymentAmount

                if (["stitched", "fitting"].includes(status)) {
                  paymentRequired = true
                  paymentAmount = (request.acceptedPrice || 0) * 0.25 // 25% for each stage
                }

                // Final payment for delivery
                if (status === "delivered") {
                  paymentRequired = true
                  paymentAmount = (request.acceptedPrice || 0) * 0.25 // Remaining 25%
                }

                handleAddTimelineUpdate(status, message, paymentRequired, paymentAmount)
              }}
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Payment Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span>Initial Payment (25%)</span>
                    <span>${((request.acceptedPrice || 0) * 0.25).toFixed(2)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Stitching Complete (25%)</span>
                    <span>${((request.acceptedPrice || 0) * 0.25).toFixed(2)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Fitting Complete (25%)</span>
                    <span>${((request.acceptedPrice || 0) * 0.25).toFixed(2)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Delivery (25%)</span>
                    <span>${((request.acceptedPrice || 0) * 0.25).toFixed(2)}</span>
                  </li>
                  <li className="flex justify-between font-medium border-t pt-2">
                    <span>Total</span>
                    <span>${(request.acceptedPrice || 0).toFixed(2)}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Button
              onClick={() => navigate(`/requests/${request.id}`)}
              className="w-full bg-fashion-purple hover:bg-fashion-purple-dark"
            >
              View Request Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManageOrder
