"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import Navbar from "@/components/layout/Navbar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import type { ProjectRequest, User, TimelineUpdate } from "@/types"
import { authService, requestService } from "@/services/api"

const Payment = () => {
  const { id, updateId } = useParams<{ id: string; updateId: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [request, setRequest] = useState<ProjectRequest | null>(null)
  const [timelineUpdate, setTimelineUpdate] = useState<TimelineUpdate | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication
        const userData = authService.getCurrentUser()

        if (!userData || userData.role !== "customer") {
          navigate("/auth")
          return
        }

        setUser(userData)

        if (!id || !updateId) return

        // Fetch request details
        const requestResponse = await requestService.getRequestById(id)
        const requestData = requestResponse.data

        if (!requestData || requestData.customerId !== userData.id) {
          toast({
            title: "Access denied",
            description: "You don't have permission to view this payment page.",
            variant: "destructive",
          })
          navigate("/my-requests")
          return
        }

        setRequest(requestData)

        // Fetch timeline updates - assuming there's an API endpoint for this
        // This might need to be adjusted based on your actual API structure
        const timelineResponse = await fetch(`/api/timeline/${id}`)
        const timelineData = await timelineResponse.json()
        const update = timelineData.find((u) => u.id === updateId)

        if (!update || !update.paymentRequired || update.paymentStatus === "paid") {
          toast({
            title: "Payment not required",
            description: "This update does not require payment or has already been paid.",
            variant: "destructive",
          })
          navigate(`/requests/${id}`)
          return
        }

        setTimelineUpdate(update)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load payment details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, updateId, navigate, toast])

  const handleLogout = async () => {
    try {
      authService.logout()
      navigate("/auth")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleMakePayment = async () => {
    if (!request || !timelineUpdate || !timelineUpdate.paymentAmount) return

    try {
      setProcessingPayment(true)

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Assuming there's a payment API endpoint
      await fetch(`/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.id,
          timelineUpdateId: timelineUpdate.id,
          amount: timelineUpdate.paymentAmount,
        }),
      })

      toast({
        title: "Payment successful",
        description: `Your payment of $${timelineUpdate.paymentAmount.toFixed(2)} has been processed.`,
      })

      navigate(`/requests/${request.id}`)
    } catch (error) {
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive",
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "assigned":
        return "Order Assigned"
      case "stitched":
        return "Stitching Complete"
      case "dyed":
        return "Dyeing Complete"
      case "fitting":
        return "Fitting Complete"
      case "out_for_delivery":
        return "Out for Delivery"
      case "delivered":
        return "Delivered"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (!request || !timelineUpdate) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <p>Payment details not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex-1 container mx-auto py-8 px-4 max-w-screen-md">
        <div className="mb-6">
          <Link to={`/requests/${request.id}`} className="text-fashion-purple hover:underline">
            ← Back to Request Details
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <CardTitle className="text-2xl font-serif text-fashion-purple">Payment Details</CardTitle>
            <CardDescription>
              For {request.title} - {getStatusLabel(timelineUpdate.status)}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Order Summary</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-gray-500">Order ID:</dt>
                  <dd className="font-medium">{request.id}</dd>
                  <dt className="text-gray-500">Designer:</dt>
                  <dd className="font-medium">{request.designerName}</dd>
                  <dt className="text-gray-500">Material:</dt>
                  <dd className="font-medium">{request.material}</dd>
                  <dt className="text-gray-500">Total Price:</dt>
                  <dd className="font-medium">${request.acceptedPrice?.toFixed(2)}</dd>
                </dl>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Payment for: {getStatusLabel(timelineUpdate.status)}</h3>
                <p className="text-sm text-gray-600 mb-4">{timelineUpdate.message}</p>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-800 font-medium">Payment Amount:</span>
                    <span className="text-xl font-bold text-amber-800">
                      ${timelineUpdate.paymentAmount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-700 mb-2">Payment Method</h3>
                <div className="flex items-center space-x-2 p-3 border rounded-lg mb-4">
                  <div className="w-8 h-5 bg-blue-600 rounded"></div>
                  <span className="font-medium">Credit Card ending in 1234</span>
                  <span className="ml-auto text-sm text-green-600">Default</span>
                </div>
                <p className="text-xs text-gray-500">
                  This is a demo payment page. No actual payment will be processed.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-2 pt-0">
            <Button
              onClick={handleMakePayment}
              disabled={processingPayment}
              className="w-full bg-fashion-purple hover:bg-fashion-purple-dark h-12"
            >
              {processingPayment ? "Processing..." : `Pay $${timelineUpdate.paymentAmount?.toFixed(2)}`}
            </Button>

            <Button variant="ghost" onClick={() => navigate(`/requests/${request.id}`)} className="w-full">
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default Payment
