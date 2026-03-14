import { useState, useEffect } from "react";
import { onUnpaidCompletionsChange, markPaid as markCompletionPaid } from "../../firestoreHelpers";

const THEMES = {
  rose:    { bg:"#fff0f3", card:"#ffe4ea", accent:"#e11d48", light:"#fda4af", text:"#881337", grad:"linear-gradient(135deg,#fda4af,#e11d48)" },
  sky:     { bg:"#f0f9ff", card:"#e0f2fe", accent:"#0284c7", light:"#7dd3fc", text:"#0c4a6e", grad:"linear-gradient(135deg,#7dd3fc,#0284c7)" },
  violet:  { bg:"#f5f3ff", card:"#ede9fe", accent:"#7c3aed", light:"#c4b5fd", text:"#4c1d95", grad:"linear-gradient(135deg,#c4b5fd,#7c3aed)" },
  amber:   { bg:"#fffbeb", card:"#fef3c7", accent:"#d97706", light:"#fcd34d", text:"#78350f", grad:"linear-gradient(135deg,#fcd34d,#d97706)" },
  emerald: { bg:"#ecfdf5", card:"#d1fae5", accent:"#059669", light:"#6ee7b7", text:"#064e3b", grad:"linear-gradient(135deg,#6ee7b7,#059669)" },
  orange:  { bg:"#fff7ed", card:"#ffedd5", accent:"#ea580c", light:"#fdba74", text:"#7c2d12", grad:"linear-gradient(135deg,#fdba74,#ea580c)" },
};

const fmt = (n) => `$${Number(n).toFixed(2)}`;

// Helper to display when a completion happened relative to today
function completionDateLabel(completedAt) {
  if (!completedAt) return "";
  // Handle Firestore Timestamp objects
  const date = completedAt.toDate ? completedAt.toDate() : new Date(completedAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday) return "yesterday";

  const diffDays = Math.floor((startOfToday - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month:"short", day:"numeric" });
}

export default function Dashboard({ kids, assignments }) {
  // FIX: Now using onUnpaidCompletionsChange instead of onTodaysCompletionsChange.
  // This means completions from yesterday / last week that haven't been paid
  // will persist here until you actually pay them out.
  const [completions, setCompletions] = useState([]);

  useEffect(() => {
    const unsub = onUnpaidCompletionsChange((completionsList) => {
      setCompletions(completionsList);
    });
    return () => unsub();
  }, []);

  const getPending = (kidId) => {
    return assignments.filter(a =>
      a.assignees && a.assignees.includes(kidId)
    ).length;
  };

  // All unpaid completions for a kid (across all dates)
  const getUnpaidCompletions = (kidId) => {
    return completions.filter(c => c.memberId === kidId && !c.paid);
  };

  const getOwed = (kidId) => {
    return getUnpaidCompletions(kidId).reduce((s, c) => s + Number(c.value), 0);
  };

  // Pay out all unpaid completions for a kid
  const handlePayKid = async (kidId) => {
    const unpaid = getUnpaidCompletions(kidId);
    if (unpaid.length === 0) return;
    for (const completion of unpaid) {
      await markCompletionPaid(completion.id);
    }
  };

  // Get the assignment title for a completion
  const getAssignmentTitle = (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    return assignment?.title || "Unknown chore";
  };

  return (
    <div>
      <h2 style={{ margin:"0 0 20px", fontSize:22, color:"#1e1b4b" }}>Dashboard</h2>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
        {kids.map(k => {
          const owed = getOwed(k.id);
          const unpaidCount = getUnpaidCompletions(k.id).length;
          const th   = THEMES[k.theme] || THEMES.rose;
          return (
            <div key={k.id} style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
              <div style={{ background:th.grad, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:36 }}>{k.avatar}</span>
                <div>
                  <div style={{ color:"#fff", fontWeight:700, fontSize:18 }}>{k.name}</div>
                  <div style={{ color:"rgba(255,255,255,.75)", fontSize:12 }}>{getPending(k.id)} active · {unpaidCount} unpaid</div>
                </div>
              </div>
              <div style={{ padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                  <span style={{ color:"#64748b", fontSize:13 }}>Total owed</span>
                  <span style={{ fontWeight:700, fontSize:20, color:owed > 0 ? "#16a34a" : "#94a3b8" }}>{fmt(owed)}</span>
                </div>
                <button onClick={() => handlePayKid(k.id)} disabled={owed === 0}
                  style={{ width:"100%", padding:"9px", borderRadius:8, border:"none", background:owed > 0 ? th.accent : "#e2e8f0", color:owed > 0 ? "#fff" : "#94a3b8", cursor:owed > 0 ? "pointer" : "not-allowed", fontWeight:600, fontSize:14 }}>
                  {owed > 0 ? `💸 Pay ${fmt(owed)}` : "✓ All paid up"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ margin:"32px 0 12px", fontSize:16, color:"#1e1b4b" }}>Unpaid Completions</h3>
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
        {completions.filter(c => !c.paid).length === 0
          ? <div style={{ padding:24, textAlign:"center", color:"#94a3b8", fontSize:14 }}>No unpaid jobs — everyone's paid up 🎉</div>
          : completions.filter(c => !c.paid).map(c => {
              const kid = kids.find(k => k.id === c.memberId);
              const th  = THEMES[kid?.theme] || THEMES.rose;
              const when = completionDateLabel(c.completedAt);
              return (
                <div key={c.id} style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:"1px solid #f1f5f9", gap:12 }}>
                  <span style={{ fontSize:20 }}>{kid?.avatar || "👤"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:"#1e293b" }}>{getAssignmentTitle(c.assignmentId)}</div>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>{kid?.name} · {when}</div>
                  </div>
                  <div style={{ fontWeight:700, color:"#16a34a" }}>{fmt(c.value)}</div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
