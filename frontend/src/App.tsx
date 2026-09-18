import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  BookmarkPlus,
  FolderPlus,
  Globe2,
  Lock,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Pencil,
  X,
  Image as ImageIcon
} from 'lucide-react'
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
  isPublic: boolean
}

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [images, setImages] = useState<PixabayImage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollectionId, setSelectedCollectionId] =
    useState<number | null>(null)

  const [error, setError] = useState('')
  const [sharedMode, setSharedMode] = useState(false)

  const selectedCollection =
    collections.find(
      (collection) => collection.id === selectedCollectionId
    ) ?? null

  // Load collections or a shared public collection when the app starts
  useEffect(() => {
    const loadApp = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const sharedId = params.get('shared')

        if (sharedId) {
          const response = await fetch(
            `${API_URL}/shared/${sharedId}`
          )

          if (!response.ok) {
            throw new Error(
              'This shared collection is unavailable or private.'
            )
          }

          const collection: Collection = await response.json()

          setCollections([collection])
          setSelectedCollectionId(collection.id)
          setSharedMode(true)
          return
        }

        const response = await fetch(`${API_URL}/collections`)

        if (!response.ok) {
          throw new Error('Could not load collections.')
        }

        const data: Collection[] = await response.json()
        setCollections(data)
      } catch (err) {
        console.error(err)

        setError(
          err instanceof Error
            ? err.message
            : 'Could not connect to the backend.'
        )
      }
    }

    loadApp()
  }, [])

  // Search Pixabay for images
  const searchImages = async (event?: FormEvent) => {
    event?.preventDefault()

    if (sharedMode) {
      return
    }

    const search = searchTerm.trim()

    if (!search) {
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
          search
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
      setError('Something went wrong while searching.')
    } finally {
      setIsSearching(false)
    }
  }

  // Replace a collection with its updated backend version
  const updateCollection = (updatedCollection: Collection) => {
    setCollections((currentCollections) =>
      currentCollections.map((collection) =>
        collection.id === updatedCollection.id
          ? updatedCollection
          : collection
      )
    )
  }

  // Create a collection
  const createCollection = async () => {
    const enteredName = prompt(
      'Enter a name for your new collection:'
    )

    if (!enteredName?.trim()) {
      return
    }

    const name = enteredName.trim()

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

  // Save an image to a collection
  const saveImage = async (image: PixabayImage) => {
    if (collections.length === 0) {
      alert('Create a collection first!')
      return
    }

    const choices = collections
      .map((collection) => collection.name)
      .join('\n')

    const enteredName = prompt(
      `Save to which collection?\n\n${choices}`
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
      alert('Collection not found.')
      return
    }

    if (
      collection.images.some(
        (savedImage) => savedImage.id === image.id
      )
    ) {
      alert('That image is already saved there.')
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

      const updatedCollection: Collection =
        await response.json()

      updateCollection(updatedCollection)

      alert(`Saved to ${collection.name}!`)
    } catch (err) {
      console.error(err)
      setError('Could not save the image.')
    }
  }

  // Edit a saved image description
  const editImage = async (
    collectionId: number,
    image: PixabayImage
  ) => {
    const description = prompt(
      'Edit this image description:',
      image.tags
    )

    if (!description?.trim()) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/collections/${collectionId}/images/${image.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tags: description.trim()
          })
        }
      )

      if (!response.ok) {
        throw new Error('Could not edit image.')
      }

      const updatedCollection: Collection =
        await response.json()

      updateCollection(updatedCollection)
    } catch (err) {
      console.error(err)
      setError('Could not edit the image.')
    }
  }

  // Remove a saved image
  const removeImage = async (
    collectionId: number,
    imageId: number
  ) => {
    if (!confirm('Remove this image from the collection?')) {
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

      const updatedCollection: Collection =
        await response.json()

      updateCollection(updatedCollection)
    } catch (err) {
      console.error(err)
      setError('Could not remove the image.')
    }
  }

  // Toggle a collection between private and public
  const togglePrivacy = async (collection: Collection) => {
    try {
      const response = await fetch(
        `${API_URL}/collections/${collection.id}/privacy`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            isPublic: !collection.isPublic
          })
        }
      )

      if (!response.ok) {
        throw new Error('Could not update privacy.')
      }

      const updatedCollection: Collection =
        await response.json()

      updateCollection(updatedCollection)
    } catch (err) {
      console.error(err)
      setError('Could not change collection privacy.')
    }
  }

  // Copy a link to a public collection
  const shareCollection = async (collection: Collection) => {
    if (!collection.isPublic) {
      alert(
        'This collection is private. Make it public before sharing.'
      )
      return
    }

    const url =
      `${window.location.origin}/?shared=${collection.id}`

    try {
      await navigator.clipboard.writeText(url)
      alert('Public collection link copied!')
    } catch {
      prompt('Copy this link:', url)
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={21} strokeWidth={2} />
          </span>

          <div>
            <h1>Pinspire</h1>
            <p>Discover it. Save it. Find it again.</p>
          </div>
        </div>

        {!sharedMode && (
          <button
            className="primary-button"
            onClick={createCollection}
          >
            <FolderPlus size={17} />
            New Collection
          </button>
        )}
      </header>

      <main>
        {error && (
          <div className="error-message">
            <span>{error}</span>

            <button
              className="text-button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {sharedMode ? (
          <section className="hero">
            <p className="eyebrow">SHARED COLLECTION</p>

            <h2>
              {selectedCollection?.name ?? 'Shared inspiration'}
            </h2>

            <p className="hero-description">
              A public collection of ideas and inspiration.
            </p>

            <a
              className="primary-button home-link"
              href="/"
            >
              <Sparkles size={17} />
              Explore Pinspire
            </a>
          </section>
        ) : (
          <section className="hero">
            <div className="hero-badge">
              <Sparkles size={14} />
              DISCOVER · COLLECT · CREATE
            </div>

            <h2>
              Find inspiration
              <br />
              worth keeping.
            </h2>

            <p className="hero-description">
              Discover beautiful ideas, save your favorites, and
              organize everything into collections that are uniquely
              yours.
            </p>

            <form
              className="search-bar"
              onSubmit={searchImages}
            >
              <Search size={20} className="search-input-icon" />

              <input
                type="search"
                placeholder="Search travel, interiors, food, nature..."
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
                <Search size={17} />
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>
          </section>
        )}

        {!sharedMode && (
          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR SPACE</p>
                <h2>My Collections</h2>
                <p className="section-subtitle">
                  Keep the things that inspire you organized.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={createCollection}
              >
                <FolderPlus size={17} />
                Create Collection
              </button>
            </div>

            {collections.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FolderPlus size={32} />
                </div>

                <h3>Your first collection awaits</h3>

                <p>
                  Create a collection and start building your own
                  visual library.
                </p>

                <button
                  className="primary-button"
                  onClick={createCollection}
                >
                  <FolderPlus size={17} />
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
                          alt={collection.name}
                        />
                      ) : (
                        <div className="collection-placeholder">
                          <ImageIcon size={38} />
                        </div>
                      )}

                      <div className="privacy-badge">
                        {collection.isPublic ? (
                          <>
                            <Globe2 size={12} />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock size={12} />
                            Private
                          </>
                        )}
                      </div>
                    </div>

                    <div className="collection-info">
                      <div>
                        <h3>{collection.name}</h3>

                        <p>
                          {collection.images.length}{' '}
                          {collection.images.length === 1
                            ? 'saved image'
                            : 'saved images'}
                        </p>
                      </div>

                      <span className="arrow">→</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedCollection && (
          <section className="section selected-collection">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {sharedMode
                    ? 'PUBLIC COLLECTION'
                    : 'OPEN COLLECTION'}
                </p>

                <h2>{selectedCollection.name}</h2>

                <p className="section-subtitle">
                  {selectedCollection.images.length}{' '}
                  {selectedCollection.images.length === 1
                    ? 'saved image'
                    : 'saved images'}
                </p>
              </div>

              {!sharedMode && (
                <div className="collection-actions">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      togglePrivacy(selectedCollection)
                    }
                  >
                    {selectedCollection.isPublic ? (
                      <>
                        <Lock size={16} />
                        Make Private
                      </>
                    ) : (
                      <>
                        <Globe2 size={16} />
                        Make Public
                      </>
                    )}
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      shareCollection(selectedCollection)
                    }
                  >
                    <Share2 size={16} />
                    Share
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      setSelectedCollectionId(null)
                    }
                  >
                    <X size={16} />
                    Close
                  </button>
                </div>
              )}
            </div>

            {selectedCollection.images.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <ImageIcon size={32} />
                </div>

                <h3>This collection is waiting for inspiration</h3>

                <p>
                  Find something you love and save it here.
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

                      {!sharedMode && (
                        <>
                          <button
                            className="secondary-button edit-button"
                            onClick={() =>
                              editImage(
                                selectedCollection.id,
                                image
                              )
                            }
                          >
                            <Pencil size={16} />
                            Edit Description
                          </button>

                          <button
                            className="danger-button"
                            onClick={() =>
                              removeImage(
                                selectedCollection.id,
                                image.id
                              )
                            }
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!sharedMode && (
          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DISCOVER</p>

                <h2>
                  {hasSearched
                    ? `Results for “${searchTerm}”`
                    : 'Find Something New'}
                </h2>

                <p className="section-subtitle">
                  Search Pixabay and save anything that catches your
                  eye.
                </p>
              </div>

              {images.length > 0 && (
                <span className="result-count">
                  {images.length} results
                </span>
              )}
            </div>

            {!hasSearched ? (
              <div className="empty-state search-empty-state">
                <div className="empty-icon">
                  <Search size={32} />
                </div>

                <h3>What will inspire you today?</h3>

                <p>
                  Try searching for travel, architecture, fashion,
                  recipes, nature, or anything else you love.
                </p>
              </div>
            ) : isSearching ? (
              <div className="empty-state">
                <Sparkles size={28} />
                <h3>Finding inspiration...</h3>
              </div>
            ) : images.length === 0 ? (
              <div className="empty-state">
                <Search size={28} />
                <h3>No images found</h3>
                <p>Try another search term.</p>
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
                        <BookmarkPlus size={17} />
                        Save to Collection
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer>
        <div className="footer-brand">
          <Sparkles size={15} />
          <span>Pinspire</span>
        </div>

        <p>Your ideas, all in one place.</p>
      </footer>
    </div>
  )
}

export default App