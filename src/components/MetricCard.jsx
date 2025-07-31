import React from 'react'
import './MetricCard.css'

const MetricCard = ({ title, value, icon, color }) => {
  return (
    <div className="metric-card">
      <div className="metric-card-content">
        <div className="metric-header">
          <span className="metric-title">{title}</span>
          <div 
            className="metric-icon"
            style={{ backgroundColor: `${color}20`, color: color }}
          >
            {icon}
          </div>
        </div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  )
}

export default MetricCard
