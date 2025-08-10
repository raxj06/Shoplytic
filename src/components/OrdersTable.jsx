import React, { useState, useEffect } from 'react'
import './OrdersTable.css'

const OrdersTable = ({ startDate: propStartDate, endDate: propEndDate, refreshTrigger }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('All Fulfillment')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false) // Changed to false - no auto loading
  const [error, setError] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState([])
  const [fulfilling, setFulfilling] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [hasDataLoaded, setHasDataLoaded] = useState(false) // Track if data has been loaded
  
  // Local date state for independent date control (when not getting dates from props)
  const [localStartDate, setLocalStartDate] = useState('')
  const [localEndDate, setLocalEndDate] = useState('')
  
  // Use local dates if no props provided, otherwise use props
  const startDate = propStartDate !== undefined ? propStartDate : localStartDate
  const endDate = propEndDate !== undefined ? propEndDate : localEndDate
  
  // Debug: Log component mode
  console.log('🔧 OrdersTable mode:', {
    propStartDate,
    propEndDate,
    refreshTrigger,
    isIndependentMode: propStartDate === undefined && propEndDate === undefined,
    currentStartDate: startDate,
    currentEndDate: endDate
  })
  
  // Order details state
  const [orderDetails, setOrderDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Save local dates to localStorage when they change (only if not using props)
  useEffect(() => {
    if (propStartDate === undefined && localStartDate) {
      localStorage.setItem('shoplytic-orders-start-date', localStartDate)
    }
  }, [localStartDate, propStartDate])

  useEffect(() => {
    if (propEndDate === undefined && localEndDate) {
      localStorage.setItem('shoplytic-orders-end-date', localEndDate)
    }
  }, [localEndDate, propEndDate])

  // Save orders data to localStorage when it changes
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('shoplytic-orders-data', JSON.stringify(orders))
      localStorage.setItem('shoplytic-orders-loaded', 'true')
      console.log('💾 Saved orders data to localStorage:', orders.length, 'orders')
    }
  }, [orders])
  
  // Debug function to clear persisted order statuses (can be called from browser console)
  window.clearPersistedOrderStatuses = () => {
    localStorage.removeItem('shoplytic-order-statuses')
    console.log('🗑️ Cleared persisted order statuses from localStorage')
  }
  
  // Debug function to manually set an order status (for testing)
  window.setOrderStatus = (orderNumber, status) => {
    const persistedStatuses = JSON.parse(localStorage.getItem('shoplytic-order-statuses') || '{}')
    persistedStatuses[orderNumber] = status
    localStorage.setItem('shoplytic-order-statuses', JSON.stringify(persistedStatuses))
    console.log(`🔧 Set order ${orderNumber} status to: ${status}`)
    // Trigger a re-fetch to see the changes
    fetchOrders()
  }
  
  // Debug function to sync order statuses (resolve mismatches)
  window.syncOrderStatuses = () => {
    const persistedStatuses = JSON.parse(localStorage.getItem('shoplytic-order-statuses') || '{}')
    console.log('🔄 Current persisted statuses:', persistedStatuses)
    
    // Update current orders state to match persisted statuses
    setOrders(prev => {
      const updatedOrders = prev.map(order => {
        const persistedStatus = persistedStatuses[order.orderNumber]
        if (persistedStatus && (persistedStatus === 'fulfilled' || persistedStatus === 'cancelled' || persistedStatus === 'restocked')) {
          console.log(`🔄 Syncing order ${order.orderNumber} to status: ${persistedStatus}`)
          return {
            ...order,
            fulfillmentStatus: persistedStatus
          }
        }
        return order
      })
      
      // Save updated orders to localStorage
      localStorage.setItem('shoplytic-orders-data', JSON.stringify(updatedOrders))
      return updatedOrders
    })
    
    console.log('✅ Order statuses synchronized')
  }
  
  // Debug function to fix mismatched orders (prioritize local processed status over API unfulfilled)
  window.fixOrderMismatches = () => {
    console.log('🔧 Fixing order status mismatches - preserving local processed statuses over API unfulfilled')
    const persistedStatuses = JSON.parse(localStorage.getItem('shoplytic-order-statuses') || '{}')
    console.log('� Current persisted statuses:', persistedStatuses)
    
    // Force refresh to apply new priority logic
    fetchOrders()
    console.log('🔄 Applied new priority logic (local processed status > API unfulfilled)')
  }

  // Save hasDataLoaded state to localStorage
  useEffect(() => {
    localStorage.setItem('shoplytic-orders-has-data', hasDataLoaded.toString())
    console.log('💾 Saved hasDataLoaded state:', hasDataLoaded)
  }, [hasDataLoaded])

  // Load saved orders data on component mount
  useEffect(() => {
    const savedOrders = localStorage.getItem('shoplytic-orders-data')
    const savedHasDataLoaded = localStorage.getItem('shoplytic-orders-has-data') === 'true'
    const savedOrdersLoaded = localStorage.getItem('shoplytic-orders-loaded') === 'true'
    
    console.log('🔍 OrdersTable mount - checking saved data:', { 
      hasSavedOrders: !!savedOrders, 
      savedHasDataLoaded,
      savedOrdersLoaded,
      propStartDate,
      propEndDate,
      refreshTrigger 
    })
    
    // Restore data if any of the loaded flags are true
    if (savedOrders && (savedHasDataLoaded || savedOrdersLoaded)) {
      try {
        const parsedOrders = JSON.parse(savedOrders)
        if (Array.isArray(parsedOrders)) {
          setOrders(parsedOrders)
          setHasDataLoaded(true)
          console.log('📋 Restored orders data from localStorage:', parsedOrders.length, 'orders')
        }
      } catch (error) {
        console.error('Error parsing saved orders data:', error)
        localStorage.removeItem('shoplytic-orders-data')
        localStorage.removeItem('shoplytic-orders-has-data')
        localStorage.removeItem('shoplytic-orders-loaded')
      }
    }
    
    // Also load saved local dates if in independent mode
    if (propStartDate === undefined) {
      const savedLocalStartDate = localStorage.getItem('shoplytic-orders-start-date')
      if (savedLocalStartDate) {
        setLocalStartDate(savedLocalStartDate)
        console.log('📅 Restored local start date:', savedLocalStartDate)
      }
    }
    if (propEndDate === undefined) {
      const savedLocalEndDate = localStorage.getItem('shoplytic-orders-end-date')
      if (savedLocalEndDate) {
        setLocalEndDate(savedLocalEndDate)
        console.log('📅 Restored local end date:', savedLocalEndDate)
      }
    }
  }, [])

  // Removed separate useEffect for local dates since it's now in the mount effect

  // Fetch orders from API - no rate limiting, always allow refresh
  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      // Build URL with date parameters
      const url = new URL('https://n8n1.food-u.live/webhook/get-orders-list')
      if (startDate) {
        url.searchParams.append('startDate', startDate)
        console.log('📅 Added startDate parameter:', startDate)
      }
      if (endDate) {
        url.searchParams.append('endDate', endDate)
        console.log('📅 Added endDate parameter:', endDate)
      }
      
      console.log('📋 Fetching orders from URL:', url.toString())
      console.log('📋 URL should match format: https://n8n1.food-u.live/webhook/get-orders-list?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD')
      
      const response = await fetch(url.toString(), {
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
        // Empty response could mean no orders available, not necessarily an error
        console.log('📋 API returned empty response - assuming no orders available')
        setOrders([]) // Set empty array
        setHasDataLoaded(true) // Mark data as loaded
        setError(null) // Don't show error for empty response
        // Save empty state to localStorage
        localStorage.setItem('shoplytic-orders-data', JSON.stringify([]))
        localStorage.setItem('shoplytic-orders-loaded', 'true')
        localStorage.setItem('shoplytic-orders-has-data', 'true')
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
      
      // Get current orders from state to preserve local changes
      const currentOrders = orders || []
      const currentOrdersMap = new Map(currentOrders.map(order => [order.orderNumber, order]))
      
      // Also get persisted order status changes from localStorage
      const persistedOrderStatuses = JSON.parse(localStorage.getItem('shoplytic-order-statuses') || '{}')
      console.log('💾 Loading persisted order statuses:', persistedOrderStatuses)
      
      const transformedOrders = ordersList.map(order => {
        const orderNumber = (order.orderNumber || order.order_id)?.toString() || 'N/A'
        const apiData = {
          orderNumber,
          customer: order.customerName || order.customer_name || 'Unknown Customer',
          totalPrice: order.totalPrice || order.total_price ? `₹${order.totalPrice || order.total_price}` : '₹0',
          paymentType: order.paymentType || order.payment_type || 'unknown',
          status: order.status || order.payment_status || 'pending',
          fulfillmentStatus: order.fulfillmentStatus || order.fulfillment_status || 'unfulfilled',
          createdAt: order.createdAt || order.created_at ? 
            new Date(order.createdAt || order.created_at).toLocaleString() : 
            new Date().toLocaleString()
        }
        
        // Priority: Determine the most accurate status
        const apiStatus = apiData.fulfillmentStatus
        const persistedStatus = persistedOrderStatuses[orderNumber]
        const existingOrder = currentOrdersMap.get(orderNumber)
        
        // Smart priority logic:
        // 1. If we have a local action (fulfilled/cancelled/restocked), prioritize it over unfulfilled API status
        // 2. Only let API override local status if API has a processed status (fulfilled/cancelled/restocked)
        // 3. This prevents API's unfulfilled from overriding manual cancellations/fulfillments
        
        if (persistedStatus && (persistedStatus === 'fulfilled' || persistedStatus === 'cancelled' || persistedStatus === 'restocked')) {
          // We have a local processed status
          if (apiStatus && (apiStatus === 'fulfilled' || apiStatus === 'cancelled' || apiStatus === 'restocked')) {
            // API also has processed status - use API as source of truth
            console.log(`🔄 Using API processed status for order ${orderNumber}: ${apiStatus} (overriding local ${persistedStatus})`)
            if (apiStatus !== persistedStatus) {
              persistedOrderStatuses[orderNumber] = apiStatus
              localStorage.setItem('shoplytic-order-statuses', JSON.stringify(persistedOrderStatuses))
              console.log(`💾 Updated persisted status for order ${orderNumber} from ${persistedStatus} to ${apiStatus}`)
            }
            return apiData
          } else {
            // API has unfulfilled/no status, but we have local processed status - keep local
            console.log(`🔄 Keeping local processed status for order ${orderNumber}: ${persistedStatus} (API: ${apiStatus || 'none'})`)
            return {
              ...apiData,
              fulfillmentStatus: persistedStatus
            }
          }
        }
        
        // No local processed status - use API status if available
        if (apiStatus) {
          console.log(`🔄 Using API status for order ${orderNumber}: ${apiStatus} (no local override)`)
          // Save API status to persistence for consistency
          if (apiStatus !== persistedStatus) {
            persistedOrderStatuses[orderNumber] = apiStatus
            localStorage.setItem('shoplytic-order-statuses', JSON.stringify(persistedOrderStatuses))
            console.log(`💾 Saved API status for order ${orderNumber}: ${apiStatus}`)
          }
          return apiData
        }
        
        // Fallback to existing order status
        if (existingOrder && (existingOrder.fulfillmentStatus === 'fulfilled' || existingOrder.fulfillmentStatus === 'cancelled' || existingOrder.fulfillmentStatus === 'restocked')) {
          console.log(`🔄 Using existing order status for order ${orderNumber}: ${existingOrder.fulfillmentStatus}`)
          // Save to persistence for future consistency
          persistedOrderStatuses[orderNumber] = existingOrder.fulfillmentStatus
          localStorage.setItem('shoplytic-order-statuses', JSON.stringify(persistedOrderStatuses))
          return {
            ...apiData,
            fulfillmentStatus: existingOrder.fulfillmentStatus
          }
        }
        
        return apiData
      })
      
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
      setOrders([]) // Set empty array when API fails
      
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Removed auto-fetch on component mount
    // Data will only be fetched when user clicks refresh button
  }, [])

  // Refetch orders when date range changes (if data has been loaded before)
  useEffect(() => {
    console.log('📅 Date range changed:', { startDate, endDate, hasDataLoaded })
    if (hasDataLoaded && (startDate || endDate)) {
      console.log('🔄 Auto-refetching orders due to date range change')
      fetchOrders()
    }
  }, [startDate, endDate])

  // Also watch local dates specifically for independent mode
  useEffect(() => {
    console.log('📅 Local date range changed:', { localStartDate, localEndDate, hasDataLoaded, propStartDate, propEndDate })
    // Only trigger if in independent mode (no props) and data has been loaded
    if (propStartDate === undefined && propEndDate === undefined && hasDataLoaded && (localStartDate || localEndDate)) {
      console.log('🔄 Auto-refetching orders due to local date range change in independent mode')
      fetchOrders()
    }
  }, [localStartDate, localEndDate])

  // Trigger refresh when refreshTrigger changes (from dashboard refresh button)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Refreshing orders due to dashboard refresh trigger')
      fetchOrders()
    }
  }, [refreshTrigger])

  // Fetch order details from API
  const fetchOrderDetails = async (orderId) => {
    try {
      setDetailsLoading(true)
      setDetailsError(null)
      setShowDetailsModal(true)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('https://n8n1.food-u.live/webhook/get-order-details', {
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
      const selectableOrders = filteredOrders
        .filter(order => order.fulfillmentStatus === 'unfulfilled')
        .map(order => order.orderNumber)
      setSelectedOrders(selectableOrders)
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
          const response = await fetch('https://n8n1.food-u.live/webhook/fulfill-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: orderNumber })
          })

          if (response.ok) {
            results.push({ orderNumber, success: true })
            
            // Update the order status locally
            setOrders(prev => {
              const updatedOrders = prev.map(order => 
                order.orderNumber === orderNumber 
                  ? { ...order, fulfillmentStatus: 'fulfilled' }
                  : order
              )
              // Immediately save updated orders to localStorage to persist across refreshes
              localStorage.setItem('shoplytic-orders-data', JSON.stringify(updatedOrders))
              console.log(`💾 Saved fulfilled order ${orderNumber} to localStorage`)
              return updatedOrders
            })
            
            // Also persist the status change in a separate localStorage entry for better reliability
            const persistedStatuses = JSON.parse(localStorage.getItem('shoplytic-order-statuses') || '{}')
            persistedStatuses[orderNumber] = 'fulfilled'
            localStorage.setItem('shoplytic-order-statuses', JSON.stringify(persistedStatuses))
            console.log(`💾 Persisted fulfilled status for order ${orderNumber}`)
            
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

  // Cancel selected orders
  const cancelSelectedOrders = async () => {
    if (selectedOrders.length === 0) return

    setCancelling(true)
    const results = []

    try {
      for (const orderNumber of selectedOrders) {
        try {
          const response = await fetch('https://n8n1.food-u.live/webhook/cancel-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: orderNumber })
          })

          if (response.ok) {
            // Parse the response to check if cancellation was successful
            const responseData = await response.json()
            console.log(`📋 Cancel response for order ${orderNumber}:`, responseData)
            
            // Check if response is an array or single object
            const cancelData = Array.isArray(responseData) ? responseData[0] : responseData
            
            if (cancelData && cancelData.success === true) {
              results.push({ orderNumber, success: true, message: cancelData.message || 'Order cancelled successfully' })
              
              // Update the order status locally only if API confirms success
              setOrders(prev => {
                const updatedOrders = prev.map(order => 
                  order.orderNumber === orderNumber 
                    ? { ...order, fulfillmentStatus: 'cancelled' }
                    : order
                )
                // Immediately save updated orders to localStorage to persist across refreshes
                localStorage.setItem('shoplytic-orders-data', JSON.stringify(updatedOrders))
                console.log(`💾 Saved cancelled order ${orderNumber} to localStorage`)
                return updatedOrders
              })
              
              // Also persist the status change in a separate localStorage entry for better reliability
              const persistedStatuses = JSON.parse(localStorage.getItem('shoplytic-order-statuses') || '{}')
              persistedStatuses[orderNumber] = 'cancelled'
              localStorage.setItem('shoplytic-order-statuses', JSON.stringify(persistedStatuses))
              console.log(`💾 Persisted cancelled status for order ${orderNumber}`)
              
            } else {
              // API returned OK but success is false
              const errorMsg = cancelData?.message || 'Cancellation failed - API returned success: false'
              results.push({ orderNumber, success: false, error: errorMsg })
            }
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
        console.log(`✅ Successfully cancelled ${successful} orders`)
        // Refresh dashboard metrics if callback provided
        if (onRefreshOrders) {
          onRefreshOrders()
        }
      }
      
      if (failed > 0) {
        console.error(`❌ Failed to cancel ${failed} orders`)
        results.filter(r => !r.success).forEach(r => {
          console.error(`Order ${r.orderNumber}: ${r.error}`)
        })
      }

      // Clear selections
      setSelectedOrders([])
      
    } catch (err) {
      console.error('Error cancelling orders:', err)
    } finally {
      setCancelling(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber.toString().includes(searchTerm)
    const matchesStatus = statusFilter === 'All Statuses' || order.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesFulfillment = fulfillmentFilter === 'All Fulfillment' || order.fulfillmentStatus.toLowerCase() === fulfillmentFilter.toLowerCase()
    return matchesSearch && matchesStatus && matchesFulfillment
  })

  // Get unfulfilled orders that can be selected for fulfillment/cancellation
  const selectableOrders = filteredOrders.filter(order => order.fulfillmentStatus === 'unfulfilled')
  const selectedSelectableCount = selectedOrders.filter(orderId => 
    selectableOrders.some(order => order.orderNumber === orderId)
  ).length
  const allSelectableSelected = selectableOrders.length > 0 && selectedSelectableCount === selectableOrders.length

  return (
    <div className="orders-table-container">
      <div className="orders-header">
        <div className="orders-title-section">
          <h2 className="orders-title">All Orders</h2>
          {selectedOrders.length > 0 && (
            <div className="fulfill-section">
              <span className="selected-count">
                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
              </span>
              <button 
                className="fulfill-btn"
                onClick={fulfillSelectedOrders}
                disabled={fulfilling || cancelling || selectedOrders.length === 0}
              >
                {fulfilling ? '⏳ Fulfilling...' : '✅ Fulfill Selected'}
              </button>
              <button 
                className="cancel-btn"
                onClick={cancelSelectedOrders}
                disabled={fulfilling || cancelling || selectedOrders.length === 0}
              >
                {cancelling ? '⏳ Cancelling...' : '❌ Cancel Selected'}
              </button>
            </div>
          )}
        </div>
        
        {/* Date filter section - only show if not using props (independent mode) */}
        {propStartDate === undefined && propEndDate === undefined && (
          <div className="orders-date-filter">
            <div className="date-inputs">
              <div className="date-input-group">
                <label htmlFor="orders-start-date">Start Date:</label>
                <input
                  id="orders-start-date"
                  type="date"
                  value={localStartDate}
                  onChange={(e) => {
                    console.log('📅 Orders page date changed:', e.target.value)
                    setLocalStartDate(e.target.value)
                  }}
                  className="date-input"
                  disabled={loading}
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="orders-end-date">End Date:</label>
                <input
                  id="orders-end-date"
                  type="date"
                  value={localEndDate}
                  onChange={(e) => {
                    console.log('📅 Orders page end date changed:', e.target.value)
                    setLocalEndDate(e.target.value)
                  }}
                  className="date-input"
                  disabled={loading}
                />
              </div>
              {(localStartDate || localEndDate) && (
                <button 
                  className="clear-dates-btn"
                  onClick={() => {
                    console.log('🧹 Clearing orders page dates')
                    setLocalStartDate('')
                    setLocalEndDate('')
                    localStorage.removeItem('shoplytic-orders-start-date')
                    localStorage.removeItem('shoplytic-orders-end-date')
                    // Always trigger refresh when clearing dates to show all-time data
                    if (hasDataLoaded) {
                      console.log('🔄 Refreshing after clearing dates')
                      fetchOrders()
                    }
                  }}
                  title="Clear date filter"
                  disabled={loading}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
        )}
        
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
          <select
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
            className="fulfillment-filter"
            disabled={loading}
          >
            <option>All Fulfillment</option>
            <option>Unfulfilled</option>
            <option>Fulfilled</option>
            <option>Cancelled</option>
            <option>Restocked</option>
          </select>
          {/* Refresh button - only show if not using refreshTrigger (independent mode) */}
          {refreshTrigger === undefined && (
            <button 
              className="refresh-orders-btn"
              onClick={() => {
                console.log('🔄 Orders page refresh clicked')
                fetchOrders()
              }}
              disabled={loading}
              title="Refresh orders data"
            >
              🔄 {loading ? 'Loading...' : 'Refresh'}
            </button>
          )}
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
                  checked={allSelectableSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={loading || selectableOrders.length === 0}
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
                const isSelectable = order.fulfillmentStatus === 'unfulfilled'
                const isSelected = selectedOrders.includes(order.orderNumber)
                
                return (
                  <tr key={order.orderNumber || index} className={isSelected ? 'selected-row' : ''}>
                    <td className="checkbox-column">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleOrderSelection(order.orderNumber, e.target.checked)}
                        disabled={!isSelectable || fulfilling || cancelling}
                        title={isSelectable ? 'Select for fulfillment/cancellation' : 'Order already processed'}
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
              <p>📋 No orders found for the selected date range.</p>
            ) : (
              <p>🔍 No orders found matching your search criteria.</p>
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
