export interface User {
  last_name: string
  first_name: string
  id: string
  name: string
  email: string
  role: "customer" | "designer"
  profileImage?: string
}

export interface ProjectRequest {
  id: string
  title: string
  description: string
  customerId: string
  customerName: string
  images: string[]
  material: string
  budget?: number
  timeframe?: string
  status: "open" | "assigned" | "completed"
  createdAt: string
  additionalDetails?: string
  acceptedProposalId?: string
  acceptedPrice?: number
  designerId?: string
  designerName?: string
  size?: string
}

export interface Proposal {
  id: string
  requestId: string
  designerId: string
  designerName: string
  designerImage?: string
  price: number
  estimatedTime: string
  message: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  timestamp: string
  read: boolean
  image?: string
}

export interface TimelineUpdate {
  id: string
  requestId: string
  status:
    | "design"
    | "material"
    | "production"
    | "quality"
    | "shipping"
    | "delivered"
    | "assigned"
    | "stitched"
    | "dyed"
    | "fitting"
    | "out_for_delivery"
  message: string
  timestamp: string
  paymentRequired?: boolean
  paymentAmount?: number
  paymentStatus?: "pending" | "paid" | "not_required"
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface Payment {
  id: string
  requestId: string
  timelineUpdateId: string
  amount: number
  status: "pending" | "paid" | "failed"
  timestamp: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: "custom" | "clothing" | "accessories"
  images: string[]
  sizes?: string[]
  colors?: string[]
  inStock: boolean
}

// Add new types for API responses
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  role: "Customer" | "Designer" | "Admin"
}
