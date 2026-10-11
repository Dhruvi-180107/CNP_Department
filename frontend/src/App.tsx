import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute, RoleProtectedRoute } from './components/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Clubs from './pages/Clubs/Clubs';
import ClubDetails from './pages/Clubs/ClubDetails';
import Projects from './pages/Projects/Projects';
import ProjectDetails from './pages/Projects/ProjectDetails';
import Events from './pages/Events/Events';
import Notifications from './pages/Notifications/Notifications';
import Profile from './pages/Profile/Profile';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import MaterialRequests from './pages/MaterialRequests/MaterialRequests';
import Inventory from './pages/Inventory/Inventory';

function isProfileComplete(user: any): boolean {
  if (!user) return false;
  const hasName = !!(user.name && user.name.trim());
  const hasDept = !!(user.department && user.department.trim());
  const hasPhone = !!(user.phone && user.phone.trim());
  const hasUniId = !!(user.universityId && user.universityId.trim());
  const hasSemester = !!user.semester;
  return hasName && hasDept && hasPhone && (user.role === 'student' ? (hasUniId && hasSemester) : true);
}

function AuthGuard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty-state"><div className="spinner"></div><p>Loading...</p></div>;
  if (user) {
    return <Navigate to={isProfileComplete(user) ? "/dashboard" : "/profile"} replace />;
  }
  return <Login />;
}

function AuthRegisterGuard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty-state"><div className="spinner"></div><p>Loading...</p></div>;
  if (user) {
    return <Navigate to={isProfileComplete(user) ? "/dashboard" : "/profile"} replace />;
  }
  return <Register />;
}

function RootRedirect() {
  const { user } = useAuth();
  if (user && !isProfileComplete(user)) return <Navigate to="/profile" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthGuard />} />
          <Route path="/register" element={<AuthRegisterGuard />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<RootRedirect />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clubs" element={<Clubs />} />
              <Route path="clubs/:id" element={<ClubDetails />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetails />} />
              <Route path="events" element={<Events />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
              <Route element={<RoleProtectedRoute allowedRoles={['project_admin']} />}>
                <Route path="material-requests" element={<MaterialRequests />} />
                <Route path="inventory" element={<Inventory />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
