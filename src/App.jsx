import React, { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import OrdersTable from './components/OrdersTable'
import ProductsTable from './components/ProductsTable'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'orders':
        return (
          <div className="orders-page">
            <div className="page-header">
              <h1 className="page-title">Orders Management</h1>
              <p className="page-subtitle">View and manage all your orders</p>
            </div>
            <OrdersTable />
          </div>
        )
      case 'products':
        return (
          <div className="products-page">
            <div className="page-header">
              <h1 className="page-title">Products Management</h1>
              <p className="page-subtitle">View and manage your product inventory</p>
            </div>
            <ProductsTable />
          </div>
        )
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
