import React, { useState, useEffect } from 'react'
import './ProductsTable.css'

// Product Update Modal Component
const ProductUpdateModal = ({ product, onUpdate, onClose, updating, updateError }) => {
  const [formData, setFormData] = useState({
    price: product.price.replace('₹', ''),
    sku: product.sku,
    inventory: product.inventoryQuantity.toString()
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Prepare update data - only send non-null values for changed fields
    const updateData = {
      variant_id: parseInt(product.variantId),
      price: null,
      sku: null,
      inventory: null
    }

    // Check what changed and include only those fields
    const originalPrice = product.price.replace('₹', '')
    const originalSku = product.sku
    const originalInventory = product.inventoryQuantity.toString()

    if (formData.price !== originalPrice && formData.price.trim() !== '') {
      updateData.price = parseFloat(formData.price)
    }

    if (formData.sku !== originalSku && formData.sku.trim() !== '') {
      updateData.sku = formData.sku.trim()
    }

    if (formData.inventory !== originalInventory && formData.inventory.trim() !== '') {
      updateData.inventory = parseInt(formData.inventory)
    }

    // Check if any field was actually changed
    if (updateData.price === null && updateData.sku === null && updateData.inventory === null) {
      alert('No changes detected. Please modify at least one field.')
      return
    }

    onUpdate(updateData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content update-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Product: {product.title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {updateError && (
            <div className="update-error">
              <p>❌ {updateError}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="update-form">
            <div className="form-group">
              <label htmlFor="price">Price (₹)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                disabled={updating}
                placeholder="Enter price"
              />
            </div>

            <div className="form-group">
              <label htmlFor="sku">SKU</label>
              <input
                id="sku"
                type="text"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                disabled={updating}
                placeholder="Enter SKU"
              />
            </div>

            <div className="form-group">
              <label htmlFor="inventory">Inventory Quantity</label>
              <input
                id="inventory"
                type="number"
                min="0"
                value={formData.inventory}
                onChange={(e) => handleInputChange('inventory', e.target.value)}
                disabled={updating}
                placeholder="Enter quantity"
              />
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={onClose}
                disabled={updating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="update-btn"
                disabled={updating}
              >
                {updating ? '⏳ Updating...' : '💾 Update Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const ProductsTable = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasDataLoaded, setHasDataLoaded] = useState(false)

  // Product update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState(null)

  // Save products data to localStorage when it changes
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('shoplytic-products-data', JSON.stringify(products))
      localStorage.setItem('shoplytic-products-loaded', 'true')
      console.log('💾 Saved products data to localStorage:', products.length, 'products')
    }
  }, [products])

  // Save hasDataLoaded state to localStorage
  useEffect(() => {
    localStorage.setItem('shoplytic-products-has-data', hasDataLoaded.toString())
    console.log('💾 Saved products hasDataLoaded state:', hasDataLoaded)
  }, [hasDataLoaded])

  // Load saved products data on component mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('shoplytic-products-data')
    const savedHasDataLoaded = localStorage.getItem('shoplytic-products-has-data') === 'true'
    const savedProductsLoaded = localStorage.getItem('shoplytic-products-loaded') === 'true'
    
    console.log('🔍 ProductsTable mount - checking saved data:', { 
      hasSavedProducts: !!savedProducts, 
      savedHasDataLoaded,
      savedProductsLoaded
    })
    
    // Restore data if any of the loaded flags are true
    if (savedProducts && (savedHasDataLoaded || savedProductsLoaded)) {
      try {
        const parsedProducts = JSON.parse(savedProducts)
        if (Array.isArray(parsedProducts)) {
          setProducts(parsedProducts)
          setHasDataLoaded(true)
          console.log('📦 Restored products data from localStorage:', parsedProducts.length, 'products')
        }
      } catch (error) {
        console.error('Error parsing saved products data:', error)
        localStorage.removeItem('shoplytic-products-data')
        localStorage.removeItem('shoplytic-products-has-data')
        localStorage.removeItem('shoplytic-products-loaded')
      }
    }
  }, [])

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      console.log('📦 Fetching products from API:', 'https://n8n1.food-u.live/webhook/get-all-products')
      
      const response = await fetch('https://n8n1.food-u.live/webhook/get-all-products', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }
      
      // Check if response has content
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API returned non-JSON response')
      }
      
      const responseText = await response.text()
      if (!responseText || responseText.trim() === '') {
        // Empty response could mean no products available, not necessarily an error
        console.log('📦 API returned empty response - assuming no products available')
        setProducts([]) // Set empty array
        setHasDataLoaded(true) // Mark data as loaded
        setError(null) // Don't show error for empty response
        // Save empty state to localStorage
        localStorage.setItem('shoplytic-products-data', JSON.stringify([]))
        localStorage.setItem('shoplytic-products-loaded', 'true')
        localStorage.setItem('shoplytic-products-has-data', 'true')
        return // Exit early without throwing error
      }
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response text:', responseText)
        throw new Error('API returned invalid JSON format')
      }
      
      console.log('📦 Raw API response:', data)
      
      // Handle different response formats
      let productsList = []
      if (Array.isArray(data)) {
        productsList = data
      } else if (data && Array.isArray(data.products)) {
        productsList = data.products
      } else if (data && data.data && Array.isArray(data.data)) {
        productsList = data.data
      } else if (data && typeof data === 'object' && (data.title || data.productId)) {
        // Single product object returned
        productsList = [data]
      } else if (data && typeof data === 'object') {
        // Try to find arrays in the response
        const possibleArrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]))
        if (possibleArrayKeys.length > 0) {
          productsList = data[possibleArrayKeys[0]]
        }
      }
      
      // Transform API data to match our component structure
      // API format:
      // {
      //   "title": "Test-Product",
      //   "productId": 14744698388843,
      //   "variantId": 52233017098603,
      //   "sku": "T-001",
      //   "price": "200.00",
      //   "inventoryItemId": 53298585174379,
      //   "inventoryQuantity": 85,
      //   "vendor": "shoplytic-test"
      // }
      
      const transformedProducts = productsList.map(product => ({
        title: product.title || 'Unknown Product',
        productId: product.productId?.toString() || 'N/A',
        variantId: product.variantId?.toString() || 'N/A',
        sku: product.sku || 'N/A',
        price: product.price ? `₹${product.price}` : '₹0.00',
        inventoryItemId: product.inventoryItemId?.toString() || 'N/A',
        inventoryQuantity: product.inventoryQuantity || 0,
        vendor: product.vendor || 'Unknown Vendor'
      }))
      
      console.log('🔄 Transformed products:', transformedProducts.map(p => ({
        title: p.title,
        sku: p.sku,
        inventoryQuantity: p.inventoryQuantity
      })))
      
      setProducts(transformedProducts)
      setHasDataLoaded(true) // Mark that data has been loaded
      
    } catch (err) {
      console.error('Error fetching products:', err)
      
      let errorMessage = 'Failed to fetch products'
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out'
      } else if (err.message.includes('404')) {
        errorMessage = 'Products API not available - Please activate the webhook in n8n by clicking "Execute workflow"'
      } else if (err.message.includes('empty response')) {
        errorMessage = 'API returned empty response - Webhook may not be configured correctly or no data available'
      } else if (err.message.includes('invalid JSON')) {
        errorMessage = 'API returned invalid data format - Check webhook response format'
      } else if (err.message.includes('non-JSON response')) {
        errorMessage = 'API returned non-JSON response - Check webhook content-type header'
      } else if (err.message.includes('CORS')) {
        errorMessage = 'CORS error - API not allowing requests from this domain'
      } else {
        errorMessage = `API Error: ${err.message}`
      }
      
      setError(errorMessage)
      setProducts([]) // Set empty array when API fails
      
    } finally {
      setLoading(false)
    }
  }

  // Handle product update
  const handleProductUpdate = async (updateData) => {
    try {
      setUpdating(true)
      setUpdateError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      console.log('📦 Updating product with data:', updateData)

      const response = await fetch('https://n8n1.food-u.live/webhook/update-product-info', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      // Check if response has content
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API returned non-JSON response')
      }

      const responseText = await response.text()
      if (!responseText || responseText.trim() === '') {
        throw new Error('API returned empty response')
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response text:', responseText)
        throw new Error('API returned invalid JSON format')
      }

      console.log('📦 Product update response:', data)

      // Update the product locally if update was successful
      setProducts(prev => {
        const updatedProducts = prev.map(product => {
          if (product.variantId === updateData.variant_id.toString()) {
            const updatedProduct = { ...product }
            if (updateData.price !== null) {
              updatedProduct.price = `₹${updateData.price}`
            }
            if (updateData.sku !== null) {
              updatedProduct.sku = updateData.sku
            }
            if (updateData.inventory !== null) {
              updatedProduct.inventoryQuantity = updateData.inventory
            }
            return updatedProduct
          }
          return product
        })
        
        // Save updated products to localStorage
        localStorage.setItem('shoplytic-products-data', JSON.stringify(updatedProducts))
        console.log('💾 Saved updated products to localStorage')
        
        return updatedProducts
      })

      // Close modal
      setShowUpdateModal(false)
      setSelectedProduct(null)

      console.log('✅ Product updated successfully')

    } catch (err) {
      console.error('Error updating product:', err)

      let errorMessage = 'Failed to update product'
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out'
      } else if (err.message.includes('404')) {
        errorMessage = 'Product update API not available - Please check the webhook URL'
      } else if (err.message.includes('empty response')) {
        errorMessage = 'API returned empty response - Update may not have been processed'
      } else if (err.message.includes('invalid JSON')) {
        errorMessage = 'API returned invalid data format'
      } else if (err.message.includes('non-JSON response')) {
        errorMessage = 'API returned non-JSON response - Check webhook configuration'
      } else {
        errorMessage = `API Error: ${err.message}`
      }

      setUpdateError(errorMessage)

    } finally {
      setUpdating(false)
    }
  }

  // Open update modal
  const openUpdateModal = (product) => {
    setSelectedProduct(product)
    setShowUpdateModal(true)
    setUpdateError(null)
  }

  // Close update modal
  const closeUpdateModal = () => {
    setShowUpdateModal(false)
    setSelectedProduct(null)
    setUpdateError(null)
  }

  const filteredProducts = products.filter(product => 
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get inventory status
  const getInventoryStatus = (quantity) => {
    if (quantity <= 0) return { status: 'out-of-stock', label: 'Out of Stock', color: '#dc2626' }
    if (quantity <= 10) return { status: 'low-stock', label: 'Low Stock', color: '#f59e0b' }
    return { status: 'in-stock', label: 'In Stock', color: '#059669' }
  }

  return (
    <div className="products-table-container">
      <div className="products-header">
        <div className="products-title-section">
          <h2 className="products-title">All Products</h2>
        </div>
        
        <div className="products-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by product name, SKU, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              disabled={loading}
            />
            <span className="search-icon">🔍</span>
          </div>
          <button 
            className="refresh-products-btn"
            onClick={() => {
              console.log('🔄 Products refresh clicked')
              fetchProducts()
            }}
            disabled={loading}
            title="Refresh products data"
          >
            🔄 {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="products-error-banner">
          <p>⚠️ {error}. Table will show empty if no data available.</p>
        </div>
      )}

      <div className="products-table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Inventory</th>
              <th>Status</th>
              <th>Vendor</th>
              <th>Product ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`loading-${index}`} className="loading-row">
                  <td><div className="skeleton-cell"></div></td>
                  <td><div className="skeleton-cell"></div></td>
                  <td><div className="skeleton-cell"></div></td>
                  <td><div className="skeleton-cell"></div></td>
                  <td><div className="skeleton-cell"></div></td>
                  <td><div className="skeleton-cell"></div></td>
                  <td><div className="skeleton-cell"></div></td>
                  <td><div className="skeleton-cell"></div></td>
                </tr>
              ))
            ) : (
              filteredProducts.map((product, index) => {
                const inventoryStatus = getInventoryStatus(product.inventoryQuantity)
                
                return (
                  <tr key={product.productId || index}>
                    <td className="product-title">{product.title}</td>
                    <td className="product-sku">
                      <span className="sku-badge">{product.sku}</span>
                    </td>
                    <td className="product-price">{product.price}</td>
                    <td className="inventory-quantity">
                      <span className="quantity-value">{product.inventoryQuantity}</span>
                    </td>
                    <td className="inventory-status">
                      <span 
                        className={`status-badge inventory-${inventoryStatus.status}`}
                        style={{ backgroundColor: inventoryStatus.color }}
                      >
                        {inventoryStatus.label}
                      </span>
                    </td>
                    <td className="product-vendor">{product.vendor}</td>
                    <td className="product-id">{product.productId}</td>
                    <td className="actions-column">
                      <button 
                        className="edit-btn"
                        onClick={() => openUpdateModal(product)}
                        disabled={updating}
                        title="Edit product details"
                      >
                        {updating ? '⏳' : '✏️'} Edit
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        
        {!loading && !hasDataLoaded && (
          <div className="no-data-message">
            <p>📦 Click the refresh button to load products data.</p>
          </div>
        )}
        
        {!loading && filteredProducts.length === 0 && hasDataLoaded && (
          <div className="no-products">
            {products.length === 0 ? (
              <p>📦 No products found.</p>
            ) : (
              <p>🔍 No products found matching your search criteria.</p>
            )}
          </div>
        )}
      </div>
      
      {/* Product Update Modal */}
      {showUpdateModal && selectedProduct && (
        <ProductUpdateModal
          product={selectedProduct}
          onUpdate={handleProductUpdate}
          onClose={closeUpdateModal}
          updating={updating}
          updateError={updateError}
        />
      )}
    </div>
  )
}

export default ProductsTable
