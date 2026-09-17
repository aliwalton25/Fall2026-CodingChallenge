import { useState } from 'react'
import './App.css'

function App() {
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

  // create new empty collection
  const createCollection = () => {
    const name = prompt('Enter a name for your collection:')

    if (name) {
      setCollections([
        ...collections,
        {
          name: name,
          images: []
        }
      ])
    }
  }

  // save an image to a user-selected collection
  const saveImage = (image: any) => {
    if (collections.length === 0) {
      alert('Create a collection first!')
      return
    }

    const collectionName = prompt(
      `Which collection would you like to save this to?\n\n${collections
        .map((collection) => collection.name)
        .join('\n')}`
    )

    const updatedCollections = collections.map((collection) => {
      if (collection.name === collectionName) {
        return {
          ...collection,
          images: [...collection.images, image]
        }
      }

      return collection
    })

    setCollections(updatedCollections)
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App