import express from 'express'
import cors from 'cors'
import fs from 'fs'

const app = express()
const PORT = 3001
const dataFile = './data.json'

interface SavedImage {
  id: number
  webformatURL: string
  largeImageURL?: string
  tags: string
  user?: string
  views?: number
  likes?: number
}

interface Collection {
  id: number
  name: string
  images: SavedImage[]
  isPublic: boolean
}

let collections: Collection[] = []

// Load saved data when the backend starts
const loadCollections = () => {
  try {
    if (!fs.existsSync(dataFile)) {
      return
    }

    const savedData = fs.readFileSync(dataFile, 'utf-8')

    collections = savedData.trim()
      ? JSON.parse(savedData)
      : []

    // Support collections created before public/private was added
    collections = collections.map((collection) => ({
      ...collection,
      isPublic: collection.isPublic ?? false
    }))
  } catch (error) {
    console.error('Could not load collections:', error)
    collections = []
  }
}

// Persist all changes
const saveCollections = () => {
  fs.writeFileSync(
    dataFile,
    JSON.stringify(collections, null, 2)
  )
}

loadCollections()

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' })
})

// Get all collections
app.get('/api/collections', (req, res) => {
  res.json(collections)
})

// Get one collection
app.get('/api/collections/:id', (req, res) => {
  const collectionId = Number(req.params.id)

  const collection = collections.find(
    (currentCollection) =>
      currentCollection.id === collectionId
  )

  if (!collection) {
    return res
      .status(404)
      .json({ error: 'Collection not found' })
  }

  res.json(collection)
})

// Create a collection
app.post('/api/collections', (req, res) => {
  const name =
    typeof req.body.name === 'string'
      ? req.body.name.trim()
      : ''

  if (!name) {
    return res
      .status(400)
      .json({ error: 'Collection name is required' })
  }

  const newCollection: Collection = {
    id: Date.now(),
    name,
    images: [],
    isPublic: false
  }

  collections.push(newCollection)
  saveCollections()

  res.status(201).json(newCollection)
})

// Change a collection between public/private
app.patch('/api/collections/:id/privacy', (req, res) => {
  const collectionId = Number(req.params.id)

  const collection = collections.find(
    (currentCollection) =>
      currentCollection.id === collectionId
  )

  if (!collection) {
    return res
      .status(404)
      .json({ error: 'Collection not found' })
  }

  if (typeof req.body.isPublic !== 'boolean') {
    return res
      .status(400)
      .json({ error: 'isPublic must be a boolean' })
  }

  collection.isPublic = req.body.isPublic
  saveCollections()

  res.json(collection)
})

// Public sharing endpoint
app.get('/api/shared/:id', (req, res) => {
  const collectionId = Number(req.params.id)

  const collection = collections.find(
    (currentCollection) =>
      currentCollection.id === collectionId
  )

  if (!collection) {
    return res
      .status(404)
      .json({ error: 'Collection not found' })
  }

  if (!collection.isPublic) {
    return res
      .status(403)
      .json({ error: 'This collection is private' })
  }

  res.json(collection)
})

// Save an image
app.post('/api/collections/:id/images', (req, res) => {
  const collectionId = Number(req.params.id)
  const image = req.body as SavedImage

  const collection = collections.find(
    (currentCollection) =>
      currentCollection.id === collectionId
  )

  if (!collection) {
    return res
      .status(404)
      .json({ error: 'Collection not found' })
  }

  if (!image.id || !image.webformatURL) {
    return res
      .status(400)
      .json({ error: 'Invalid image data' })
  }

  const alreadySaved = collection.images.some(
    (savedImage) => savedImage.id === image.id
  )

  if (alreadySaved) {
    return res
      .status(409)
      .json({ error: 'Image already saved' })
  }

  collection.images.push(image)
  saveCollections()

  res.status(201).json(collection)
})

// Edit saved image description
app.patch(
  '/api/collections/:id/images/:imageId',
  (req, res) => {
    const collectionId = Number(req.params.id)
    const imageId = Number(req.params.imageId)

    const collection = collections.find(
      (currentCollection) =>
        currentCollection.id === collectionId
    )

    if (!collection) {
      return res
        .status(404)
        .json({ error: 'Collection not found' })
    }

    const image = collection.images.find(
      (savedImage) => savedImage.id === imageId
    )

    if (!image) {
      return res
        .status(404)
        .json({ error: 'Image not found' })
    }

    if (typeof req.body.tags === 'string') {
      image.tags = req.body.tags.trim()
    }

    saveCollections()

    res.json(collection)
  }
)

// Delete saved image
app.delete(
  '/api/collections/:id/images/:imageId',
  (req, res) => {
    const collectionId = Number(req.params.id)
    const imageId = Number(req.params.imageId)

    const collection = collections.find(
      (currentCollection) =>
        currentCollection.id === collectionId
    )

    if (!collection) {
      return res
        .status(404)
        .json({ error: 'Collection not found' })
    }

    const imageExists = collection.images.some(
      (image) => image.id === imageId
    )

    if (!imageExists) {
      return res
        .status(404)
        .json({ error: 'Image not found' })
    }

    collection.images = collection.images.filter(
      (image) => image.id !== imageId
    )

    saveCollections()

    res.json(collection)
  }
)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})