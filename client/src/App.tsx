import { Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from '@components/AdminRoute'
import CustomerLayout from '@components/CustomerLayout'
import AdminLayout from '@components/AdminLayout'
import CustomerPage from '@pages/user/CustomerPage'
import CustomerFeedbackPage from '@pages/user/CustomerFeedbackPage'
import AdminLoginPage from '@pages/admin/AdminLoginPage'
import AdminDashboardPage from '@pages/admin/AdminDashboardPage'
import AdminAuditLogPage from '@pages/admin/AdminAuditLogPage'
import AdminCustomersPage from '@pages/admin/AdminCustomersPage'
import AdminInventoryPage from '@pages/admin/AdminInventoryPage'
import AdminItemManagementPage from '@pages/admin/AdminItemManagementPage'
import AdminPaymentManagementPage from '@pages/admin/AdminPaymentManagementPage'
import AdminFeedbackManagementPage from '@pages/admin/AdminFeedbackManagementPage'
import AdminServiceManagementPage from '@pages/admin/AdminServiceManagementPage'

function App() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<CustomerPage />} />
        <Route path="/user" element={<CustomerPage />} />
        <Route path="/scan/:tableCode" element={<CustomerPage />} />
        <Route path="/feedback" element={<CustomerFeedbackPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="inventory" element={<AdminInventoryPage />} />
        <Route path="items" element={<AdminItemManagementPage />} />
        <Route path="payments" element={<AdminPaymentManagementPage />} />
        <Route path="service" element={<AdminServiceManagementPage />} />
        <Route path="reports" element={<AdminAuditLogPage />} />
        <Route path="feedback" element={<AdminFeedbackManagementPage />} />
        <Route path="users" element={<AdminCustomersPage />} />
        <Route path="audit" element={<Navigate to="/admin/reports" replace />} />
        <Route path="customers" element={<Navigate to="/admin/users" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
