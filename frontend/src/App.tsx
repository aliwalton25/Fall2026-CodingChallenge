import { useEffect, useState } from 'react'
import './App.css'


function App() {
  // Load existing collections from the backend when the app starts
  useEffect(() => {
    const loadCollections = async () => {
      const response = await fetch('http://localhost:3001/api/collections')
      const data = await response.json()

      setCollections(data)
    }

    loadCollections()
  }, [])
  // state for image search and Pixabay results
  const [searchTerm, setSearchTerm] = useState('')
  const [images, setImages] = useState<any[]>([])

  //state for user-created collections and the currently viewed collection
  const [collections, setCollections] = useState<any[]>([])
  const [selectedCollection, setSelectedCollection] = useState<any>(null)

  // fetch images from Pixabay based of user's search
  const searchImages = async () => {
    console.log('Search button clicked!')

    const apiKey = import.meta.env.VITE_PIXABAY_API_KEY

    const response = await fetch(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(searchTerm)}&image_type=photo`
    )

    const data = await response.json()

    setImages(data.hits)
  }

  // Create a collection using the backend API
  const createCollection = async () => {
    const name = prompt('Enter a name for your collection:')

    if (!name) {
      return
    }

    const response = await fetch('http://localhost:3001/api/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    })

    const newCollection = await response.json()

    setCollections([...collections, newCollection])
  }

  // Save an image to a collection using the backend API
  const saveImage = async (image: any) => {
    if (collections.length === 0) {
      alert('Create a collection first!')
      return
    }

    const collectionName = prompt(
      `Which collection would you like to save this to?\n\n${collections
        .map((collection) => collection.name)
        .join('\n')}`
    )

    const collection = collections.find(
      (collection) => collection.name === collectionName
    )

    if (!collection) {
      alert('Collection not found.')
      return
    }

    const response = await fetch(
      `http://localhost:3001/api/collections/${collection.id}/images`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(image)
      }
    )

    const updatedCollection = await response.json()

    setCollections(
      collections.map((currentCollection) =>
        currentCollection.id === updatedCollection.id
          ? updatedCollection
          : currentCollection
      )
    )

    alert(`Image saved to ${collection.name}!`)
  }
  
  // Remove a saved image from a collection
  const removeImage = async (collectionId: number, imageId: number) => {
    console.log('Removing image:', collectionId, imageId)
    
    const response = await fetch(
      `http://localhost:3001/api/collections/${collectionId}/images/${imageId}`,
      {
        method: 'DELETE'
      }
    )

    const updatedCollection = await response.json()

    setCollections(
      collections.map((collection) =>
        collection.id === updatedCollection.id
          ? updatedCollection
          : collection
      )
    )

    setSelectedCollection(updatedCollection)
  }

  return (
    <div>
      <h1>My Image App</h1>
      

      <div>
        <input
          type="text"
          placeholder="Search for images..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={searchImages}>
          Search
        </button>
      </div>

      <div className="image-grid">
        {images.map((image) => (
          <div className="image-card" key={image.id}>
            <img
              src={image.webformatURL}
              alt={image.tags}
            />

            <p>{image.tags}</p>

            <button onClick={() => saveImage(image)}>
              Save
            </button>
          </div>
        ))}
      </div>

      <h2>My Collections</h2>
      <button onClick={createCollection}>
        + Create Collection
      </button>

      <div className="collections">
        {collections.map((collection, index) => (
          <div
            className="collection-card"
            key={index}
            onClick={() => setSelectedCollection(collection)}
          >
            <h3>{collection.name}</h3>
            <p>{collection.images.length} saved images</p>
          </div>
        ))}
      </div>

      {selectedCollection && (
        <div className="selected-collection">
          <h2>{selectedCollection.name}</h2>

          <button onClick={() => setSelectedCollection(null)}>
            Close Collection
          </button>

          <div className="image-grid">
            {selectedCollection.images.map((image: any) => (
              <div className="image-card" key={image.id}>
                <img
                  src={image.webformatURL}
                  alt={image.tags}
                />
                <p>{image.tags}</p>

                <button
                  onClick={() => removeImage(selectedCollection.id, image.id)}
                >
                  Remove
                </button>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App