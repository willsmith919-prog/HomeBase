import { useState, useEffect } from "react";
import { auth } from "../../firebase";
import { onKidsChange, onAssignmentsChange, onJobLibraryChange } from "../../firestoreHelpers";
import { signOut } from "firebase/auth";
import Dashboard from "./Dashboard";
import AssignJob from "./AssignJob";
import Assignments from "./Assignments";
import JobLibrary from "./JobLibrary";
import FamilyManager from "./FamilyManager";

const TABS = [
  { id:"dashboard",   label:"Dashboard",   icon:"📊" },
  { id:"assign",      label:"Assign",      icon:"📋" },
  { id:"assignments", label:"Assignments", icon:"📌" },
  { id:"library",     label:"Library",     icon:"📚" },
  { id:"family",      label:"Family",      icon:"👨‍👩‍👧" },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function ParentPortal({ user, onHome }) {
  const [tab, setTab] = useState("dashboard");
  const [kids, setKids] = useState([]);
  const [jobLibrary, setJobLibrary] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    // NEW: Using Firestore real-time listeners instead of RTDB onValue.
    // Each returns an unsubscribe function, same pattern as before.
    const unsub1 = onKidsChange((kidsList) => setKids(kidsList));
    const unsub2 = onJobLibraryChange((jobsList) => setJobLibrary(jobsList));
    const unsub3 = onAssignmentsChange((assignmentsList) => setAssignments(assignmentsList));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const activeTab = TABS.find(t => t.id === tab);

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"Georgia,serif", paddingBottom: isMobile ? 70 : 0 }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(90deg,#1e1b4b,#312e81)", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:28 }}>🏠</span>
          <div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:20 }}>HomeBase</div>
            <div style={{ color:"#a5b4fc", fontSize:12 }}>
              {isMobile ? activeTab?.label : "Parent Portal"}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onHome}
            style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:8, color:"#fff", padding:"6px 14px", cursor:"pointer", fontSize:13 }}>
            ← Home
          </button>
          <button onClick={() => signOut(auth)}
            style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:8, color:"#fff", padding:"6px 14px", cursor:"pointer", fontSize:13 }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Desktop tab bar — hidden on mobile */}
      {!isMobile && (
        <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:"14px 20px", border:"none", borderBottom:`3px solid ${tab===t.id?"#4f46e5":"transparent"}`, background:"none", cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:tab===t.id?700:400, color:tab===t.id?"#4f46e5":"#64748b", fontSize:14, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: isMobile ? 16 : 24, maxWidth:900, margin:"0 auto" }}>
        {tab==="dashboard"   && <Dashboard    kids={kids} assignments={assignments} />}
        {tab==="assign"      && <AssignJob    kids={kids} jobLibrary={jobLibrary} />}
        {tab==="assignments" && <Assignments  kids={kids} assignments={assignments} />}
        {tab==="library"     && <JobLibrary   jobLibrary={jobLibrary} />}
        {tab==="family"      && <FamilyManager kids={kids} />}
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #e2e8f0", display:"flex", zIndex:100, boxShadow:"0 -4px 12px rgba(0,0,0,.08)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex:1, padding:"10px 4px 12px", border:"none", background:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontFamily:"Georgia,serif" }}>
              <span style={{ fontSize:20 }}>{t.icon}</span>
              <span style={{ fontSize:10, fontWeight:tab===t.id?700:400, color:tab===t.id?"#4f46e5":"#94a3b8" }}>{t.label}</span>
              {tab===t.id && <div style={{ width:4, height:4, borderRadius:"50%", background:"#4f46e5" }} />}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
