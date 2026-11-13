import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./context";

export default function RequireAuth({ children }: { children: ReactNode }) {
    const { me, loading } = useAuth();

    if (loading) return <p>Loading...</p>;
    if (!me) return <Navigate to="/login" replace />;

    return <>{children}</>;
}