const express = require("express")
const { Pool } = require("pg")
const bodyParser = require("body-parser")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const NodeCache = require("node-cache")
const multer = require("multer") // Middleware for handling file uploads
const AWS = require("aws-sdk")
require("dotenv").config()

const app = express()
const port = 3001

// Initialize cache with standard TTL of 10 minutes (600 seconds)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 })

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "styleverse-secret-key"
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h"

// Database connection
const pool = new Pool({
  user: process.env.POSTGRES_USER ,
  host: process.env.POSTGRES_HOST ,
  database: process.env.POSTGRES_DB ,
  password: process.env.POSTGRES_PASSWORD,
  port: Number.parseInt(process.env.POSTGRES_PORT),
})

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err)
  } else {
    console.log("Database connected successfully")
  }
})

// AWS S3 configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

// Multer setup for handling file uploads
const storage = multer.memoryStorage() // Store file in memory for S3 upload
const upload = multer({ storage: storage })

// Database query helper
const query = async (text, params) => {
  try {
    const start = Date.now()
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("Executed query", { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error("Error executing query:", error)
    throw error
  }
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid token",
    })
  }
}

// Cache middleware
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== "GET") {
      return next()
    }

    const key = req.originalUrl
    const cachedResponse = cache.get(key)

    if (cachedResponse) {
      console.log(`Cache hit for ${key}`)
      return res.json(cachedResponse)
    }

    // Store the original send function
    const originalSend = res.json

    // Override the send function
    res.json = function (body) {
      // Store the response in cache
      cache.set(key, body, duration)
      // Call the original send function
      originalSend.call(this, body)
    }

    next()
  }
}

// Clear cache for specific routes
const clearCache = (pattern) => {
  const keys = cache.keys()
  const matchingKeys = keys.filter((key) => key.includes(pattern))
  matchingKeys.forEach((key) => cache.del(key))
  console.log(`Cleared cache for pattern: ${pattern}`)
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// AUTH ENDPOINTS
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = "Customer" } = req.body
    console.log("Incoming body:", req.body);

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    if (!["Customer", "Designer", "Admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be Customer, Designer, or Admin",
      })

        
    }

    // Check if user already exists
    const userExists = await query("SELECT * FROM users WHERE email = $1", [email])
    if (userExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const queryText = `
      INSERT INTO users (email, password, first_name, last_name, role, date_joined)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING user_id, email, first_name, last_name, role, date_joined
    `

    const queryParams = [email, hashedPassword, first_name, last_name, role]
    const result = await query(queryText, queryParams)

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: result.rows[0].user_id,
        email: result.rows[0].email,
        role: result.rows[0].role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    )

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: result.rows[0],
        token,
      },
    })
  } catch (error) {
    console.error("Error registering user:", error)
    res.status(500).json({
      success: false,
      message: "Failed to register user",
    })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      })
    }

    // Find user by email
    const result = await query("SELECT * FROM users WHERE email = $1", [email])

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    const user = result.rows[0]

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    )

    // Remove password from user object
    delete user.password

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
      },
    })
  } catch (error) {
    console.error("Error logging in:", error)
    res.status(500).json({
      success: false,
      message: "Failed to login",
    })
  }
})

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId

    const result = await query(
      "SELECT user_id, email, first_name, last_name, role, date_joined FROM users WHERE user_id = $1",
      [userId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    res.json({
      success: true,
      message: "User retrieved successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    })
  }
})

// USERS ENDPOINTS
app.get("/api/users", authenticateToken, cacheMiddleware(300), async (req, res) => {
  try {
    const { userId, role } = req.query

    // Only admins can view all users
    if (req.user.role !== "Admin" && !userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      })
    }

    let queryText = "SELECT user_id, email, first_name, last_name, date_joined, role FROM users"
    const queryParams = []

    if (userId || role) {
      queryText += " WHERE"

      if (userId) {
        queryText += " user_id = $1"
        queryParams.push(userId)
      }

      if (role) {
        if (userId) queryText += " AND"
        queryText += ` role = $${queryParams.length + 1}`
        queryParams.push(role)
      }
    }

    const result = await query(queryText, queryParams)

    res.json({
      success: true,
      message: "Users retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    })
  }
})

app.post("/api/users", authenticateToken, async (req, res) => {
  try {
    // Only admins can create users
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      })
    }

    const { email, password, first_name, last_name, role = "Customer" } = req.body

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    if (!["Customer", "Designer", "Admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be Customer, Designer, or Admin",
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const queryText = `
      INSERT INTO users (email, password, first_name, last_name, role, date_joined)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING user_id, email, first_name, last_name, role, date_joined
    `

    const queryParams = [email, hashedPassword, first_name, last_name, role]
    const result = await query(queryText, queryParams)

    // Clear users cache
    clearCache("/api/users")

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error creating user:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    })
  }
})

// PUT update a user
app.put("/api/users/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params

    // Users can only update their own profile unless they're an admin
    if (req.user.userId !== Number.parseInt(userId) && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own profile.",
      })
    }

    const { email, password, first_name, last_name, role } = req.body

    const updates = []
    const values = []
    let paramCount = 1

    if (email) {
      updates.push(`email = $${paramCount}`)
      values.push(email)
      paramCount++
    }

    if (password) {
      // Hash password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      updates.push(`password = $${paramCount}`)
      values.push(hashedPassword)
      paramCount++
    }

    if (first_name) {
      updates.push(`first_name = $${paramCount}`)
      values.push(first_name)
      paramCount++
    }

    if (last_name) {
      updates.push(`last_name = $${paramCount}`)
      values.push(last_name)
      paramCount++
    }

    // Only admins can change roles
    if (role && req.user.role === "Admin") {
      // Validate role is one of the enum values
      if (!["Customer", "Designer", "Admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Must be Customer, Designer, or Admin",
        })
      }

      updates.push(`role = $${paramCount}`)
      values.push(role)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    values.push(userId)
    const queryText = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE user_id = $${paramCount}
      RETURNING user_id, email, first_name, last_name, role, date_joined
    `

    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Clear users cache
    clearCache("/api/users")

    res.json({
      success: true,
      message: "User updated successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating user:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    })
  }
})

// DELETE a user
app.delete("/api/users/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params

    // Only admins can delete users or users can delete their own account
    if (req.user.userId !== Number.parseInt(userId) && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own account.",
      })
    }

    const queryText = "DELETE FROM users WHERE user_id = $1 RETURNING user_id"
    const result = await query(queryText, [userId])

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Clear users cache
    clearCache("/api/users")

    res.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    })
  }
})

// ADDRESSES ENDPOINTS
app.get("/api/addresses", authenticateToken, cacheMiddleware(300), async (req, res) => {
  try {
    const { addressId, userId } = req.query

    // Users can only view their own addresses unless they're an admin
    if (req.user.role !== "Admin" && (!userId || Number.parseInt(userId) !== req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own addresses.",
      })
    }

    let queryText = "SELECT * FROM addresses"
    const queryParams = []

    if (addressId || userId) {
      queryText += " WHERE"

      if (addressId) {
        queryText += " address_id = $1"
        queryParams.push(addressId)
      }

      if (userId) {
        if (addressId) queryText += " AND"
        queryText += ` user_id = $${queryParams.length + 1}`
        queryParams.push(userId)
      }
    }

    const result = await query(queryText, queryParams)

    res.json({
      success: true,
      message: "Addresses retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching addresses:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
    })
  }
})

// POST create a new address
app.post("/api/addresses", authenticateToken, async (req, res) => {
  try {
    const { user_id, address_line1, city, state, zip_code } = req.body

    // Users can only create addresses for themselves unless they're an admin
    if (req.user.role !== "Admin" && Number.parseInt(user_id) !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only create addresses for yourself.",
      })
    }

    // Validate required fields
    if (!user_id || !address_line1 || !city || !state || !zip_code) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    const queryText = `
      INSERT INTO addresses (user_id, address_line1, city, state, zip_code)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const queryParams = [user_id, address_line1, city, state, zip_code]
    const result = await query(queryText, queryParams)

    // Clear addresses cache for this user
    clearCache(`/api/addresses?userId=${user_id}`)

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error creating address:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create address",
    })
  }
})

// PUT update an address
app.put("/api/addresses/:addressId", async (req, res) => {
  try {
    const { addressId } = req.params
    const { address_line1, city, state, zip_code } = req.body

    // Build update query dynamically based on provided fields
    const updates = []
    const values = []
    let paramCount = 1

    if (address_line1) {
      updates.push(`address_line1 = $${paramCount}`)
      values.push(address_line1)
      paramCount++
    }

    if (city) {
      updates.push(`city = $${paramCount}`)
      values.push(city)
      paramCount++
    }

    if (state) {
      updates.push(`state = $${paramCount}`)
      values.push(state)
      paramCount++
    }

    if (zip_code) {
      updates.push(`zip_code = $${paramCount}`)
      values.push(zip_code)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    values.push(addressId)
    const queryText = `
      UPDATE addresses
      SET ${updates.join(", ")}
      WHERE address_id = $${paramCount}
      RETURNING *
    `

    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    res.json({
      success: true,
      message: "Address updated successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating address:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update address",
    })
  }
})

// DELETE an address
app.delete("/api/addresses/:addressId", async (req, res) => {
  try {
    const { addressId } = req.params

    const queryText = "DELETE FROM addresses WHERE address_id = $1 RETURNING address_id"
    const result = await query(queryText, [addressId])

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    res.json({
      success: true,
      message: "Address deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting address:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
    })
  }
})

// MERCHANTS ENDPOINTS
app.get("/api/merchants", async (req, res) => {
  try {
    const { merchantId, userId, specialty } = req.query

    let queryText = "SELECT * FROM merchants"
    const queryParams = []

    if (merchantId || userId || specialty) {
      queryText += " WHERE"

      if (merchantId) {
        queryText += " merchant_id = $1"
        queryParams.push(merchantId)
      }

      if (userId) {
        if (merchantId) queryText += " AND"
        else if (queryParams.length > 0) queryText += " AND"
        queryText += ` user_id = $${queryParams.length + 1}`
        queryParams.push(userId)
      }

      if (specialty) {
        if (merchantId || userId) queryText += " AND"
        else if (queryParams.length > 0) queryText += " AND"
        queryText += ` specialty = $${queryParams.length + 1}`
        queryParams.push(specialty)
      }
    }

    const result = await query(queryText, queryParams)

    res.json({
      success: true,
      message: "Merchants retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching merchants:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch merchants",
    })
  }
})

app.post("/api/merchants", async (req, res) => {
  try {
    const { user_id, bio, specialty, portfolio, rating } = req.body

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    const queryText = `
      INSERT INTO merchants (user_id, bio, specialty, portfolio, rating)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const queryParams = [user_id, bio, specialty, portfolio, rating]
    const result = await query(queryText, queryParams)

    res.status(201).json({
      success: true,
      message: "Merchant created successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error creating merchant:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create merchant",
    })
  }
})

app.put("/api/merchants/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params
    const { bio, specialty, portfolio, rating } = req.body

    const updates = []
    const values = []
    let paramCount = 1

    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`)
      values.push(bio)
      paramCount++
    }

    if (specialty !== undefined) {
      updates.push(`specialty = $${paramCount}`)
      values.push(specialty)
      paramCount++
    }

    if (portfolio !== undefined) {
      updates.push(`portfolio = $${paramCount}`)
      values.push(portfolio)
      paramCount++
    }

    if (rating !== undefined) {
      updates.push(`rating = $${paramCount}`)
      values.push(rating)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    values.push(merchantId)
    const queryText = `
      UPDATE merchants
      SET ${updates.join(", ")}
      WHERE merchant_id = $${paramCount}
      RETURNING *
    `

    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      })
    }

    res.json({
      success: true,
      message: "Merchant updated successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating merchant:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update merchant",
    })
  }
})

app.delete("/api/merchants/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params

    const queryText = "DELETE FROM merchants WHERE merchant_id = $1 RETURNING merchant_id"
    const result = await query(queryText, [merchantId])

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      })
    }

    res.json({
      success: true,
      message: "Merchant deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting merchant:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete merchant",
    })
  }
})

// CUSTOMIZATION REQUESTS ENDPOINTS

app.get("/api/customization-requests", async (req, res) => {
  try {
    const { requestId, userId, status, priority } = req.query

    let queryText = "SELECT * FROM customization_requests"
    const queryParams = []

    if (requestId || userId || status || priority) {
      queryText += " WHERE"

      if (requestId) {
        queryText += " request_id = $1"
        queryParams.push(requestId)
      }

      if (userId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` user_id = $${queryParams.length + 1}`
        queryParams.push(userId)
      }

      if (status) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` status = $${queryParams.length + 1}`
        queryParams.push(status)
      }

      if (priority) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` priority = $${queryParams.length + 1}`
        queryParams.push(priority)
      }
    }
    queryText += " ORDER BY updated_at DESC"

    const result = await query(queryText, queryParams)

    for (const request of result.rows) {
      const imagesQuery = "SELECT * FROM customization_request_images WHERE request_id = $1"
      const imagesResult = await query(imagesQuery, [request.request_id])
      request.images = imagesResult.rows
    }

    res.json({
      success: true,
      message: "Customization requests retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching customization requests:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch customization requests",
    })
  }
})

// POST create a new customization request (without file upload)
app.post("/api/customization-requests", async (req, res) => {
  try {
    const { user_id, status = "Pending", description, design_images = [], due_date, priority = "normal" } = req.body

    if (!user_id || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    if (!["Pending", "Accepted", "Completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be Pending, Accepted, or Completed",
      })
    }

    const queryText = `
      INSERT INTO customization_requests (
        user_id, status, description, design_images, due_date, priority, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `

    const queryParams = [user_id, status, description, design_images, due_date, priority]
    const result = await query(queryText, queryParams)

    res.status(201).json({
      success: true,
      message: "Customization request created successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error creating customization request:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create customization request",
    })
  }
})

// POST create a new customization request with file upload
app.post(
  "/api/customization-requests/upload",
  authenticateToken,
  upload.array("design_images", 5),
  async (req, res) => {
    try {
      const { user_id, description, due_date, priority = "normal" } = req.body
      const files = req.files

      if (!user_id || !description || !files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields. User ID, description, and at least one image are required.",
        })
      }

      const imageUrls = []

      // Upload each image to S3
      for (const file of files) {
        const uniqueKey = `customization-request/${Date.now()}-${file.originalname}`
        const params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: "public-read", // Adjust ACL as needed
        }

        const s3UploadResult = await s3.upload(params).promise()
        imageUrls.push(s3UploadResult.Location) // Get the public URL
      }

      // Insert the request into the database
      const requestQuery = `
      INSERT INTO customization_requests (
        user_id, status, description, due_date, priority, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `

      const requestParams = [user_id, "Pending", description, due_date, priority]
      const requestResult = await query(requestQuery, requestParams)
      const requestId = requestResult.rows[0].request_id

      // Insert each image URL into the customization_request_images table
      for (const imageUrl of imageUrls) {
        const imageQuery = `
        INSERT INTO customization_request_images (request_id, image_url, uploaded_at)
        VALUES ($1, $2, NOW())
      `
        await query(imageQuery, [requestId, imageUrl])
      }

      // Get the complete request with images
      const completeRequestQuery = "SELECT * FROM customization_requests WHERE request_id = $1"
      const completeRequestResult = await query(completeRequestQuery, [requestId])

      const imagesQuery = "SELECT * FROM customization_request_images WHERE request_id = $1"
      const imagesResult = await query(imagesQuery, [requestId])

      const completeRequest = completeRequestResult.rows[0]
      completeRequest.images = imagesResult.rows

      res.status(201).json({
        success: true,
        message: "Customization request with images created successfully",
        data: completeRequest,
      })
    } catch (error) {
      console.error("Error creating customization request with images:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create customization request with images",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      })
    }
  },
)

app.put("/api/customization-requests/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params
    const { status, description, design_images, due_date, priority } = req.body

    const updates = []
    const values = []
    let paramCount = 1

    if (status) {
      if (!["Pending", "Accepted", "Completed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be Pending, Accepted, or Completed",
        })
      }

      updates.push(`status = $${paramCount}`)
      values.push(status)
      paramCount++
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`)
      values.push(description)
      paramCount++
    }

    if (design_images !== undefined) {
      updates.push(`design_images = $${paramCount}`)
      values.push(design_images)
      paramCount++
    }

    if (due_date !== undefined) {
      updates.push(`due_date = $${paramCount}`)
      values.push(due_date)
      paramCount++
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramCount}`)
      values.push(priority)
      paramCount++
    }

    updates.push(`updated_at = NOW()`)

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    values.push(requestId)
    const queryText = `
      UPDATE customization_requests
      SET ${updates.join(", ")}
      WHERE request_id = $${paramCount}
      RETURNING *
    `

    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Customization request not found",
      })
    }

    res.json({
      success: true,
      message: "Customization request updated successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating customization request:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update customization request",
    })
  }
})

app.delete("/api/customization-requests/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params

    await query("DELETE FROM customization_request_images WHERE request_id = $1", [requestId])

    const queryText = "DELETE FROM customization_requests WHERE request_id = $1 RETURNING request_id"
    const result = await query(queryText, [requestId])

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Customization request not found",
      })
    }

    res.json({
      success: true,
      message: "Customization request deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting customization request:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete customization request",
    })
  }
})

//=============================================================================
// CUSTOMIZATION REQUEST IMAGES ENDPOINTS
//=============================================================================

// GET all images for a request
app.get("/api/customization-request-images/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params

    const queryText = "SELECT * FROM customization_request_images WHERE request_id = $1"
    const result = await query(queryText, [requestId])

    res.json({
      success: true,
      message: "Customization request images retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching customization request images:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch customization request images",
    })
  }
})

// POST add a new image to a request
app.post("/api/customization-request-images", async (req, res) => {
  try {
    const { request_id, image_url } = req.body

    // Validate required fields
    if (!request_id || !image_url) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    const queryText = `
      INSERT INTO customization_request_images (request_id, image_url, uploaded_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `

    const queryParams = [request_id, image_url]
    const result = await query(queryText, queryParams)

    // Update the request's updated_at timestamp
    await query("UPDATE customization_requests SET updated_at = NOW() WHERE request_id = $1", [request_id])

    res.status(201).json({
      success: true,
      message: "Customization request image added successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error adding customization request image:", error)
    res.status(500).json({
      success: false,
      message: "Failed to add customization request image",
    })
  }
})

// POST upload a new image to S3 and add to a request
app.post("/api/customization-request-images/upload", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { request_id } = req.body
    const file = req.file

    if (!request_id || !file) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. Request ID and image are required.",
      })
    }

    // Upload image to S3
    const uniqueKey = `customization-request/${Date.now()}-${file.originalname}`
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    }

    const s3UploadResult = await s3.upload(params).promise()
    const imageUrl = s3UploadResult.Location

    // Insert the image URL into the database
    const queryText = `
      INSERT INTO customization_request_images (request_id, image_url, uploaded_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `

    const queryParams = [request_id, imageUrl]
    const result = await query(queryText, queryParams)

    // Update the request's updated_at timestamp
    await query("UPDATE customization_requests SET updated_at = NOW() WHERE request_id = $1", [request_id])

    res.status(201).json({
      success: true,
      message: "Customization request image uploaded successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error uploading customization request image:", error)
    res.status(500).json({
      success: false,
      message: "Failed to upload customization request image",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// DELETE an image
app.delete("/api/customization-request-images/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params

    // Get the request_id before deleting the image
    const getRequestIdQuery = "SELECT request_id FROM customization_request_images WHERE image_id = $1"
    const requestIdResult = await query(getRequestIdQuery, [imageId])

    if (requestIdResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      })
    }

    const requestId = requestIdResult.rows[0].request_id

    // Delete the image
    const queryText = "DELETE FROM customization_request_images WHERE image_id = $1 RETURNING image_id"
    const result = await query(queryText, [imageId])

    // Update the request's updated_at timestamp
    await query("UPDATE customization_requests SET updated_at = NOW() WHERE request_id = $1", [requestId])

    res.json({
      success: true,
      message: "Customization request image deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting customization request image:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete customization request image",
    })
  }
})

//=============================================================================
// DESIGNER PROPOSALS ENDPOINTS
//=============================================================================

// GET all designer proposals or filter by proposalId/requestId/merchantId/status
app.get("/api/designer-proposals", async (req, res) => {
  try {
    const { proposalId, requestId, merchantId, status } = req.query

    let queryText = "SELECT * FROM designer_proposals"
    const queryParams = []

    if (proposalId || requestId || merchantId || status) {
      queryText += " WHERE"

      if (proposalId) {
        queryText += " proposal_id = $1"
        queryParams.push(proposalId)
      }

      if (requestId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` request_id = $${queryParams.length + 1}`
        queryParams.push(requestId)
      }

      if (merchantId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` merchant_id = $${queryParams.length + 1}`
        queryParams.push(merchantId)
      }

      if (status) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` status = $${queryParams.length + 1}`
        queryParams.push(status)
      }
    }

    // Order by created_at desc
    queryText += " ORDER BY created_at DESC"

    const result = await query(queryText, queryParams)

    res.json({
      success: true,
      message: "Designer proposals retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching designer proposals:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch designer proposals",
    })
  }
})

// POST create a new designer proposal
app.post("/api/designer-proposals", async (req, res) => {
  try {
    const { request_id, merchant_id, price, status = "Pending" } = req.body

    // Validate required fields
    if (!request_id || !merchant_id || !price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Validate status is one of the enum values
    if (!["Pending", "Accepted", "Cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be Pending, Accepted, or Cancelled",
      })
    }

    const queryText = `
      INSERT INTO designer_proposals (request_id, merchant_id, price, status, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `

    const queryParams = [request_id, merchant_id, price, status]
    const result = await query(queryText, queryParams)

    res.status(201).json({
      success: true,
      message: "Designer proposal created successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error creating designer proposal:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create designer proposal",
    })
  }
})

// PUT update a designer proposal
app.put("/api/designer-proposals/:proposalId", async (req, res) => {
  try {
    const { proposalId } = req.params
    const { price, status } = req.body

    // Build update query dynamically based on provided fields
    const updates = []
    const values = []
    let paramCount = 1

    if (price !== undefined) {
      updates.push(`price = $${paramCount}`)
      values.push(price)
      paramCount++
    }

    if (status) {
      // Validate status is one of the enum values
      if (!["Pending", "Accepted", "Cancelled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be Pending, Accepted, or Cancelled",
        })
      }

      updates.push(`status = $${paramCount}`)
      values.push(status)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    values.push(proposalId)
    const queryText = `
      UPDATE designer_proposals
      SET ${updates.join(", ")}
      WHERE proposal_id = $${paramCount}
      RETURNING *
    `

    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Designer proposal not found",
      })
    }

    res.json({
      success: true,
      message: "Designer proposal updated successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating designer proposal:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update designer proposal",
    })
  }
})

// DELETE a designer proposal
app.delete("/api/designer-proposals/:proposalId", async (req, res) => {
  try {
    const { proposalId } = req.params

    const queryText = "DELETE FROM designer_proposals WHERE proposal_id = $1 RETURNING proposal_id"
    const result = await query(queryText, [proposalId])

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Designer proposal not found",
      })
    }

    res.json({
      success: true,
      message: "Designer proposal deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting designer proposal:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete designer proposal",
    })
  }
})

//=============================================================================
// ORDERS ENDPOINTS
//=============================================================================

// GET all orders or filter by orderId/userId/status
app.get("/api/orders", async (req, res) => {
  try {
    const { orderId, userId, merchantId, status } = req.query

    let queryText = "SELECT * FROM orders"
    const queryParams = []

    if (orderId || userId || merchantId || status) {
      queryText += " WHERE"

      if (orderId) {
        queryText += " order_id = $1"
        queryParams.push(orderId)
      }

      if (userId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` user_id = $${queryParams.length + 1}`
        queryParams.push(userId)
      }

      if (merchantId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` merchant_id = $${queryParams.length + 1}`
        queryParams.push(merchantId)
      }

      if (status) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` status = $${queryParams.length + 1}`
        queryParams.push(status)
      }
    }

    // Order by created_at desc
    queryText += " ORDER BY created_at DESC"

    const result = await query(queryText, queryParams)

    res.json({
      success: true,
      message: "Orders retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching orders:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    })
  }
})

// POST create a new order
app.post("/api/orders", async (req, res) => {
  try {
    const { user_id, merchant_id, total_amount, status = "Pending" } = req.body

    // Validate required fields
    if (!user_id || !merchant_id || !total_amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Validate status is one of the enum values
    if (!["Pending", "Shipped", "Completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be Pending, Shipped, or Completed",
      })
    }

    const queryText = `
      INSERT INTO orders (user_id, merchant_id, total_amount, status, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `

    const queryParams = [user_id, merchant_id, total_amount, status]
    const result = await query(queryText, queryParams)

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error creating order:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    })
  }
})

// PUT update an order
app.put("/api/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params
    const { total_amount, status } = req.body

    // Build update query dynamically based on provided fields
    const updates = []
    const values = []
    let paramCount = 1

    if (total_amount !== undefined) {
      updates.push(`total_amount = $${paramCount}`)
      values.push(total_amount)
      paramCount++
    }

    if (status) {
      // Validate status is one of the enum values
      if (!["Pending", "Shipped", "Completed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be Pending, Shipped, or Completed",
        })
      }

      updates.push(`status = $${paramCount}`)
      values.push(status)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    values.push(orderId)
    const queryText = `
      UPDATE orders
      SET ${updates.join(", ")}
      WHERE order_id = $${paramCount}
      RETURNING *
    `

    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    res.json({
      success: true,
      message: "Order updated successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating order:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update order",
    })
  }
})

// DELETE an order
app.delete("/api/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params

    const queryText = "DELETE FROM orders WHERE order_id = $1 RETURNING order_id"
    const result = await query(queryText, [orderId])

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    res.json({
      success: true,
      message: "Order deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting order:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
    })
  }
})

//=============================================================================
// PAYMENTS ENDPOINTS
//=============================================================================

// GET all payments or filter by paymentId/userId/merchantId/orderId/status
app.get("/api/payments", async (req, res) => {
  try {
    const { paymentId, userId, merchantId, orderId, status, payment_type } = req.query

    let queryText = "SELECT * FROM payments"
    const queryParams = []

    if (paymentId || userId || merchantId || orderId || status || payment_type) {
      queryText += " WHERE"

      if (paymentId) {
        queryText += " payment_id = $1"
        queryParams.push(paymentId)
      }

      if (userId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` user_id = $${queryParams.length + 1}`
        queryParams.push(userId)
      }

      if (merchantId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` merchant_id = $${queryParams.length + 1}`
        queryParams.push(merchantId)
      }

      if (orderId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` order_id = $${queryParams.length + 1}`
        queryParams.push(orderId)
      }

      if (status) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` status = $${queryParams.length + 1}`
        queryParams.push(status)
      }

      if (payment_type) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` payment_type = $${queryParams.length + 1}`
        queryParams.push(payment_type)
      }
    }

    // Order by transaction_date desc
    queryText += " ORDER BY transaction_date DESC"

    const result = await query(queryText, queryParams)

    res.json({
      success: true,
      message: "Payments retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching payments:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    })
  }
})

// POST create a new payment
app.post("/api/payments", async (req, res) => {
  try {
    const {
      user_id,
      merchant_id,
      order_id,
      amount,
      payment_method,
      payment_type,
      status = "Pending",
      transaction_id,
    } = req.body

    // Validate required fields
    if (!user_id || !merchant_id || !order_id || !amount || !payment_method || !payment_type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Validate status is one of the enum values
    if (!["Pending", "Completed", "Failed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be Pending, Completed, or Failed",
      })
    }

    // Validate payment_type is one of the enum values
    if (!["Customer Payment", "Merchant Payout"].includes(payment_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment_type. Must be Customer Payment or Merchant Payout",
      })
    }

    const queryText = `
      INSERT INTO payments (
        user_id, merchant_id, order_id, amount, payment_method, 
        payment_type, status, transaction_id, transaction_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `

    const queryParams = [user_id, merchant_id, order_id, amount, payment_method, payment_type, status, transaction_id]

    const result = await query(queryText, queryParams)

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error creating payment:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create payment",
    })
  }
})

// PUT update a payment
app.put("/api/payments/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params
    const { amount, payment_method, payment_type, status, transaction_id } = req.body

    // Build update query dynamically based on provided fields
    const updates = []
    const values = []
    let paramCount = 1

    if (amount !== undefined) {
      updates.push(`amount = $${paramCount}`)
      values.push(amount)
      paramCount++
    }

    if (payment_method) {
      updates.push(`payment_method = $${paramCount}`)
      values.push(payment_method)
      paramCount++
    }

    if (payment_type) {
      // Validate payment_type is one of the enum values
      if (!["Customer Payment", "Merchant Payout"].includes(payment_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment_type. Must be Customer Payment or Merchant Payout",
        })
      }

      updates.push(`payment_type = $${paramCount}`)
      values.push(payment_type)
      paramCount++
    }

    if (status) {
      // Validate status is one of the enum values
      if (!["Pending", "Completed", "Failed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be Pending, Completed, or Failed",
        })
      }

      updates.push(`status = $${paramCount}`)
      values.push(status)
      paramCount++
    }

    if (transaction_id !== undefined) {
      updates.push(`transaction_id = $${paramCount}`)
      values.push(transaction_id)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    values.push(paymentId)
    const queryText = `
      UPDATE payments
      SET ${updates.join(", ")}
      WHERE payment_id = $${paramCount}
      RETURNING *
    `

    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      })
    }

    res.json({
      success: true,
      message: "Payment updated successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating payment:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update payment",
    })
  }
})

// DELETE a payment
app.delete("/api/payments/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params

    const queryText = "DELETE FROM payments WHERE payment_id = $1 RETURNING payment_id"
    const result = await query(queryText, [paymentId])

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      })
    }

    res.json({
      success: true,
      message: "Payment deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting payment:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete payment",
    })
  }
})

//=============================================================================
// CHAT ENDPOINTS
//=============================================================================

// GET all chat messages or filter by chatId/senderId/receiverId
app.get("/api/chat", async (req, res) => {
  try {
    const { chatId, senderId, receiverId } = req.query

    let queryText = "SELECT * FROM chat"
    const queryParams = []

    if (chatId || senderId || receiverId) {
      queryText += " WHERE"

      if (chatId) {
        queryText += " chat_id = $1"
        queryParams.push(chatId)
      }

      if (senderId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` sender_id = $${queryParams.length + 1}`
        queryParams.push(senderId)
      }

      if (receiverId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` receiver_id = $${queryParams.length + 1}`
        queryParams.push(receiverId)
      }
    }

    // Add order by timestamp
    queryText += " ORDER BY timestamp ASC"

    const result = await query(queryText, queryParams)

    res.json({
      success: true,
      message: "Chat messages retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching chat messages:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages",
    })
  }
})

// POST create a new chat message
app.post("/api/chat", async (req, res) => {
  try {
    const { sender_id, receiver_id, message, status = "sent" } = req.body

    // Validate required fields
    if (!sender_id || !receiver_id || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    const queryText = `
      INSERT INTO chat (sender_id, receiver_id, message, status, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `

    const queryParams = [sender_id, receiver_id, message, status]
    const result = await query(queryText, queryParams)

    res.status(201).json({
      success: true,
      message: "Chat message sent successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error sending chat message:", error)
    res.status(500).json({
      success: false,
      message: "Failed to send chat message",
    })
  }
})

// PUT update a chat message
app.put("/api/chat/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params
    const { message, status } = req.body

    // Build update query dynamically based on provided fields
    const updates = []
    const values = []
    let paramCount = 1

    if (message) {
      updates.push(`message = $${paramCount}`)
      values.push(message)
      paramCount++
    }

    if (status) {
      updates.push(`status = $${paramCount}`)
      values.push(status)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    values.push(chatId)
    const queryText = `
      UPDATE chat
      SET ${updates.join(", ")}
      WHERE chat_id = $${paramCount}
      RETURNING *
    `

    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat message not found",
      })
    }

    res.json({
      success: true,
      message: "Chat message updated successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating chat message:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update chat message",
    })
  }
})

// DELETE a chat message
app.delete("/api/chat/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params

    const queryText = "DELETE FROM chat WHERE chat_id = $1 RETURNING chat_id"
    const result = await query(queryText, [chatId])

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat message not found",
      })
    }

    res.json({
      success: true,
      message: "Chat message deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting chat message:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete chat message",
    })
  }
})

//=============================================================================
// REVIEWS ENDPOINTS
//=============================================================================

// GET all reviews or filter by reviewId/userId/merchantId
app.get("/api/reviews", async (req, res) => {
  try {
    const { reviewId, userId, merchantId } = req.query

    let queryText = "SELECT * FROM reviews"
    const queryParams = []

    if (reviewId || userId || merchantId) {
      queryText += " WHERE"

      if (reviewId) {
        queryText += " review_id = $1"
        queryParams.push(reviewId)
      }

      if (userId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` user_id = $${queryParams.length + 1}`
        queryParams.push(userId)
      }

      if (merchantId) {
        if (queryParams.length > 0) queryText += " AND"
        queryText += ` merchant_id = $${queryParams.length + 1}`
        queryParams.push(merchantId)
      }
    }

    // Add order by created_at
    queryText += " ORDER BY created_at DESC"

    const result = await query(queryText, queryParams)

    res.json({
      success: true,
      message: "Reviews retrieved successfully",
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    })
  }
})

// POST create a new review
app.post("/api/reviews", async (req, res) => {
  try {
    const { user_id, merchant_id, rating, review_text } = req.body

    // Validate required fields
    if (!user_id || !merchant_id || !rating) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      })
    }

    const queryText = `
      INSERT INTO reviews (user_id, merchant_id, rating, review_text, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `

    const queryParams = [user_id, merchant_id, rating, review_text]
    const result = await query(queryText, queryParams)

    // The merchant rating will be updated automatically by the trigger

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error creating review:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create review",
    })
  }
})

// PUT update a review
app.put("/api/reviews/:reviewId", async (req, res) => {
  try {
    const { reviewId } = req.params
    const { rating, review_text } = req.body

    // Build update query dynamically based on provided fields
    const updates = []
    const values = []
    let paramCount = 1

    if (rating !== undefined) {
      // Validate rating
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        })
      }

      updates.push(`rating = $${paramCount}`)
      values.push(rating)
      paramCount++
    }

    if (review_text !== undefined) {
      updates.push(`review_text = $${paramCount}`)
      values.push(review_text)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      })
    }

    values.push(reviewId)
    const queryText = `
      UPDATE reviews
      SET ${updates.join(", ")}
      WHERE review_id = $${paramCount}
      RETURNING *
    `

    const result = await query(queryText, values)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      })
    }

    // Update merchant rating manually since we're not using the trigger for updates
    await updateMerchantRating(result.rows[0].merchant_id)

    res.json({
      success: true,
      message: "Review updated successfully",
      data: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating review:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update review",
    })
  }
})

// DELETE a review
app.delete("/api/reviews/:reviewId", async (req, res) => {
  try {
    const { reviewId } = req.params

    // Get the merchant_id before deleting
    const getReviewQuery = "SELECT merchant_id FROM reviews WHERE review_id = $1"
    const reviewResult = await query(getReviewQuery, [reviewId])

    if (reviewResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      })
    }

    const merchantId = reviewResult.rows[0].merchant_id

    // Delete the review
    const deleteQuery = "DELETE FROM reviews WHERE review_id = $1 RETURNING review_id"
    const result = await query(deleteQuery, [reviewId])

    // Update merchant rating manually since we're not using the trigger for deletes
    await updateMerchantRating(merchantId)

    res.json({
      success: true,
      message: "Review deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting review:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete review",
    })
  }
})

// Helper function to update merchant rating
async function updateMerchantRating(merchantId) {
  try {
    const ratingQuery = `
      SELECT AVG(rating) as average_rating
      FROM reviews
      WHERE merchant_id = $1
      }
    `

    const ratingResult = await query(ratingQuery, [merchantId])
    const averageRating = ratingResult.rows[0].average_rating || 0

    const updateQuery = `
      UPDATE merchants
      SET rating = $1
      WHERE merchant_id = $2
    `

    await query(updateQuery, [averageRating, merchantId])
  } catch (error) {
    console.error("Error updating merchant rating:", error)
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
