import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "../api";
import { AuthContext, type AuthState } from "./context";

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [me, setMe] = useState<api.Me | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api
            .getMe()
            .then(setMe)
            .catch(() => setMe(null)) 
            .finally(() => setLoading(false));
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        setMe(await api.login(email, password));
    }, []);

    const signUp = useCallback(async (input: api.SignUpInput) => {
        setMe(await api.register(input));
    }, []);

    const signOut = useCallback(async () => {
        await api.logout();
        setMe(null);
    }, []);

    const value = useMemo<AuthState>(
        () => ({ me, loading, signIn, signUp, signOut }),
        [me, loading, signIn, signUp, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}