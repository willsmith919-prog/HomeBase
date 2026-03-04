import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./components/auth/Login";
import ParentPortal from "./components/parent/ParentPortal";
import KidsPortal from "./components/kids/KidsPortal";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState("home");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  if (authLoading) return (
    <div className="loading-screen">
      <div className="loading-logo">🏠</div>
      <div className="loading-text">HomeBase</div>
    </div>
  );

  if (screen === "parent") {
    if (!user) return <Login onSuccess={() => setScreen("parent")} onBack={() => setScreen("home")} />;
    return <ParentPortal user={user} onHome={() => setScreen("home")} />;
  }

  if (screen === "kids") return <KidsPortal onHome={() => setScreen("home")} />;

  return (
    <div className="home-screen">
      <div className="home-hero">
        <div className="home-icon">🏠</div>
        <h1 className="home-title">HomeBase</h1>
        <p className="home-sub">Family Chore Tracker</p>
      </div>
      <div className="home-buttons">
        <button className="home-btn parent-btn" onClick={() => setScreen("parent")}>
          <span className="btn-icon">👨‍👩‍👧</span>
          <span className="btn-label">Parent Portal</span>
          <span className="btn-sub">Manage jobs & payments</span>
        </button>
        <button className="home-btn kids-btn" onClick={() => setScreen("kids")}>
          <span className="btn-icon">⭐</span>
          <span className="btn-label">Kids Zone</span>
          <span className="btn-sub">See my chores & earnings</span>
        </button>
      </div>
    </div>
  );
}