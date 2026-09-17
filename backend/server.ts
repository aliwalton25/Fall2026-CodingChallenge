import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

// Structure for a collection stored by the backend
interface Collection {
  id: number
  name: string
  images: any[]
}

// Temporary storage for collections
let collections: Collection[] = []

// Allow the frontend to communicate with this server
app.use(cors())

// Allow the server to understand JSON data
app.use(express.json())

// Simple route used to check that the API is running
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' })
})

// Return all collections
app.get('/api/collections', (req, res) => {
  res.json(collections)
})

// Create a new collection
app.post('/api/collections', (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Collection name is required' })
  }

  const newCollection: Collection = {
    id: Date.now(),
    name: name,
    images: []
  }

  collections.push(newCollection)

  res.status(201).json(newCollection)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})