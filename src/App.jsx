import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Drivers from './pages/Drivers';
import Admins from './pages/Admins';
import BulkUpload from './pages/BulkUpload';
import B2BVerification from './pages/B2BVerification';
import Users from './pages/Users';
import Orders from './pages/Orders';
import Reviews from './pages/Reviews';
import Deliveries from './pages/Deliveries';
import Sellers from './pages/Sellers';
import Payments from './pages/Payments';
import SubCategories from './pages/SubCategories';
import AddProduct from './pages/AddProduct';
import EditProduct from './pages/EditProduct';
import Cash from './pages/Cash';
import Locations from './pages/Locations';
import Notifications from './pages/Notifications';
import PopupAds from './pages/PopupAds';
import Banners from './pages/Banners';
import Profile from './pages/Profile';
import Sales from './pages/Sales';
import Commissions from './pages/Commissions';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import Settings from './pages/Settings';

import { ThemeProvider } from './context/ThemeContext';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('zudo_admin_token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/add-product" element={<AddProduct />} />
                    <Route path="/edit-product/:id" element={<EditProduct />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/subcategories" element={<SubCategories />} />
                    <Route path="/drivers" element={<Drivers />} />
                    <Route path="/admins" element={<Admins />} />
                    <Route path="/bulk-upload" element={<BulkUpload />} />
                    <Route path="/b2b-verification" element={<B2BVerification />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/deliveries" element={<Deliveries />} />
                    <Route path="/sellers" element={<Sellers />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/cash" element={<Cash />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/popup-ads" element={<PopupAds />} />
                    <Route path="/banners" element={<Banners />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/commissions" element={<Commissions />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
