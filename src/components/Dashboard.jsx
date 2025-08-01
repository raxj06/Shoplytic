import React, { useState, useEffect } from 'react'
import './Dashboard.css'
import MetricCard from './MetricCard'
import OrdersTable from './OrdersTable'

const Dashboard = () => {
  const [orderSummary, setOrderSummary] = useState(null)
  const [loading, setLoading] = useState(false) // Changed to false - no auto loading
  const [error, setError] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(null)
  const [hasDataLoaded, setHasDataLoaded] = useState(false) // Track if data has been loaded
  
  // Date range state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Ref to trigger orders table refresh
  const [ordersRefreshTrigger, setOrdersRefreshTrigger] = useState(0)

  // Save dates to localStorage when they change
  useEffect(() => {
    if (startDate) {
      localStorage.setItem('shoplytic-start-date', startDate)
    }
  }, [startDate])

  useEffect(() => {
    if (endDate) {
      localStorage.setItem('shoplytic-end-date', endDate)
    }
  }, [endDate])

  // Load saved dates on component mount
  useEffect(() => {
    const savedStartDate = localStorage.getItem('shoplytic-start-date')
    const savedEndDate = localStorage.getItem('shoplytic-end-date')
    
    if (savedStartDate) {
      setStartDate(savedStartDate)
    }
    if (savedEndDate) {
      setEndDate(savedEndDate)
    }
  }, [])

  // Fetch order summary from API
  const fetchOrderSummary = async (isManualRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      // Build URL with date parameters
      const url = new URL('https://n8n.food-u.live/webhook/get-orders-summary')
      if (startDate) {
        url.searchParams.append('startDate', startDate)
        console.log('📅 Added startDate parameter:', startDate)
      }
      if (endDate) {
        url.searchParams.append('endDate', endDate)
        console.log('📅 Added endDate parameter:', endDate)
      }
      
      console.log('📊 Fetching dashboard summary from URL:', url.toString())
      console.log('📊 URL should match format: https://n8n.food-u.live/webhook/get-orders-summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD')
      
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
      
      // Validate the response has the expected fields
      if (typeof data === 'object' && data !== null) {
        setOrderSummary({
          totalOrders: data.totalOrders || 0,
          totalRevenue: data.totalRevenue || 0,
          codConfirmed: data.codConfirmed || 0,
          prepaidOrders: data.prepaidOrders || 0,
          cancelled: data.cancelled || 0,
          fulfilledOrders: data.fulfilledOrders || 0
        })
        
        // Update last fetch time on successful request
        setLastFetchTime(Date.now())
        localStorage.setItem('shoplytic-last-fetch', Date.now().toString())
        setHasDataLoaded(true) // Mark data as loaded
        
        // Save dashboard data to localStorage for persistence across page switches
        localStorage.setItem('shoplytic-dashboard-data', JSON.stringify({
          totalOrders: data.totalOrders || 0,
          totalRevenue: data.totalRevenue || 0,
          codConfirmed: data.codConfirmed || 0,
          prepaidOrders: data.prepaidOrders || 0,
          cancelled: data.cancelled || 0,
          fulfilledOrders: data.fulfilledOrders || 0
        }))
        localStorage.setItem('shoplytic-dashboard-loaded', 'true')
        
        // Removed cooldown functionality - no more startRefreshCooldown()
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error fetching order summary:', err)
      
      let errorMessage = 'Failed to fetch data'
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out'
      } else if (err.message.includes('404')) {
        errorMessage = 'Webhook not found - please activate it first'
      } else if (err.message.includes('empty response')) {
        errorMessage = 'API returned empty response - Webhook may not be configured correctly'
      } else if (err.message.includes('invalid JSON')) {
        errorMessage = 'API returned invalid data format - Check webhook response format'
      } else if (err.message.includes('non-JSON response')) {
        errorMessage = 'API returned non-JSON response - Check webhook content-type header'
      } else {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      
      // Fallback to dummy data if API fails
      setOrderSummary({
        totalOrders: 1,
        totalRevenue: 236,
        codConfirmed: 0,
        prepaidOrders: 1,
        cancelled: 0,
        fulfilledOrders: 1
      })
      setHasDataLoaded(true) // Mark data as loaded even with fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load last fetch time from localStorage
    const storedLastFetchTime = localStorage.getItem('shoplytic-last-fetch')
    if (storedLastFetchTime) {
      setLastFetchTime(parseInt(storedLastFetchTime))
    }
    
    // Restore dashboard data if available
    const savedDashboardData = localStorage.getItem('shoplytic-dashboard-data')
    const savedDashboardLoaded = localStorage.getItem('shoplytic-dashboard-loaded') === 'true'
    
    if (savedDashboardData && savedDashboardLoaded) {
      try {
        const parsedData = JSON.parse(savedDashboardData)
        setOrderSummary(parsedData)
        setHasDataLoaded(true)
        console.log('📊 Restored dashboard data from localStorage')
      } catch (error) {
        console.error('Error parsing saved dashboard data:', error)
        localStorage.removeItem('shoplytic-dashboard-data')
        localStorage.removeItem('shoplytic-dashboard-loaded')
      }
    }
    
    // No auto-loading - user must manually refresh if no saved data
  }, [])

  // Auto-refresh when date range changes (if data has been loaded before)
  useEffect(() => {
    console.log('📅 Dashboard date range changed:', { startDate, endDate, hasDataLoaded })
    if (hasDataLoaded && (startDate || endDate)) {
      console.log('🔄 Auto-refetching dashboard summary due to date range change')
      fetchOrderSummary()
      setOrdersRefreshTrigger(prev => prev + 1) // Also trigger orders refresh
    }
  }, [startDate, endDate])

  // Handle manual refresh - no cooldown, immediate refresh
  const handleRefresh = () => {
    // Refresh dashboard metrics
    fetchOrderSummary(true) // Manual refresh, always allowed
    
    // Trigger orders table refresh
    setOrdersRefreshTrigger(prev => prev + 1)
  }

  // Create metrics array from API data
  const getMetrics = () => {
    if (!orderSummary) return []

    return [
      {
        title: 'Total Orders',
        value: orderSummary.totalOrders?.toString() || '0',
        icon: '📦',
        color: '#8B5CF6'
      },
      {
        title: 'Revenue Today',
        value: `₹${orderSummary.totalRevenue || 0}`,
        icon: '💰',
        color: '#10B981'
      },
      {
        title: 'Prepaid Orders',
        value: orderSummary.prepaidOrders?.toString() || '0',
        icon: '💳',
        color: '#3B82F6'
      },
      {
        title: 'COD Orders',
        value: orderSummary.codConfirmed?.toString() || '0',
        icon: '🚚',
        color: '#F59E0B'
      },
      {
        title: 'Fulfilled Orders',
        value: orderSummary.fulfilledOrders?.toString() || '0',
        icon: '✅',
        color: '#059669'
      },
      {
        title: 'Cancelled Orders',
        value: orderSummary.cancelled?.toString() || '0',
        icon: '❌',
        color: '#EF4444'
      }
    ]
  }

  const metrics = getMetrics()

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="dashboard-title">Dashboard Overview</h1>
            <p className="dashboard-subtitle">Real-time analytics and insights</p>
          </div>
          
          <div className="date-filter-section">
            <div className="date-inputs">
              <div className="date-input-group">
                <label htmlFor="start-date">Start Date:</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="end-date">End Date:</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  className="clear-dates-btn"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                    localStorage.removeItem('shoplytic-start-date')
                    localStorage.removeItem('shoplytic-end-date')
                    // Also trigger refresh if data has been loaded to show all-time data
                    if (hasDataLoaded) {
                      fetchOrderSummary()
                      setOrdersRefreshTrigger(prev => prev + 1)
                    }
                  }}
                  title="Clear date filter"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh dashboard metrics and orders"
            >
              🔄 {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button className="theme-toggle">
              🌙
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {error && (
          <div className="error-banner">
            <p>⚠️ API Error: {error}. Showing fallback data.</p>
          </div>
        )}

        {lastFetchTime && (
          <div className="fetch-info">
            <p>
              📊 Last updated: {new Date(lastFetchTime).toLocaleTimeString()} | 
              🔄 Manual refresh available
            </p>
          </div>
        )}

        {!hasDataLoaded && !loading && (
          <div className="manual-load-info">
            <p>📊 Click the "Refresh" button to load dashboard metrics</p>
          </div>
        )}

        <section className="metrics-section">
          <div className="metrics-grid">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="metric-card loading">
                  <div className="loading-skeleton">
                    <div className="skeleton-header"></div>
                    <div className="skeleton-value"></div>
                  </div>
                </div>
              ))
            ) : hasDataLoaded ? (
              metrics.map((metric, index) => (
                <MetricCard
                  key={index}
                  title={metric.title}
                  value={metric.value}
                  icon={metric.icon}
                  color={metric.color}
                />
              ))
            ) : (
              // Show placeholder cards when no data loaded
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="metric-card placeholder">
                  <div className="placeholder-content">
                    <div className="placeholder-icon">📊</div>
                    <div className="placeholder-text">No data loaded</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="orders-section">
          <OrdersTable 
            startDate={startDate}
            endDate={endDate}
            refreshTrigger={ordersRefreshTrigger}
          />
        </section>
      </main>
    </div>
  )
}

export default Dashboard
