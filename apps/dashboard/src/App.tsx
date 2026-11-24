import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import Layout from "./components/Layout";
import AgentsPage from "./pages/AgentsPage";
import KnowledgePage from "./pages/KnowledgePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function PublicLayout() {
  return (
    <div className="container">
      <header>
        <h1>
          <Link to="/">Relay</Link>
        </h1>
      </header>
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<p>Page not found.</p>} />
          </Route>

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<AgentsPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}