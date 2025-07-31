import React, { useState, useEffect } from 'react'
import './Dashboard.css'
import MetricCard from './MetricCard'
import OrdersTable from './OrdersTable'

const Dashboard = () => {
  const [orderSummary, setOrderSummary] = useState(null)
  const [loading, setLoading] = useState(false) // Changed to false - no auto loading
  const [error, setError] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(null)
  const [refreshCooldown, setRefreshCooldown] = useState(0)
  const [hasDataLoaded, setHasDataLoaded] = useState(false) // Track if data has been loaded

  // Rate limiting constants - keeping cooldown for manual refresh
  const REFRESH_COOLDOWN_MS = 30 * 1000 // 30 seconds cooldown for refresh button

  // Start refresh button cooldown
  const startRefreshCooldown = () => {
    setRefreshCooldown(REFRESH_COOLDOWN_MS / 1000) // Convert to seconds for display
    const interval = setInterval(() => {
      setRefreshCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Fetch order summary from API
  const fetchOrderSummary = async (isManualRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('https://n8n.food-u.live/webhook/get-orders-summary', {
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
        
        // Start refresh button cooldown only for manual refresh
        if (isManualRefresh) {
          startRefreshCooldown()
        }
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
    
    // No auto-loading - user must manually refresh
  }, [])

  // Handle manual refresh - only way to load data
  const handleRefresh = () => {
    if (refreshCooldown > 0) return // Still in button cooldown
    
    fetchOrderSummary(true) // Manual refresh, always allowed
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
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={loading || refreshCooldown > 0}
            >
              🔄 {loading ? 'Loading...' : refreshCooldown > 0 ? `Wait ${refreshCooldown}s` : 'Refresh'}
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
          <OrdersTable onRefreshOrders={fetchOrderSummary} />
        </section>
      </main>
    </div>
  )
}

export default Dashboard
