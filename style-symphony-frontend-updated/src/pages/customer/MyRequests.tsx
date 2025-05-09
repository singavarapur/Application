"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "@/components/layout/Navbar"
import RequestCard from "@/components/customer/RequestCard"
import type { ProjectRequest, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authService, requestService } from "@/services/api"

const MyRequests = () => {
  const [user, setUser] = useState<User | null>(null)
  const [requests, setRequests] = useState<ProjectRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuthAndFetchRequests = async () => {
      try {
        const userData = authService.getCurrentUser()

        if (!userData || userData.role !== "customer") {
          // If not logged in or not a customer, redirect to auth
          navigate("/auth")
          return
        }

        setUser(userData)

        // Fetch the user's requests
        const response = await requestService.getRequests({ customerId: userData.id })
        setRequests(response.data)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetchRequests()
  }, [navigate])

  const handleLogout = async () => {
    try {
      authService.logout()
      navigate("/auth")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const filteredRequests = () => {
    if (activeTab === "all") return requests
    return requests.filter((request) => request.status === activeTab)
  }

  if (!user) {
    return null // Will redirect in the useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex-1 container mx-auto py-8 px-4 max-w-screen-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-serif text-fashion-purple mb-4 md:mb-0">My Fashion Requests</h1>
          <Link to="/new-request">
            <Button className="bg-fashion-purple hover:bg-fashion-purple-dark">Create New Request</Button>
          </Link>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="assigned">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="text-center py-10">Loading your requests...</div>
            ) : filteredRequests().length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRequests().map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 mb-4">
                  {activeTab === "all"
                    ? "You haven't created any requests yet."
                    : `You don't have any ${activeTab} requests.`}
                </p>
                <Link to="/new-request">
                  <Button className="bg-fashion-purple hover:bg-fashion-purple-dark">Create Your First Request</Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default MyRequests
