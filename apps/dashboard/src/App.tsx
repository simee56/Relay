import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import TenantsPage from "./pages/TenantsPage";
import TenantPage from "./pages/TenantPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="container">
        <header>
          <h1>
            <Link to="/">Relay</Link>
          </h1>
        </header>

        <Routes>
          <Route path="/" element={<TenantsPage />} />
          <Route path="/tenants/:tenantId" element={<TenantPage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}