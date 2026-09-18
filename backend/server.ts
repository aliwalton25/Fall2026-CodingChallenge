import express from 'express'
import cors from 'cors'
import fs from 'fs'

const app = express()
const PORT = 3001

// Structure for a collection stored by the backend
interface Collection {
  id: number
  name: string
  images: any[]
}

// Load saved collections from the data file
const dataFile = './data.json'

let collections: Collection[] = []

if (fs.existsSync(dataFile)) {
  const savedData = fs.readFileSync(dataFile, 'utf-8')
  collections = JSON.parse(savedData)
}

// Save the current collections to the data file
const saveCollections = () => {
  fs.writeFileSync(
    dataFile,
    JSON.stringify(collections, null, 2)
  )
}

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

// Save an image to a collection
app.post('/api/collections/:id/images', (req, res) => {
  const collectionId = Number(req.params.id)
  const image = req.body

  const collection = collections.find(
    (collection) => collection.id === collectionId
  )

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' })
  }

  collection.images.push(image)

  saveCollections()

  res.status(201).json(collection)
})

// Remove an image from a collection
app.delete('/api/collections/:id/images/:imageId', (req, res) => {
  const collectionId = Number(req.params.id)
  const imageId = Number(req.params.imageId)

  const collection = collections.find(
    (collection) => collection.id === collectionId
  )

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' })
  }

  collection.images = collection.images.filter(
    (image) => image.id !== imageId
  )

  saveCollections()

  res.json(collection)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})