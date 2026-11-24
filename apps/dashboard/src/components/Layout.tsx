import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/context";

export default function Layout() {
    const { me, signOut } = useAuth();

    return (
        <div className="container">
            <header className="topbar">
                <h1>
                    <Link to="/">Relay</Link>
                </h1>

                <nav className="nav">
                    <NavLink to="/" end>
                        Agents
                    </NavLink>
                    <NavLink to="/knowledge">Knowledge</NavLink>
                </nav>

                <div className="account">
                    <span className="muted">{me?.user.email}</span>
                    <button className="secondary" onClick={() => void signOut()}>
                        Log out
                    </button>
                </div>
            </header>

            <p className="muted business">{me?.tenant.name}</p>

            <Outlet />
        </div>
    );
}