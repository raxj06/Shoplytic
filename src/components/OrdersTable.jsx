import React, { useState, useEffect } from 'react'
import './OrdersTable.css'

const OrdersTable = ({ onRefreshOrders }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false) // Changed to false - no auto loading
  const [error, setError] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState([])
  const [fulfilling, setFulfilling] = useState(false)
  const [hasDataLoaded, setHasDataLoaded] = useState(false) // Track if data has been loaded
  
  // Order details state
  const [orderDetails, setOrderDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Fetch orders from API - no rate limiting, always allow refresh
  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('https://n8n.food-u.live/webhook/get-orders-list', {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📋 Raw API response:', data)
      
      // Handle different response formats
      let ordersList = []
      if (Array.isArray(data)) {
        ordersList = data
      } else if (data && Array.isArray(data.orders)) {
        ordersList = data.orders
      } else if (data && data.data && Array.isArray(data.data)) {
        ordersList = data.data
      } else if (data && typeof data === 'object' && (data.orderNumber || data.order_id)) {
        // Single order object returned
        ordersList = [data]
      } else if (data && typeof data === 'object') {
        // Try to find arrays in the response
        const possibleArrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]))
        if (possibleArrayKeys.length > 0) {
          ordersList = data[possibleArrayKeys[0]]
        }
      }
      
      // Transform API data to match our component structure
      // Now supporting the new API format with fulfillmentStatus:
      // {
      //   "orderNumber": 1006,
      //   "customerName": "Raj V",
      //   "totalPrice": 708,
      //   "status": "paid",
      //   "paymentType": "bogus",
      //   "createdAt": "2025-07-30T23:15:30-04:00",
      //   "fulfillmentStatus": "fulfilled"
      // }
      const transformedOrders = ordersList.map(order => ({
        orderNumber: (order.orderNumber || order.order_id)?.toString() || 'N/A',
        customer: order.customerName || order.customer_name || 'Unknown Customer',
        totalPrice: order.totalPrice || order.total_price ? `₹${order.totalPrice || order.total_price}` : '₹0',
        paymentType: order.paymentType || order.payment_type || 'unknown',
        status: order.status || order.payment_status || 'pending',
        fulfillmentStatus: order.fulfillmentStatus || order.fulfillment_status || 'unfulfilled',
        createdAt: order.createdAt || order.created_at ? 
          new Date(order.createdAt || order.created_at).toLocaleString() : 
          new Date().toLocaleString()
      }))
      
      console.log('🔄 Transformed orders with fulfillment status:', transformedOrders.map(o => ({
        orderNumber: o.orderNumber,
        customer: o.customer,
        fulfillmentStatus: o.fulfillmentStatus
      })))
      
      setOrders(transformedOrders) // Show all orders of the day, not limited to 10
      setSelectedOrders([]) // Clear selections when data refreshes
      setHasDataLoaded(true) // Mark that data has been loaded
      
    } catch (err) {
      console.error('Error fetching orders:', err)
      
      let errorMessage = 'Failed to fetch orders'
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out'
      } else if (err.message.includes('404')) {
        errorMessage = 'Orders API not available - Please activate the webhook in n8n by clicking "Execute workflow"'
      } else if (err.message.includes('CORS')) {
        errorMessage = 'CORS error - API not allowing requests from this domain'
      } else {
        errorMessage = `API Error: ${err.message}`
      }
      
      setError(errorMessage)
      setOrders([]) // Set empty array when API fails
      
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Removed auto-fetch on component mount
    // Data will only be fetched when user clicks refresh button
  }, [])

  // Fetch order details from API
  const fetchOrderDetails = async (orderId) => {
    try {
      setDetailsLoading(true)
      setDetailsError(null)
      setShowDetailsModal(true)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('https://n8n.food-u.live/webhook/get-order-details', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: orderId })
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
      
      console.log('📋 Order details response:', data)
      
      setOrderDetails(data)
      
    } catch (err) {
      console.error('Error fetching order details:', err)
      
      let errorMessage = 'Failed to fetch order details'
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out'
      } else if (err.message.includes('404')) {
        errorMessage = 'Order details API not available - Please check the webhook URL'
      } else if (err.message.includes('empty response')) {
        errorMessage = 'API returned empty response - Order may not exist or webhook not configured'
      } else if (err.message.includes('invalid JSON')) {
        errorMessage = 'API returned invalid data format'
      } else if (err.message.includes('non-JSON response')) {
        errorMessage = 'API returned non-JSON response - Check webhook configuration'
      } else {
        errorMessage = `API Error: ${err.message}`
      }
      
      setDetailsError(errorMessage)
      
    } finally {
      setDetailsLoading(false)
    }
  }

  // Close order details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setOrderDetails(null)
    setDetailsError(null)
  }

  // Handle checkbox selection
  const handleOrderSelection = (orderNumber, isSelected) => {
    if (isSelected) {
      setSelectedOrders(prev => [...prev, orderNumber])
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderNumber))
    }
  }

  // Handle select all checkbox
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const unfulfilledOrders = filteredOrders
        .filter(order => order.fulfillmentStatus === 'unfulfilled')
        .map(order => order.orderNumber)
      setSelectedOrders(unfulfilledOrders)
    } else {
      setSelectedOrders([])
    }
  }

  // Fulfill selected orders
  const fulfillSelectedOrders = async () => {
    if (selectedOrders.length === 0) return

    setFulfilling(true)
    const results = []

    try {
      for (const orderNumber of selectedOrders) {
        try {
          const response = await fetch('https://n8n.food-u.live/webhook/fulfill-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: orderNumber })
          })

          if (response.ok) {
            results.push({ orderNumber, success: true })
            // Update the order status locally
            setOrders(prev => prev.map(order => 
              order.orderNumber === orderNumber 
                ? { ...order, fulfillmentStatus: 'fulfilled' }
                : order
            ))
          } else {
            results.push({ orderNumber, success: false, error: `${response.status}: ${response.statusText}` })
          }
        } catch (err) {
          results.push({ orderNumber, success: false, error: err.message })
        }
      }

      // Show results
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      if (successful > 0) {
        console.log(`✅ Successfully fulfilled ${successful} orders`)
        // Refresh dashboard metrics if callback provided
        if (onRefreshOrders) {
          onRefreshOrders()
        }
      }
      
      if (failed > 0) {
        console.error(`❌ Failed to fulfill ${failed} orders`)
        results.filter(r => !r.success).forEach(r => {
          console.error(`Order ${r.orderNumber}: ${r.error}`)
        })
      }

      // Clear selections
      setSelectedOrders([])
      
    } catch (err) {
      console.error('Error fulfilling orders:', err)
    } finally {
      setFulfilling(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber.toString().includes(searchTerm)
    const matchesStatus = statusFilter === 'All Statuses' || order.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  // Get unfulfilled orders that can be selected
  const unfulfilledOrders = filteredOrders.filter(order => order.fulfillmentStatus === 'unfulfilled')
  const selectedUnfulfilledCount = selectedOrders.filter(orderId => 
    unfulfilledOrders.some(order => order.orderNumber === orderId)
  ).length
  const allUnfulfilledSelected = unfulfilledOrders.length > 0 && selectedUnfulfilledCount === unfulfilledOrders.length

  return (
    <div className="orders-table-container">
      <div className="orders-header">
        <div className="orders-title-section">
          <h2 className="orders-title">All Orders Today</h2>
          {selectedOrders.length > 0 && (
            <div className="fulfill-section">
              <span className="selected-count">
                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
              </span>
              <button 
                className="fulfill-btn"
                onClick={fulfillSelectedOrders}
                disabled={fulfilling || selectedOrders.length === 0}
              >
                {fulfilling ? '⏳ Fulfilling...' : '✅ Fulfill Selected'}
              </button>
            </div>
          )}
        </div>
        <div className="orders-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by customer name or order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              disabled={loading}
            />
            <span className="search-icon">🔍</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
            disabled={loading}
          >
            <option>All Statuses</option>
            <option>Paid</option>
            <option>Pending</option>
            <option>Cancelled</option>
            <option>Fulfilled</option>
          </select>
          <button 
            className="refresh-orders-btn"
            onClick={() => {
              fetchOrders()
              // Also refresh dashboard metrics if callback provided
              if (onRefreshOrders) {
                onRefreshOrders()
              }
            }}
            disabled={loading}
          >
            🔄 {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="orders-error-banner">
          <p>⚠️ {error}. Table will show empty if no data available.</p>
        </div>
      )}

      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={allUnfulfilledSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={loading || unfulfilledOrders.length === 0}
                  title="Select all unfulfilled orders"
                />
              </th>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Total Price</th>
              <th>Payment Type</th>
              <th>Status</th>
              <th>Fulfillment</th>
              <th>Created At</th>
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
                  <td><div className="skeleton-cell"></div></td>
                </tr>
              ))
            ) : (
              filteredOrders.map((order, index) => {
                const isUnfulfilled = order.fulfillmentStatus === 'unfulfilled'
                const isSelected = selectedOrders.includes(order.orderNumber)
                
                return (
                  <tr key={order.orderNumber || index} className={isSelected ? 'selected-row' : ''}>
                    <td className="checkbox-column">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleOrderSelection(order.orderNumber, e.target.checked)}
                        disabled={!isUnfulfilled || fulfilling}
                        title={isUnfulfilled ? 'Select for fulfillment' : 'Already fulfilled'}
                      />
                    </td>
                    <td className="order-number">{order.orderNumber}</td>
                    <td className="customer-name">{order.customer}</td>
                    <td className="total-price">{order.totalPrice}</td>
                    <td className="payment-type">
                      <span className="payment-badge">{order.paymentType}</span>
                    </td>
                    <td className="order-status">
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="fulfillment-status">
                      <span className={`fulfillment-badge fulfillment-${order.fulfillmentStatus.toLowerCase()}`}>
                        {order.fulfillmentStatus === 'fulfilled' ? '✅ Fulfilled' : 
                         order.fulfillmentStatus === 'restocked' ? '📦 Restocked' :
                         order.fulfillmentStatus === 'cancelled' ? '❌ Cancelled' :
                         '⏳ Unfulfilled'}
                      </span>
                    </td>
                    <td className="created-at">{order.createdAt}</td>
                    <td className="actions-column">
                      <button 
                        className="detail-btn"
                        onClick={() => fetchOrderDetails(order.orderNumber)}
                        disabled={detailsLoading}
                        title="View order details"
                      >
                        {detailsLoading ? '⏳' : '📋'} Detail
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
            <p>📊 Click the refresh button to load orders data.</p>
          </div>
        )}
        
        {!loading && filteredOrders.length === 0 && hasDataLoaded && (
          <div className="no-orders">
            {orders.length === 0 ? (
              <p>No orders available from the API.</p>
            ) : (
              <p>No orders found matching your search criteria.</p>
            )}
          </div>
        )}
      </div>
      
      {/* Order Details Modal */}
      {showDetailsModal && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Details</h3>
              <button className="close-btn" onClick={closeDetailsModal}>✕</button>
            </div>
            <div className="modal-body">
              {detailsLoading ? (
                <div className="details-loading">
                  <p>⏳ Loading order details...</p>
                </div>
              ) : detailsError ? (
                <div className="details-error">
                  <p>❌ {detailsError}</p>
                </div>
              ) : orderDetails ? (
                <div className="order-details">
                  <div className="details-grid">
                    {/* Display array data */}
                    {Array.isArray(orderDetails) && orderDetails.length > 0 ? (
                      orderDetails.map((order, index) => (
                        <div key={index} className="order-detail-card">
                          {/* Basic Order Info */}
                          <div className="detail-section">
                            <h4>📦 Order Information</h4>
                            <div className="detail-item">
                              <strong>Order Number:</strong> {order.order_number || 'N/A'}
                            </div>
                            <div className="detail-item">
                              <strong>Order ID:</strong> {order.order_id || 'N/A'}
                            </div>
                            <div className="detail-item">
                              <strong>Total Price:</strong> ₹{order.total_price || '0'}
                            </div>
                            <div className="detail-item">
                              <strong>Product Name:</strong> {order.product_name || 'N/A'}
                            </div>
                            <div className="detail-item">
                              <strong>Product SKU:</strong> {order.product_sku || 'N/A'}
                            </div>
                            <div className="detail-item">
                              <strong>Quantity:</strong> {order.quantity || '1'}
                            </div>
                            <div className="detail-item">
                              <strong>Fulfillment Status:</strong>
                              <span className={`fulfillment-badge fulfillment-${(order.fulfillment_status || 'unfulfilled').toLowerCase()}`}>
                                {order.fulfillment_status === 'fulfilled' ? '✅ Fulfilled' : 
                                 order.fulfillment_status === 'restocked' ? '📦 Restocked' : 
                                 order.fulfillment_status === 'cancelled' ? '❌ Cancelled' :
                                 '⏳ Unfulfilled'}
                              </span>
                            </div>
                            <div className="detail-item">
                              <strong>Created At:</strong> {order.created_at ? 
                                new Date(order.created_at).toLocaleString() : 'N/A'}
                            </div>
                          </div>

                          {/* Customer Info */}
                          <div className="detail-section">
                            <h4>👤 Customer Information</h4>
                            <div className="detail-item">
                              <strong>Name:</strong> {order.customer_name || 'N/A'}
                            </div>
                            <div className="detail-item">
                              <strong>Email:</strong> {order.contact_email || 'N/A'}
                            </div>
                            <div className="detail-item">
                              <strong>Phone:</strong> {order.customer_phone || 'N/A'}
                            </div>
                            <div className="detail-item">
                              <strong>Address:</strong> {order.customer_address || 'N/A'}
                            </div>
                            <div className="detail-item">
                              <strong>City:</strong> {order.city || 'N/A'}
                            </div>
                            <div className="detail-item">
                              <strong>Pincode:</strong> {order.pincode || 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      /* Fallback for non-array format */
                      <>
                        {/* Basic Order Info */}
                        <div className="detail-section">
                          <h4>� Order Information</h4>
                          <div className="detail-item">
                            <strong>Order Number:</strong> {orderDetails.order_number || orderDetails.orderNumber || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>Order ID:</strong> {orderDetails.order_id || orderDetails.orderId || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>Total Price:</strong> ₹{orderDetails.total_price || orderDetails.totalPrice || '0'}
                          </div>
                          <div className="detail-item">
                            <strong>Product Name:</strong> {orderDetails.product_name || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>Product SKU:</strong> {orderDetails.product_sku || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>Quantity:</strong> {orderDetails.quantity || '1'}
                          </div>
                          <div className="detail-item">
                            <strong>Fulfillment Status:</strong>
                            <span className={`fulfillment-badge fulfillment-${(orderDetails.fulfillment_status || orderDetails.fulfillmentStatus || 'unfulfilled').toLowerCase()}`}>
                              {(orderDetails.fulfillment_status || orderDetails.fulfillmentStatus) === 'fulfilled' ? '✅ Fulfilled' : 
                               (orderDetails.fulfillment_status || orderDetails.fulfillmentStatus) === 'restocked' ? '📦 Restocked' : 
                               (orderDetails.fulfillment_status || orderDetails.fulfillmentStatus) === 'cancelled' ? '❌ Cancelled' :
                               '⏳ Unfulfilled'}
                            </span>
                          </div>
                          <div className="detail-item">
                            <strong>Created At:</strong> {orderDetails.created_at || orderDetails.createdAt ? 
                              new Date(orderDetails.created_at || orderDetails.createdAt).toLocaleString() : 'N/A'}
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="detail-section">
                          <h4>👤 Customer Information</h4>
                          <div className="detail-item">
                            <strong>Name:</strong> {orderDetails.customer_name || orderDetails.customerName || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>Email:</strong> {orderDetails.contact_email || orderDetails.customerEmail || orderDetails.customer_email || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>Phone:</strong> {orderDetails.customer_phone || orderDetails.customerPhone || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>Address:</strong> {orderDetails.customer_address || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>City:</strong> {orderDetails.city || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>Pincode:</strong> {orderDetails.pincode || 'N/A'}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Raw Data (for debugging) */}
                    <div className="detail-section full-width">
                      <details>
                        <summary>🔍 Raw API Response (for debugging)</summary>
                        <pre className="raw-data">{JSON.stringify(orderDetails, null, 2)}</pre>
                      </details>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-details">
                  <p>No order details available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersTable
