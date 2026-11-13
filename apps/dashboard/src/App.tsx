import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import AgentsPage from "./pages/AgentsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="container">
          <header>
            <h1>
              <Link to="/">Relay</Link>
            </h1>
          </header>

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AgentsPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<p>Page not found.</p>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}