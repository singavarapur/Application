"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "@/components/layout/Navbar"
import RequestForm from "@/components/customer/RequestForm"
import type { User } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { authService, requestService } from "@/services/api"

const NewRequest = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = authService.getCurrentUser()

        if (!userData || userData.role !== "customer") {
          // If not logged in or not a customer, redirect to auth
          navigate("/auth")
          return
        }

        setUser(userData)
      } catch (error) {
        console.error("Error checking auth:", error)
        navigate("/auth")
      }
    }

    checkAuth()
  }, [navigate])

  const handleLogout = async () => {
    try {
      authService.logout()
      navigate("/auth")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleSubmitRequest = async (requestData: {
    title: string
    description: string
    material: string
    budget?: number
    timeframe: string
    images: File[]
    additionalDetails?: string
    size?: string
  }) => {
    if (!user) {
      toast({
        title: "Not authorized",
        description: "Please log in to submit a request",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // In a real app, we would upload the images to a server and get URLs back
      // For now, we'll just create URLs from the File objects
      const imageUrls = requestData.images.map((file) => URL.createObjectURL(file))

      await requestService.createRequest({
        title: requestData.title,
        description: requestData.description,
        material: requestData.material,
        budget: requestData.budget,
        timeframe: requestData.timeframe,
        images: imageUrls,
        additionalDetails: requestData.additionalDetails,
        size: requestData.size,
      })

      toast({
        title: "Request submitted successfully!",
        description: "Designers will be able to see your request and submit proposals.",
      })

      // Redirect to my requests page
      navigate("/my-requests")
    } catch (error) {
      toast({
        title: "Error submitting request",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null // Will redirect in the useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex-1 container mx-auto py-8 px-4 max-w-screen-xl">
        <h1 className="text-3xl font-serif text-fashion-purple text-center mb-8">Create New Fashion Request</h1>

        <RequestForm onSubmit={handleSubmitRequest} />
      </div>
    </div>
  )
}

export default NewRequest
