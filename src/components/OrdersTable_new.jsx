import React, { useState, useEffect } from 'react'
import './OrdersTable.css'

const OrdersTable = ({ onRefreshOrders }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState([])
  const [fulfilling, setFulfilling] = useState(false)

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
      
      // Handle different response formats
      let ordersList = []
      if (Array.isArray(data)) {
        ordersList = data
      } else if (data && Array.isArray(data.orders)) {
        ordersList = data.orders
      } else if (data && data.data && Array.isArray(data.data)) {
        ordersList = data.data
      } else if (data && typeof data === 'object' && data.orderNumber) {
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
      const transformedOrders = ordersList.map(order => ({
        orderNumber: order.orderNumber?.toString() || 'N/A',
        customer: order.customerName || 'Unknown Customer',
        totalPrice: order.totalPrice ? `₹${order.totalPrice}` : '₹0',
        paymentType: order.paymentType || 'unknown',
        status: order.status || 'pending',
        fulfillmentStatus: order.fulfillmentStatus || (order.status === 'fulfilled' ? 'fulfilled' : 'unfulfilled'),
        createdAt: order.createdAt ? 
          new Date(order.createdAt).toLocaleString() : 
          new Date().toLocaleString()
      }))
      
      setOrders(transformedOrders) // Show all orders of the day, not limited to 10
      setSelectedOrders([]) // Clear selections when data refreshes
      
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
    fetchOrders()
  }, [])

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
                        {order.fulfillmentStatus === 'fulfilled' ? '✅ Fulfilled' : '⏳ Unfulfilled'}
                      </span>
                    </td>
                    <td className="created-at">{order.createdAt}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        
        {!loading && filteredOrders.length === 0 && (
          <div className="no-orders">
            {orders.length === 0 ? (
              <p>No orders available from the API.</p>
            ) : (
              <p>No orders found matching your search criteria.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrdersTable
