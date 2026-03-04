import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import { ref, onValue } from "firebase/database";
import { signOut } from "firebase/auth";
import Dashboard from "./Dashboard";
import AssignJob from "./AssignJob";
import JobLibrary from "./JobLibrary";
import FamilyManager from "./FamilyManager";
import Assignments from "./Assignments";

export default function ParentPortal({ user, onHome }) {
  const [tab, setTab] = useState("dashboard");
  const [kids, setKids] = useState([]);
  const [jobLibrary, setJobLibrary] = useState([]);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    const unsubs = [
      onValue(ref(db, "kids"), snap => setKids(snap.val() ? Object.entries(snap.val()).map(([id,v])=>({id,...v})) : [])),
      onValue(ref(db, "jobLibrary"), snap => setJobLibrary(snap.val() ? Object.entries(snap.val()).map(([id,v])=>({id,...v})) : [])),
      onValue(ref(db, "assignments"), snap => setAssignments(snap.val() ? Object.entries(snap.val()).map(([id,v])=>({id,...v})) : [])),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

const tabs = [
  { id:"dashboard",   label:"Dashboard",   icon:"📊" },
  { id:"assign",      label:"Assign Job",  icon:"📋" },
  { id:"assignments", label:"Assignments", icon:"📌" },
  { id:"library",     label:"Job Library", icon:"📚" },
  { id:"family",      label:"Family",      icon:"👨‍👩‍👧" },
];

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"Georgia,serif" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(90deg,#1e1b4b,#312e81)", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:28 }}>🏠</span>
          <div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:20 }}>HomeBase</div>
            <div style={{ color:"#a5b4fc", fontSize:12 }}>Parent Portal</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onHome} style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:8, color:"#fff", padding:"6px 14px", cursor:"pointer", fontSize:13 }}>← Home</button>
          <button onClick={() => signOut(auth)} style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:8, color:"#fff", padding:"6px 14px", cursor:"pointer", fontSize:13 }}>Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:"14px 20px", border:"none", borderBottom:`3px solid ${tab===t.id?"#4f46e5":"transparent"}`, background:"none", cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:tab===t.id?700:400, color:tab===t.id?"#4f46e5":"#64748b", fontSize:14, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:24, maxWidth:900, margin:"0 auto" }}>
        {tab==="dashboard"   && <Dashboard   kids={kids} assignments={assignments} />}
        {tab==="assign"      && <AssignJob   kids={kids} jobLibrary={jobLibrary} />}
        {tab==="assignments" && <Assignments kids={kids} assignments={assignments} />}
        {tab==="library"     && <JobLibrary  jobLibrary={jobLibrary} />}
        {tab==="family"      && <FamilyManager kids={kids} />}
      </div>
    </div>
  );
}