import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  BookmarkPlus,
  Check,
  FolderPlus,
  Globe2,
  Image as ImageIcon,
  Lock,
  Pencil,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X
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

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')

  const [imageToSave, setImageToSave] =
    useState<PixabayImage | null>(null)

  const [imageToEdit, setImageToEdit] =
    useState<PixabayImage | null>(null)

  const [editDescription, setEditDescription] = useState('')

  const selectedCollection =
    collections.find(
      (collection) => collection.id === selectedCollectionId
    ) ?? null

  // Load normal collections or a public shared collection
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

  // Search Pixabay and scroll to the results
  const searchImages = async (event?: FormEvent) => {
    event?.preventDefault()

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

      setTimeout(() => {
        document
          .getElementById('search-results')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
      }, 100)
    } catch (err) {
      console.error(err)
      setImages([])
      setError('Something went wrong while searching.')
    } finally {
      setIsSearching(false)
    }
  }

  // Update one collection in frontend state
  const updateCollection = (updatedCollection: Collection) => {
    setCollections((currentCollections) =>
      currentCollections.map((collection) =>
        collection.id === updatedCollection.id
          ? updatedCollection
          : collection
      )
    )
  }

  // Send an image to an existing collection
  const saveImageToCollection = async (
    collection: Collection,
    image: PixabayImage
  ) => {
    const alreadySaved = collection.images.some(
      (savedImage) => savedImage.id === image.id
    )

    if (alreadySaved) {
      setError(
        `That image is already saved in ${collection.name}.`
      )
      return false
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

      return true
    } catch (err) {
      console.error(err)
      setError('Could not save the image.')
      return false
    }
  }

  // Create a collection. If an image was waiting to be saved,
  // automatically save it into the new collection.
  const createCollection = async (event?: FormEvent) => {
    event?.preventDefault()

    const name = newCollectionName.trim()

    if (!name) {
      return
    }

    if (
      collections.some(
        (collection) =>
          collection.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      setError('You already have a collection with that name.')
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

      // Preserve the image that caused the Create Collection flow.
      const pendingImage = imageToSave

      if (pendingImage) {
        const saveResponse = await fetch(
          `${API_URL}/collections/${newCollection.id}/images`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(pendingImage)
          }
        )

        if (!saveResponse.ok) {
          throw new Error(
            'Collection was created, but the image could not be saved.'
          )
        }

        const updatedCollection: Collection =
          await saveResponse.json()

        setCollections((currentCollections) =>
          currentCollections.map((collection) =>
            collection.id === updatedCollection.id
              ? updatedCollection
              : collection
          )
        )
      }

      setNewCollectionName('')
      setShowCreateModal(false)
      setImageToSave(null)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Could not create the collection.'
      )
    }
  }

  // Open the visual collection picker
  const openSavePicker = (image: PixabayImage) => {
    setImageToSave(image)

    if (collections.length === 0) {
      setShowCreateModal(true)
    }
  }

  // Save from the collection picker
  const chooseCollectionForImage = async (
    collection: Collection
  ) => {
    if (!imageToSave) {
      return
    }

    const saved = await saveImageToCollection(
      collection,
      imageToSave
    )

    if (saved) {
      setImageToSave(null)
    }
  }

  const openEditModal = (image: PixabayImage) => {
    setImageToEdit(image)
    setEditDescription(image.tags)
  }

  // Edit a saved image description
  const saveEditedDescription = async (
    event?: FormEvent
  ) => {
    event?.preventDefault()

    if (
      !selectedCollection ||
      !imageToEdit ||
      !editDescription.trim()
    ) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/collections/${selectedCollection.id}/images/${imageToEdit.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tags: editDescription.trim()
          })
        }
      )

      if (!response.ok) {
        throw new Error('Could not edit image.')
      }

      const updatedCollection: Collection =
        await response.json()

      updateCollection(updatedCollection)
      setImageToEdit(null)
      setEditDescription('')
    } catch (err) {
      console.error(err)
      setError('Could not edit the image.')
    }
  }

  // Remove an image from a collection
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

  // Toggle public/private status
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

  // Copy a public sharing link
  const shareCollection = async (collection: Collection) => {
    if (!collection.isPublic) {
      setError(
        'Make this collection public before sharing it.'
      )
      return
    }

    const url =
      `${window.location.origin}/?shared=${collection.id}`

    try {
      await navigator.clipboard.writeText(url)
      setError('Share link copied to your clipboard.')
    } catch {
      setError(`Share link: ${url}`)
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>

          <div>
            <h1>Pinspire</h1>
            <p>A place for ideas worth keeping.</p>
          </div>
        </div>

        {!sharedMode && (
          <button
            className="primary-button"
            onClick={() => {
              setImageToSave(null)
              setShowCreateModal(true)
            }}
          >
            <FolderPlus size={17} />
            New Collection
          </button>
        )}
      </header>

      <main>
        {error && (
          <div className="notice-message">
            <span>{error}</span>

            <button
              onClick={() => setError('')}
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {sharedMode ? (
          <section className="hero shared-hero">
            <div className="hero-content">
              <p className="hero-kicker">
                <Globe2 size={14} />
                SHARED COLLECTION
              </p>

              <h2>{selectedCollection?.name}</h2>

              <p className="hero-description">
                A collection of ideas selected and shared on Pinspire.
              </p>

              <a className="hero-action" href="/">
                Explore Pinspire
              </a>
            </div>
          </section>
        ) : (
          <section className="hero">
            <div className="hero-accent" />

            <div className="hero-content">
              <p className="hero-kicker">
                <Sparkles size={14} />
                YOUR VISUAL LIBRARY
              </p>

              <h2>
                Ideas worth
                <br />
                <em>keeping.</em>
              </h2>

              <p className="hero-description">
                Discover images that spark something, organize them
                into thoughtful collections, and return whenever you
                need inspiration.
              </p>

              <form
                className="search-bar"
                onSubmit={searchImages}
              >
                <Search
                  size={19}
                  className="search-input-icon"
                />

                <input
                  type="search"
                  placeholder="Search for inspiration..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                />

                <button
                  type="submit"
                  disabled={isSearching}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              <div className="search-suggestions">
                <span>Explore</span>

                <button
                  type="button"
                  onClick={() => setSearchTerm('architecture')}
                >
                  Architecture
                </button>

                <button
                  type="button"
                  onClick={() => setSearchTerm('travel')}
                >
                  Travel
                </button>

                <button
                  type="button"
                  onClick={() => setSearchTerm('interiors')}
                >
                  Interiors
                </button>

                <button
                  type="button"
                  onClick={() => setSearchTerm('food')}
                >
                  Food
                </button>
              </div>
            </div>
          </section>
        )}

        {!sharedMode && (
          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">COLLECTIONS</p>
                <h2>Your library</h2>

                <p className="section-subtitle">
                  Organize inspiration into spaces that make sense
                  to you.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={() => {
                  setImageToSave(null)
                  setShowCreateModal(true)
                }}
              >
                <FolderPlus size={17} />
                Create Collection
              </button>
            </div>

            {collections.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FolderPlus size={30} />
                </div>

                <h3>Create your first collection</h3>

                <p>
                  Start building a library of ideas you want to
                  revisit.
                </p>

                <button
                  className="primary-button"
                  onClick={() => {
                    setImageToSave(null)
                    setShowCreateModal(true)
                  }}
                >
                  <FolderPlus size={17} />
                  Create Collection
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
                          <ImageIcon size={36} />
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
                            ? 'image'
                            : 'images'}
                        </p>
                      </div>

                      <span>↗</span>
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
                    ? 'SHARED COLLECTION'
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
                  <ImageIcon size={30} />
                </div>

                <h3>This collection is empty</h3>

                <p>
                  Find something worth keeping and save it here.
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
                        <div className="saved-image-actions">
                          <button
                            className="secondary-button"
                            onClick={() => openEditModal(image)}
                          >
                            <Pencil size={15} />
                            Edit
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
                            <Trash2 size={15} />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!sharedMode && (
          <section
            className="section"
            id="search-results"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">DISCOVER</p>

                <h2>
                  {hasSearched
                    ? `Results for “${searchTerm}”`
                    : 'Find something new'}
                </h2>

                <p className="section-subtitle">
                  Search Pixabay and add anything that catches your
                  attention to your library.
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
                  <Search size={30} />
                </div>

                <h3>Start exploring</h3>

                <p>
                  Search for places, spaces, food, art, design, or
                  anything else that inspires you.
                </p>
              </div>
            ) : isSearching ? (
              <div className="empty-state">
                <Sparkles size={27} />
                <h3>Searching...</h3>
              </div>
            ) : images.length === 0 ? (
              <div className="empty-state">
                <Search size={27} />
                <h3>No results found</h3>
                <p>Try a different search term.</p>
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

                      <button
                        className="floating-save-button"
                        onClick={() => openSavePicker(image)}
                      >
                        <BookmarkPlus size={16} />
                        Save
                      </button>
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

        <p>Discover. Collect. Return.</p>
      </footer>

      {/* Choose collection modal */}
      {imageToSave &&
        collections.length > 0 &&
        !showCreateModal && (
          <div
            className="modal-backdrop"
            onMouseDown={() => setImageToSave(null)}
          >
            <div
              className="modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="modal-header">
                <div>
                  <p className="eyebrow">SAVE IMAGE</p>
                  <h2>Choose a collection</h2>
                </div>

                <button
                  className="modal-close"
                  onClick={() => setImageToSave(null)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="save-preview">
                <img
                  src={imageToSave.webformatURL}
                  alt={imageToSave.tags}
                />
              </div>

              <div className="collection-picker">
                {collections.map((collection) => {
                  const alreadySaved =
                    collection.images.some(
                      (image) =>
                        image.id === imageToSave.id
                    )

                  return (
                    <button
                      key={collection.id}
                      className="collection-choice"
                      disabled={alreadySaved}
                      onClick={() =>
                        chooseCollectionForImage(collection)
                      }
                    >
                      <div className="choice-icon">
                        {alreadySaved ? (
                          <Check size={18} />
                        ) : (
                          <FolderPlus size={18} />
                        )}
                      </div>

                      <div>
                        <strong>{collection.name}</strong>

                        <span>
                          {alreadySaved
                            ? 'Already saved'
                            : `${collection.images.length} ${
                                collection.images.length === 1
                                  ? 'image'
                                  : 'images'
                              }`}
                        </span>
                      </div>

                      {!alreadySaved && <span>→</span>}
                    </button>
                  )
                })}
              </div>

              <button
                className="modal-create-link"
                onClick={() =>
                  setShowCreateModal(true)
                }
              >
                <FolderPlus size={16} />
                Create a new collection
              </button>
            </div>
          </div>
        )}

      {/* Create collection modal */}
      {showCreateModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => {
            setShowCreateModal(false)
            setNewCollectionName('')

            // Only clear the pending image if the entire flow
            // is being cancelled.
            setImageToSave(null)
          }}
        >
          <div
            className="modal small-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW COLLECTION</p>
                <h2>Create a collection</h2>
              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setShowCreateModal(false)
                  setNewCollectionName('')
                  setImageToSave(null)
                }}
              >
                <X size={20} />
              </button>
            </div>

            {imageToSave && (
              <div className="pending-save-note">
                <BookmarkPlus size={17} />

                <span>
                  This image will be saved automatically
                  after you create the collection.
                </span>
              </div>
            )}

            <form onSubmit={createCollection}>
              <label className="field-label">
                Collection name
              </label>

              <input
                className="modal-input"
                autoFocus
                placeholder="e.g. Weekend escapes"
                value={newCollectionName}
                onChange={(event) =>
                  setNewCollectionName(event.target.value)
                }
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewCollectionName('')
                    setImageToSave(null)
                  }}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  type="submit"
                >
                  <FolderPlus size={16} />
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit image modal */}
      {imageToEdit && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setImageToEdit(null)}
        >
          <div
            className="modal small-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">EDIT IMAGE</p>
                <h2>Edit description</h2>
              </div>

              <button
                className="modal-close"
                onClick={() => setImageToEdit(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveEditedDescription}>
              <label className="field-label">
                Description
              </label>

              <textarea
                className="modal-input modal-textarea"
                autoFocus
                value={editDescription}
                onChange={(event) =>
                  setEditDescription(event.target.value)
                }
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setImageToEdit(null)}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  type="submit"
                >
                  <Check size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App