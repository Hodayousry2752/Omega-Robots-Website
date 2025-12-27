import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Login from "../pages/Login";
import Robots from "../pages/Robots";
import RobotDetails from "../pages/RobotDetails";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import DashboardRoutes from "../pages/dashboard/DashboardRoutes";

let Loading, NotFound;

try {
  Loading = require("../pages/Loading").default;
  NotFound = require("../pages/NotFound").default;
} catch (error) {
  Loading = () => (
    <div className="min-h-screen flex items-center justify-center">Loading...</div>
  );
  NotFound = () => (
    <div className="min-h-screen flex items-center justify-center">
      Page Not Found
    </div>
  );
}

function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
    </div>
  );
}

function SimpleLayout({ children }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}

export default function AppRoutes() {
  const { isAuthenticated, userRole, isLoading } = useAuth();


  // Show loading while checking authentication
  if (isLoading) {
    return (
      <SimpleLayout>
        <Loading />
      </SimpleLayout>
    );
  }

  const getDefaultRoute = () => {
    if (userRole === 'admin') {
      return "/homeDashboard";
    } else {
      return "/robots";
    }
  };

  const defaultRoute = getDefaultRoute();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={defaultRoute} replace />
          ) : (
            <SimpleLayout>
              <Login />
            </SimpleLayout>
          )
        }
      />
      
      <Route
        path="/loading"
        element={
          <SimpleLayout>
            <Loading />
          </SimpleLayout>
        }
      />

      {isAuthenticated ? (
        <>
          {userRole === 'user' && (
            <>
              <Route
                path="/"
                element={
                  <Layout>
                    <Robots />
                  </Layout>
                }
              />
             
              <Route
                path="/robots"
                element={
                  <Layout>
                    <Robots />
                  </Layout>
                }
              />
              <Route
                path="/robots/:id"
                element={
                  <Layout>
                    <RobotDetails />
                  </Layout>
                }
              />
            </>
          )}

          <Route path="/homeDashboard/*" element={<DashboardRoutes />} />
          
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}