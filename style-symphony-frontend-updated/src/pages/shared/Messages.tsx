"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "@/components/layout/Navbar"
import Chat from "@/components/shared/Chat"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User, Message } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { authService, userService, chatService, proposalService, requestService } from "@/services/api"

interface ChatPartner {
  user: User
  lastMessage?: Message
}

const Messages = () => {
  const [user, setUser] = useState<User | null>(null)
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([])
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const userData = authService.getCurrentUser()

        if (!userData) {
          navigate("/auth")
          return
        }

        setUser(userData)

        // Get users who have interacted with the current user
        const partners: ChatPartner[] = []

        if (userData.role === "customer") {
          // Customers can chat with designers who have proposals on their requests
          const requestsResponse = await requestService.getRequests({ customerId: userData.id })
          const userRequests = requestsResponse.data

          for (const request of userRequests) {
            if (request.designerId) {
              const designerResponse = await userService.getUserById(request.designerId)
              const designer = designerResponse.data

              if (designer) {
                const messagesResponse = await chatService.getMessages(userData.id, designer.id)
                const messages = messagesResponse.data

                const lastMessage =
                  messages.length > 0
                    ? messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
                    : undefined

                partners.push({
                  user: designer,
                  lastMessage,
                })
              }
            }
          }
        } else {
          // Designers can chat with customers who have accepted their proposals
          const proposalsResponse = await proposalService.getProposals({
            designerId: userData.id,
            status: "accepted",
          })
          const acceptedProposals = proposalsResponse.data

          for (const proposal of acceptedProposals) {
            const requestResponse = await requestService.getRequestById(proposal.requestId)
            const request = requestResponse.data

            if (request) {
              const customerResponse = await userService.getUserById(request.customerId)
              const customer = customerResponse.data

              if (customer) {
                const messagesResponse = await chatService.getMessages(userData.id, customer.id)
                const messages = messagesResponse.data

                const lastMessage =
                  messages.length > 0
                    ? messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
                    : undefined

                partners.push({
                  user: customer,
                  lastMessage,
                })
              }
            }
          }
        }

        setChatPartners(partners)

        // Set default selected partner if available
        if (partners.length > 0) {
          setSelectedPartner(partners[0].user)
          const messagesResponse = await chatService.getMessages(userData.id, partners[0].user.id)
          setMessages(messagesResponse.data)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetchData()
  }, [navigate])

  useEffect(() => {
    const loadMessages = async () => {
      if (!user || !selectedPartner) return

      try {
        const messagesResponse = await chatService.getMessages(user.id, selectedPartner.id)
        setMessages(messagesResponse.data)
      } catch (error) {
        console.error("Error loading messages:", error)
      }
    }

    if (selectedPartner) {
      loadMessages()
    }
  }, [selectedPartner, user])

  const handleLogout = async () => {
    try {
      authService.logout()
      navigate("/auth")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleSelectPartner = (partner: User) => {
    setSelectedPartner(partner)
  }

  const handleSendMessage = async (content: string, image?: File) => {
    if (!user || !selectedPartner) return

    try {
      // Convert image to data URL if provided
      let imageUrl: string | undefined

      if (image) {
        imageUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(reader.result as string)
          }
          reader.readAsDataURL(image)
        })
      }

      const messageData = {
        senderId: user.id,
        receiverId: selectedPartner.id,
        content,
        image: imageUrl,
      }

      const response = await chatService.sendMessage(messageData)
      const newMessage = response.data

      setMessages((prev) => [...prev, newMessage])
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (!user) {
    return null // Will redirect in the useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex-1 container mx-auto py-8 px-4 max-w-screen-xl">
        <h1 className="text-3xl font-serif text-fashion-purple mb-8">Messages</h1>

        {loading ? (
          <div className="text-center py-10">Loading messages...</div>
        ) : chatPartners.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500 mb-4">
              {user.role === "customer"
                ? "You don't have any active projects with designers yet."
                : "You don't have any accepted proposals yet."}
            </p>
            <p>
              {user.role === "customer"
                ? "Create a request and accept a proposal to start chatting with designers."
                : "Submit proposals to customers and get accepted to start chatting."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Card className="h-[600px] overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="font-medium">Conversations</h2>
                </div>
                <div className="overflow-y-auto max-h-[552px]">
                  {chatPartners.map(({ user: partner, lastMessage }) => (
                    <div
                      key={partner.id}
                      onClick={() => handleSelectPartner(partner)}
                      className={`
                        flex items-center gap-3 p-4 border-b cursor-pointer hover:bg-gray-50
                        ${selectedPartner?.id === partner.id ? "bg-fashion-purple-light" : ""}
                      `}
                    >
                      <Avatar>
                        <AvatarImage src={partner.profileImage || "/placeholder.svg"} alt={partner.name} />
                        <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{partner.name}</p>
                        {lastMessage ? (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 truncate">
                              {lastMessage.image ? "📷 Image" : lastMessage.content}
                            </p>
                            <p className="text-xs text-gray-400">{formatTime(lastMessage.timestamp)}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Start a conversation</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="md:col-span-3">
              {selectedPartner ? (
                <Chat
                  messages={messages}
                  currentUser={user}
                  otherUser={selectedPartner}
                  onSendMessage={handleSendMessage}
                />
              ) : (
                <Card className="h-[600px] flex items-center justify-center">
                  <p className="text-gray-500">Select a conversation to start chatting</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Messages
