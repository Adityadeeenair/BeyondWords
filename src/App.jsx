import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Sections from './pages/Sections'
import Levels from './pages/Levels'
import Challenge from './pages/Challenge'
import MLTest from './pages/MLTest'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/sections" replace />} />
          <Route path="/login" element={<Login />} />
          {/* Public — user is not authenticated yet when this is hit */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/sections"
            element={
              <RequireAuth>
                <Sections />
              </RequireAuth>
            }
          />
          <Route
            path="/sections/:sectionId"
            element={
              <RequireAuth>
                <Levels />
              </RequireAuth>
            }
          />
          <Route
            path="/sections/:sectionId/levels/:levelId"
            element={
              <RequireAuth>
                <Challenge />
              </RequireAuth>
            }
          />
          <Route
            path="/ml-test"
            element={
              <RequireAuth>
                <MLTest />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
