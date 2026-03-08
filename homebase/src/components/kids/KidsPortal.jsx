import { useState, useEffect } from "react";
import { onKidsChange, onAssignmentsChange, onTodaysCompletionsChange, markComplete } from "../../firestoreHelpers";

const THEMES = {
  rose:    { bg:"#fff0f3", card:"#ffe4ea", accent:"#e11d48", light:"#fda4af", text:"#881337", grad:"linear-gradient(135deg,#fda4af,#e11d48)" },
  sky:     { bg:"#f0f9ff", card:"#e0f2fe", accent:"#0284c7", light:"#7dd3fc", text:"#0c4a6e", grad:"linear-gradient(135deg,#7dd3fc,#0284c7)" },
  violet:  { bg:"#f5f3ff", card:"#ede9fe", accent:"#7c3aed", light:"#c4b5fd", text:"#4c1d95", grad:"linear-gradient(135deg,#c4b5fd,#7c3aed)" },
  amber:   { bg:"#fffbeb", card:"#fef3c7", accent:"#d97706", light:"#fcd34d", text:"#78350f", grad:"linear-gradient(135deg,#fcd34d,#d97706)" },
  emerald: { bg:"#ecfdf5", card:"#d1fae5", accent:"#059669", light:"#6ee7b7", text:"#064e3b", grad:"linear-gradient(135deg,#6ee7b7,#059669)" },
  orange:  { bg:"#fff7ed", card:"#ffedd5", accent:"#ea580c", light:"#fdba74", text:"#7c2d12", grad:"linear-gradient(135deg,#fdba74,#ea580c)" },
};
const RECURRENCE_LABELS = { once:"One-time", daily:"Daily", weekly:"Weekly", biweekly:"Bi-weekly", monthly:"Monthly" };
const fmt = (n) => `$${Number(n).toFixed(2)}`;

export default function KidsPortal({ onHome }) {
  const [kids, setKids] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [todaysCompletions, setTodaysCompletions] = useState([]);
  const [selectedKid, setSelectedKid] = useState(null);

  useEffect(() => {
    const unsub1 = onKidsChange((kidsList) => setKids(kidsList));
    const unsub2 = onAssignmentsChange((assignmentsList) => setAssignments(assignmentsList));
    const unsub3 = onTodaysCompletionsChange((completionsList) => setTodaysCompletions(completionsList));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  if (selectedKid) {
    const kid = kids.find(k => k.id === selectedKid);
    if (!kid) return null;
    return (
      <KidDashboard
        kid={kid}
        assignments={assignments}
        todaysCompletions={todaysCompletions}
        onBack={() => setSelectedKid(null)}
      />
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#0f172a,#1e293b)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Georgia,serif" }}>
      <div style={{ marginBottom:40, textAlign:"center" }}>
        <div style={{ fontSize:60, marginBottom:8 }}>⭐</div>
        <h1 style={{ color:"#fff", fontSize:34, margin:0 }}>Who are you?</h1>
        <p style={{ color:"#94a3b8", marginTop:6 }}>Tap your name to see your chores</p>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:20, justifyContent:"center", maxWidth:600 }}>
        {kids.map(k => {
          const th = THEMES[k.theme] || THEMES.rose;
          return (
            <button key={k.id} onClick={() => setSelectedKid(k.id)}
              style={{ background:th.card, border:`3px solid ${th.light}`, borderRadius:24, padding:"28px 36px", cursor:"pointer", textAlign:"center", fontFamily:"Georgia,serif", transition:"transform .15s", minWidth:140 }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
              <div style={{ fontSize:52, marginBottom:8 }}>{k.avatar}</div>
              <div style={{ fontWeight:700, fontSize:20, color:th.text }}>{k.name}</div>
            </button>
          );
        })}
      </div>
      <button onClick={onHome} style={{ marginTop:40, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", borderRadius:8, color:"#94a3b8", padding:"8px 20px", cursor:"pointer", fontFamily:"Georgia,serif" }}>← Home</button>
    </div>
  );
}

// ─── KidDashboard ────────────────────────────────────────────
// KEY CHANGE: "completed" is no longer a boolean on the assignment.
// Instead, we check the todaysCompletions array to see if this kid
// has a completion record for a given assignment today.
// For the "done" and "paid" tabs, we use completions data too.
// ─────────────────────────────────────────────────────────────

function KidDashboard({ kid, assignments, todaysCompletions, onBack }) {
  const th = THEMES[kid.theme] || THEMES.rose;

  // NEW: Assignments now use an "assignees" array instead of "kidId"
  // So we filter by checking if this kid's ID is in the assignees array
  const myJobs = assignments.filter(a => a.assignees && a.assignees.includes(kid.id));

  // Check if a specific assignment was completed today by this kid
  const isCompletedToday = (assignmentId) => {
    return todaysCompletions.some(
      c => c.assignmentId === assignmentId && c.memberId === kid.id
    );
  };

  // Split jobs into pending (not done today) and completed today
  const pending = myJobs.filter(a => !isCompletedToday(a.id));
  const completedToday = myJobs.filter(a => isCompletedToday(a.id));

  // For "owed" and "paid" totals, we look at completion records
  const todaysOwed = completedToday.reduce((s, a) => s + Number(a.value), 0);

  const [tab, setTab] = useState("todo");

  const handleMarkDone = async (assignment) => {
    // NEW: Instead of flipping a boolean on the assignment, we create
    // a new completion record. The assignment stays active for next time.
    await markComplete({
      assignmentId: assignment.id,
      memberId: kid.id,
      value: assignment.value
    });
  };

  // Get recurrence label from the new structured recurrence object
  const getRecurrenceLabel = (recurrence) => {
    if (!recurrence) return "One-time";
    if (typeof recurrence === "string") return RECURRENCE_LABELS[recurrence] || recurrence;
    return RECURRENCE_LABELS[recurrence.type] || recurrence.type || "One-time";
  };

  // Get due date display — in the new schema, recurring chores don't have
  // a single dueDate, so we show the recurrence instead
  const getDueInfo = (assignment) => {
    const rec = assignment.recurrence;
    if (!rec || rec.type === "once") {
      return assignment.dueDate || "No date set";
    }
    return getRecurrenceLabel(rec);
  };

  return (
    <div style={{ minHeight:"100vh", background:th.bg, fontFamily:"Georgia,serif" }}>
      <div style={{ background:th.grad, padding:"20px 20px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:8, color:"#fff", padding:"6px 12px", cursor:"pointer", fontSize:13 }}>← Back</button>
          <div style={{ color:"rgba(255,255,255,.8)", fontSize:12 }}>HomeBase</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:52 }}>{kid.avatar}</span>
          <div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:26 }}>{kid.name}'s Chores</div>
            <div style={{ color:"rgba(255,255,255,.8)", fontSize:14 }}>{pending.length} jobs to do</div>
          </div>
        </div>
        <div style={{ marginTop:16, background:"rgba(255,255,255,.15)", borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:"rgba(255,255,255,.7)", fontSize:11, marginBottom:2 }}>TO EARN</div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:18 }}>{fmt(pending.reduce((s, a) => s + Number(a.value), 0))}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:"rgba(255,255,255,.7)", fontSize:11, marginBottom:2 }}>DONE TODAY</div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:18 }}>{fmt(todaysOwed)}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:"rgba(255,255,255,.7)", fontSize:11, marginBottom:2 }}>JOBS TODAY</div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:18 }}>{completedToday.length}</div>
          </div>
        </div>
      </div>

      <div style={{ background:"#fff", display:"flex", borderBottom:`2px solid ${th.light}` }}>
        {[["todo", "📋 To Do"], ["done", "✅ Done"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, padding:"12px 8px", border:"none", borderBottom:`3px solid ${tab === id ? th.accent : "transparent"}`, background:"none", cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:tab === id ? 700 : 400, color:tab === id ? th.accent : "#64748b", fontSize:14 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding:16, maxWidth:600, margin:"0 auto" }}>
        {tab === "todo" && (pending.length === 0
          ? <EmptyState emoji="🎉" text="All caught up! No jobs left." />
          : pending.map(a => (
            <JobCard
              key={a.id}
              job={a}
              theme={th}
              getDueInfo={getDueInfo}
              getRecurrenceLabel={getRecurrenceLabel}
              onComplete={() => handleMarkDone(a)}
            />
          ))
        )}

        {tab === "done" && (completedToday.length === 0
          ? <EmptyState emoji="📭" text="No completed jobs today yet." />
          : completedToday.map(a => (
            <div key={a.id} style={{ background:"#fff", borderRadius:12, border:`1px solid ${th.light}`, padding:"14px 16px", marginBottom:10, display:"flex", gap:12, alignItems:"center" }}>
              <span style={{ fontSize:24 }}>✅</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, color:"#1e293b" }}>{a.title}</div>
                <div style={{ fontSize:12, color:"#94a3b8" }}>Completed today</div>
              </div>
              <span style={{ fontWeight:700, color:"#16a34a", fontSize:16 }}>{fmt(a.value)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function JobCard({ job, theme: th, getDueInfo, getRecurrenceLabel, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ background:"#fff", borderRadius:14, border:`1px solid ${th.light}`, marginBottom:12, overflow:"hidden" }}>
      <div style={{ padding:"14px 16px", display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${th.accent}`, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, color:"#1e293b", fontSize:15 }}>{job.title}</div>
          <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{getDueInfo(job)}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontWeight:700, color:th.accent, fontSize:17 }}>{fmt(job.value)}</div>
        </div>
      </div>
      {expanded && (
        <div style={{ padding:"0 16px 14px" }}>
          {job.instructions && <div style={{ color:"#475569", fontSize:13, marginBottom:12, background:th.bg, borderRadius:8, padding:"10px 12px" }}>{job.instructions}</div>}
          {!confirming
            ? <button onClick={() => setConfirming(true)} style={{ width:"100%", padding:"10px", borderRadius:10, border:"none", background:th.grad, color:"#fff", fontFamily:"Georgia,serif", fontWeight:700, fontSize:15, cursor:"pointer" }}>✓ Mark as Done</button>
            : <div style={{ display:"flex", gap:8 }}>
                <button onClick={onComplete} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:"#16a34a", color:"#fff", fontFamily:"Georgia,serif", fontWeight:700, cursor:"pointer" }}>✓ Yes, I did it!</button>
                <button onClick={() => setConfirming(false)} style={{ padding:"10px 16px", borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", fontFamily:"Georgia,serif", cursor:"pointer" }}>Cancel</button>
              </div>
          }
        </div>
      )}
    </div>
  );
}

function EmptyState({ emoji, text }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 24px", color:"#94a3b8", fontFamily:"Georgia,serif" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{emoji}</div>
      <div style={{ fontSize:15 }}>{text}</div>
    </div>
  );
}
