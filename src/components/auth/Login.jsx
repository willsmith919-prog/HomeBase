import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

export default function Login({ onSuccess, onBack }) {
  const [mode, setMode] = useState("login"); // "login" | "create"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (mode === "create") {
      if (password !== confirm) { setError("Passwords don't match."); return; }
      if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else if (e.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try signing in.");
      } else if (e.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#1e1b4b,#312e81)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Georgia,serif" }}>
      <div style={{ background:"#fff", borderRadius:20, padding:"40px 36px", width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🏠</div>
          <h1 style={{ fontSize:26, fontWeight:700, color:"#1e1b4b" }}>Parent Portal</h1>
          <p style={{ color:"#64748b", fontSize:14, marginTop:6 }}>
            {mode === "login" ? "Sign in to manage jobs & payments" : "Create your parent account"}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display:"flex", background:"#f1f5f9", borderRadius:10, padding:4, marginBottom:24 }}>
          <button onClick={() => { setMode("login"); setError(""); }}
            style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:mode==="login"?"#fff":"transparent", fontFamily:"Georgia,serif", fontWeight:mode==="login"?700:400, color:mode==="login"?"#1e1b4b":"#64748b", cursor:"pointer", fontSize:14, boxShadow:mode==="login"?"0 1px 4px rgba(0,0,0,.1)":"none" }}>
            Sign In
          </button>
          <button onClick={() => { setMode("create"); setError(""); }}
            style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:mode==="create"?"#fff":"transparent", fontFamily:"Georgia,serif", fontWeight:mode==="create"?700:400, color:mode==="create"?"#1e1b4b":"#64748b", cursor:"pointer", fontSize:14, boxShadow:mode==="create"?"0 1px 4px rgba(0,0,0,.1)":"none" }}>
            Create Account
          </button>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>EMAIL</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box" }} />
        </div>

        <div style={{ marginBottom: mode==="create" ? 16 : 24 }}>
          <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>PASSWORD</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key==="Enter" && handleSubmit()}
            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box" }} />
        </div>

        {mode === "create" && (
          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>CONFIRM PASSWORD</label>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••"
              onKeyDown={e => e.key==="Enter" && handleSubmit()}
              style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box" }} />
          </div>
        )}

        {error && (
          <div style={{ background:"#fee2e2", color:"#dc2626", borderRadius:8, padding:"10px 12px", fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:"#4f46e5", color:"#fff", fontFamily:"Georgia,serif", fontWeight:700, fontSize:16, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
          {loading ? "Please wait…" : mode==="login" ? "Sign In" : "Create Account"}
        </button>

        <button onClick={onBack}
          style={{ width:"100%", padding:"10px", borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", fontFamily:"Georgia,serif", color:"#64748b", fontSize:14, cursor:"pointer", marginTop:10 }}>
          ← Back to Home
        </button>

      </div>
    </div>
  );
}