import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';

const Login = lazy(() => import('./pages/Login'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Categories = lazy(() => import('./pages/Categories'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Admins = lazy(() => import('./pages/Admins'));
const BulkUpload = lazy(() => import('./pages/BulkUpload'));
const B2BVerification = lazy(() => import('./pages/B2BVerification'));
const Users = lazy(() => import('./pages/Users'));
const Orders = lazy(() => import('./pages/Orders'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Deliveries = lazy(() => import('./pages/Deliveries'));
const Sellers = lazy(() => import('./pages/Sellers'));
const Payments = lazy(() => import('./pages/Payments'));
const SubCategories = lazy(() => import('./pages/SubCategories'));
const AddProduct = lazy(() => import('./pages/AddProduct'));
const EditProduct = lazy(() => import('./pages/EditProduct'));
const Cash = lazy(() => import('./pages/Cash'));
const Locations = lazy(() => import('./pages/Locations'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PopupAds = lazy(() => import('./pages/PopupAds'));
const Banners = lazy(() => import('./pages/Banners'));
const Profile = lazy(() => import('./pages/Profile'));
const Sales = lazy(() => import('./pages/Sales'));
const Commissions = lazy(() => import('./pages/Commissions'));
const Reports = lazy(() => import('./pages/Reports'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Settings = lazy(() => import('./pages/Settings'));

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('zudo_admin_token');
  return token ? children : <Navigate to="/login" />;
};

const PageLoader = () => (
  <div style={{ display: 'flex', height: '100vh', width: '100%', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
    <div style={{ width: '40px', height: '40px', border: '4px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Suspense fallback={<PageLoader />}>
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
                    </Suspense>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
