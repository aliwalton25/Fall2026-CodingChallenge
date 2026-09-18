import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

const API_URL = 'http://localhost:3001/api'

interface PixabayImage {
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
  images: PixabayImage[]
}

function App() {
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [images, setImages] = useState<PixabayImage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Collection state
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollectionId, setSelectedCollectionId] =
    useState<number | null>(null)

  // General UI state
  const [error, setError] = useState('')

  const selectedCollection =
    collections.find(
      (collection) => collection.id === selectedCollectionId
    ) ?? null

  // Load collections from the backend when the app starts
  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      const response = await fetch(`${API_URL}/collections`)

      if (!response.ok) {
        throw new Error('Could not load collections.')
      }

      const data: Collection[] = await response.json()
      setCollections(data)
    } catch (err) {
      console.error(err)
      setError(
        'Could not connect to the backend. Make sure your backend server is running.'
      )
    }
  }

  // Search Pixabay
  const searchImages = async (event?: FormEvent) => {
    event?.preventDefault()

    const trimmedSearch = searchTerm.trim()

    if (!trimmedSearch) {
      setError('Enter something to search for first.')
      return
    }

    const apiKey = import.meta.env.VITE_PIXABAY_API_KEY

    if (!apiKey) {
      setError('Pixabay API key is missing.')
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    setError('')

    try {
      const response = await fetch(
        `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(
          trimmedSearch
        )}&image_type=photo&per_page=24&safesearch=true`
      )

      if (!response.ok) {
        throw new Error('Image search failed.')
      }

      const data = await response.json()
      setImages(data.hits ?? [])
    } catch (err) {
      console.error(err)
      setImages([])
      setError('Something went wrong while searching for images.')
    } finally {
      setIsSearching(false)
    }
  }

  // Create a new collection
  const createCollection = async () => {
    const enteredName = prompt('Enter a name for your new collection:')

    if (!enteredName) {
      return
    }

    const name = enteredName.trim()

    if (!name) {
      return
    }

    if (
      collections.some(
        (collection) =>
          collection.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      alert('You already have a collection with that name.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      })

      if (!response.ok) {
        throw new Error('Could not create collection.')
      }

      const newCollection: Collection = await response.json()

      setCollections((currentCollections) => [
        ...currentCollections,
        newCollection
      ])
    } catch (err) {
      console.error(err)
      setError('Could not create the collection.')
    }
  }

  // Save a Pixabay image to one of the user's collections
  const saveImage = async (image: PixabayImage) => {
    if (collections.length === 0) {
      alert('Create a collection first!')
      return
    }

    const collectionList = collections
      .map((collection) => collection.name)
      .join('\n')

    const enteredName = prompt(
      `Which collection would you like to save this to?\n\n${collectionList}`
    )

    if (!enteredName) {
      return
    }

    const collection = collections.find(
      (currentCollection) =>
        currentCollection.name.toLowerCase() ===
        enteredName.trim().toLowerCase()
    )

    if (!collection) {
      alert('Collection not found. Please type one of the names shown.')
      return
    }

    if (
      collection.images.some(
        (savedImage) => savedImage.id === image.id
      )
    ) {
      alert('That image is already saved in this collection.')
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/collections/${collection.id}/images`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(image)
        }
      )

      if (!response.ok) {
        throw new Error('Could not save image.')
      }

      const updatedCollection: Collection = await response.json()

      updateCollection(updatedCollection)

      alert(`Saved to ${collection.name}!`)
    } catch (err) {
      console.error(err)
      setError('Could not save the image.')
    }
  }

  // Remove an image from a collection
  const removeImage = async (
    collectionId: number,
    imageId: number
  ) => {
    const shouldRemove = confirm(
      'Remove this image from the collection?'
    )

    if (!shouldRemove) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/collections/${collectionId}/images/${imageId}`,
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        throw new Error('Could not remove image.')
      }

      const updatedCollection: Collection = await response.json()
      updateCollection(updatedCollection)
    } catch (err) {
      console.error(err)
      setError('Could not remove the image.')
    }
  }

  // Keep the collection list synchronized after backend changes
  const updateCollection = (updatedCollection: Collection) => {
    setCollections((currentCollections) =>
      currentCollections.map((collection) =>
        collection.id === updatedCollection.id
          ? updatedCollection
          : collection
      )
    )
  }

  // Copy a collection URL to the clipboard.
  // We'll make this a true public share route after adding the backend route.
  const copyCollectionLink = async (collectionId: number) => {
    const url = `${window.location.origin}/?collection=${collectionId}`

    try {
      await navigator.clipboard.writeText(url)
      alert('Collection link copied!')
    } catch {
      prompt('Copy this collection link:', url)
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">✦</span>

          <div>
            <h1>Pinspire</h1>
            <p>Discover it. Save it. Find it again.</p>
          </div>
        </div>

        <button
          className="primary-button"
          onClick={createCollection}
        >
          + New Collection
        </button>
      </header>

      <main>
        {error && (
          <div className="error-message">
            <span>{error}</span>

            <button
              className="text-button"
              onClick={() => setError('')}
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="hero">
          <p className="eyebrow">YOUR VISUAL LIBRARY</p>

          <h2>Find inspiration worth keeping.</h2>

          <p className="hero-description">
            Search for images, organize your favorites into
            collections, and keep everything you love in one place.
          </p>

          <form
            className="search-bar"
            onSubmit={searchImages}
          >
            <input
              type="search"
              placeholder="Try “travel”, “architecture”, or “recipes”..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />

            <button
              className="primary-button search-button"
              type="submit"
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">COLLECTIONS</p>
              <h2>My Collections</h2>
            </div>

            <button
              className="secondary-button"
              onClick={createCollection}
            >
              + Create Collection
            </button>
          </div>

          {collections.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">♡</div>

              <h3>No collections yet</h3>

              <p>
                Create your first collection, then start saving
                images you discover.
              </p>

              <button
                className="primary-button"
                onClick={createCollection}
              >
                Create My First Collection
              </button>
            </div>
          ) : (
            <div className="collections">
              {collections.map((collection) => (
                <article
                  className={`collection-card ${
                    selectedCollectionId === collection.id
                      ? 'collection-card-selected'
                      : ''
                  }`}
                  key={collection.id}
                  onClick={() =>
                    setSelectedCollectionId(collection.id)
                  }
                >
                  <div className="collection-preview">
                    {collection.images.length > 0 ? (
                      <img
                        src={
                          collection.images[
                            collection.images.length - 1
                          ].webformatURL
                        }
                        alt=""
                      />
                    ) : (
                      <div className="collection-placeholder">
                        ♡
                      </div>
                    )}
                  </div>

                  <div className="collection-info">
                    <div>
                      <h3>{collection.name}</h3>

                      <p>
                        {collection.images.length}{' '}
                        {collection.images.length === 1
                          ? 'image'
                          : 'images'}
                      </p>
                    </div>

                    <span className="arrow">→</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedCollection && (
          <section className="section selected-collection">
            <div className="section-heading">
              <div>
                <p className="eyebrow">OPEN COLLECTION</p>
                <h2>{selectedCollection.name}</h2>
                <p className="muted-text">
                  {selectedCollection.images.length}{' '}
                  {selectedCollection.images.length === 1
                    ? 'saved image'
                    : 'saved images'}
                </p>
              </div>

              <div className="collection-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    copyCollectionLink(selectedCollection.id)
                  }
                >
                  Share
                </button>

                <button
                  className="secondary-button"
                  onClick={() =>
                    setSelectedCollectionId(null)
                  }
                >
                  Close
                </button>
              </div>
            </div>

            {selectedCollection.images.length === 0 ? (
              <div className="empty-state small-empty-state">
                <h3>This collection is empty</h3>

                <p>
                  Search for something below and save an image
                  here.
                </p>
              </div>
            ) : (
              <div className="image-grid">
                {selectedCollection.images.map((image) => (
                  <article
                    className="image-card"
                    key={image.id}
                  >
                    <div className="image-wrapper">
                      <img
                        src={image.webformatURL}
                        alt={image.tags}
                      />
                    </div>

                    <div className="image-card-content">
                      <p className="image-tags">
                        {image.tags}
                      </p>

                      {image.user && (
                        <p className="image-credit">
                          Photo by {image.user}
                        </p>
                      )}

                      <button
                        className="danger-button"
                        onClick={() =>
                          removeImage(
                            selectedCollection.id,
                            image.id
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DISCOVER</p>

              <h2>
                {hasSearched
                  ? `Results${searchTerm ? ` for “${searchTerm}”` : ''}`
                  : 'Find Something New'}
              </h2>
            </div>

            {images.length > 0 && (
              <p className="muted-text">
                {images.length} results
              </p>
            )}
          </div>

          {!hasSearched ? (
            <div className="empty-state search-empty-state">
              <div className="empty-icon">⌕</div>

              <h3>Start exploring</h3>

              <p>
                Search above to discover images you can save to
                your collections.
              </p>
            </div>
          ) : isSearching ? (
            <div className="empty-state">
              <h3>Searching...</h3>
              <p>Finding some inspiration for you.</p>
            </div>
          ) : images.length === 0 ? (
            <div className="empty-state">
              <h3>No images found</h3>
              <p>Try a different search.</p>
            </div>
          ) : (
            <div className="image-grid">
              {images.map((image) => (
                <article
                  className="image-card"
                  key={image.id}
                >
                  <div className="image-wrapper">
                    <img
                      src={image.webformatURL}
                      alt={image.tags}
                    />
                  </div>

                  <div className="image-card-content">
                    <p className="image-tags">
                      {image.tags}
                    </p>

                    {image.user && (
                      <p className="image-credit">
                        Photo by {image.user}
                      </p>
                    )}

                    <button
                      className="save-button"
                      onClick={() => saveImage(image)}
                    >
                      + Save to Collection
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>Pinspire · Built for Change++</p>
      </footer>
    </div>
  )
}

export default App