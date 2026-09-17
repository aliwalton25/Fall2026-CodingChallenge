import { useState } from 'react'
import './App.css'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [images, setImages] = useState<any[]>([])
  
  const searchImages = async () => {
    console.log('Search button clicked!')
    
    const apiKey = import.meta.env.VITE_PIXABAY_API_KEY

    const response = await fetch(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(searchTerm)}&image_type=photo`
    )

    const data = await response.json()

    setImages(data.hits)
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

      <div>
        {images.map((image) => (
          <img
            key={image.id}
            src={image.webformatURL}
            alt={image.tags}
            width="200"
          />
        ))}
      </div>

      <h2>My Collections</h2>
      <button>+ Create Collection</button>
    </div>
  )
}

export default App