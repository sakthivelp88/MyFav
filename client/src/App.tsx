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

function App() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Navigate to="/user" replace />} />
        <Route path="/user" element={<CustomerPage />} />
        <Route path="/scan/:tableCode" element={<CustomerPage />} />
        <Route path="/feedback" element={<CustomerFeedbackPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="login" replace />} />
        <Route path="login" element={<AdminLoginPage />} />
        <Route
          path="dashboard"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="audit"
          element={
            <AdminRoute>
              <AdminAuditLogPage />
            </AdminRoute>
          }
        />
        <Route
          path="customers"
          element={
            <AdminRoute>
              <AdminCustomersPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/user" replace />} />
    </Routes>
  )
}

export default App
