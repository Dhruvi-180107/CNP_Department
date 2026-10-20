import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, isProfileComplete } from './context/AuthContext';
import { LoadingProvider, usePageLoading } from './context/LoadingContext';
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
import LoadingScreen from './components/LoadingScreen';

function RouteTransition() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const { isPageReady, setPageReady } = usePageLoading();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    
    // Reset ready state for new route so screws 1-3 progress and screw 4 honestly waits for page data
    setPageReady(false);
    setIsTransitioning(true);

    // Fallback timer: if destination page has no async fetch or finishes fast, ensure isPageReady releases
    const fallbackTimer = window.setTimeout(() => {
      setPageReady(true);
    }, 1100);

    return () => window.clearTimeout(fallbackTimer);
  }, [location.pathname, setPageReady]);

  if (!isTransitioning) return null;

  return (
    <LoadingScreen
      isReady={isPageReady}
      onComplete={() => setIsTransitioning(false)}
    />
  );
}

function AuthGuard() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen isReady={!loading} />;
  if (user) {
    return <Navigate to={isProfileComplete(user) ? "/dashboard" : "/profile"} replace />;
  }
  return <Login />;
}

function AuthRegisterGuard() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen isReady={!loading} />;
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
      <LoadingProvider>
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
          <RouteTransition />
        </BrowserRouter>
      </LoadingProvider>
    </AuthProvider>
  );
}
