# Shoplytic - Shopify Order Analytics Dashboard

A modern React dashboard for analyzing Shopify orders with real-time metrics and order management.

## Features

- **📊 Order Metrics Dashboard** - View total orders, revenue, prepaid/COD orders, and cancellations
- **📋 Order Management** - Search and filter orders by customer name and status
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **⚡ Fast Performance** - Built with Vite for lightning-fast development and builds
- **🎨 Modern UI** - Clean, professional interface matching Shopify's design principles

## Dashboard Cards

The dashboard displays five key metric cards:
- **Total Orders** - Complete order count
- **Revenue Today** - Daily revenue in ₹
- **Prepaid Orders** - Orders paid in advance
- **COD Orders** - Cash on delivery orders
- **Cancelled Orders** - Cancelled order count

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd shoplytic
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx      # Main dashboard component
│   ├── Dashboard.css      # Dashboard styles
│   ├── MetricCard.jsx     # Individual metric cards
│   ├── MetricCard.css     # Metric card styles
│   ├── OrdersTable.jsx    # Orders table with search/filter
│   └── OrdersTable.css    # Orders table styles
├── App.jsx                # Main app component
├── App.css                # App styles
├── index.css              # Global styles
└── main.jsx               # App entry point
```

## Customization

### Adding API Integration

Currently, the dashboard uses dummy data. To integrate with real APIs:

1. Replace the dummy data in `Dashboard.jsx` with API calls
2. Add loading states and error handling
3. Implement real-time data updates

### Styling

The project uses CSS modules for component-specific styling. Main color scheme:
- Primary: `#3B82F6` (blue)
- Success: `#10B981` (green)
- Warning: `#F59E0B` (amber)
- Error: `#EF4444` (red)
- Background: `#F8FAFC` (slate)

## Technologies Used

- **React** - Frontend framework
- **Vite** - Build tool and development server
- **CSS3** - Styling with modern CSS features
- **JavaScript ES6+** - Modern JavaScript features

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Next Steps

- [ ] API integration for real data
- [ ] Real-time updates with WebSockets
- [ ] Export functionality for reports
- [ ] Dark mode theme
- [ ] Advanced filtering options
- [ ] Chart visualizations+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
