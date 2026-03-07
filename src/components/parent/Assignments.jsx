import { useState, useEffect } from "react";
import { updateAssignment, archiveAssignment, markComplete } from "../../firestoreHelpers";

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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// Get a human-readable recurrence label from the structured object
function getRecurrenceLabel(recurrence) {
  if (!recurrence) return "One-time";
  if (typeof recurrence === "string") return RECURRENCE_LABELS[recurrence] || recurrence;
  return RECURRENCE_LABELS[recurrence.type] || recurrence.type || "One-time";
}

export default function Assignments({ kids, assignments }) {
  const [filterKid, setFilterKid] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [markingDoneId, setMarkingDoneId] = useState(null);
  const isMobile = useIsMobile();

  // NEW: Assignments now have an "assignees" array instead of "kidId".
  // When filtering, we check if the selected kid is in the assignees array.
  const filtered = assignments
    .filter(a => filterKid === "all" || (a.assignees && a.assignees.includes(filterKid)))
    .sort((a, b) => {
      // Sort by title since we no longer have a simple dueDate on every assignment
      return (a.title || "").localeCompare(b.title || "");
    });

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({
      title: a.title,
      instructions: a.instructions || "",
      value: a.value,
      recurrence: a.recurrence?.type || a.recurrence || "once"
    });
  };

  const saveEdit = async (id) => {
    // NEW: Using firestoreHelpers updateAssignment instead of RTDB update
    await updateAssignment(id, {
      title:        editForm.title,
      instructions: editForm.instructions,
      value:        Number(editForm.value) || 0,
      // Update recurrence type while preserving other recurrence fields
      "recurrence.type": editForm.recurrence,
    });
    setEditingId(null);
  };

  const handleMarkComplete = async (assignment, kidId) => {
    // NEW: Instead of flipping a boolean, create a completion record
    await markComplete({
      assignmentId: assignment.id,
      memberId: kidId,
      value: assignment.value
    });
  };

  const deleteAssignment = async (id) => {
    // NEW: Soft-delete by archiving instead of hard-deleting
    await archiveAssignment(id);
    setConfirmDeleteId(null);
  };

  // Helper: get the first assigned kid for display purposes
  // (assignments can now have multiple assignees)
  const getAssignedKids = (assignment) => {
    if (!assignment.assignees || assignment.assignees.length === 0) return [];
    return assignment.assignees
      .map(id => kids.find(k => k.id === id))
      .filter(Boolean);
  };

  return (
    <div style={{ maxWidth:800 }}>
      <h2 style={{ margin:"0 0 20px", fontSize:22, color:"#1e1b4b" }}>Assignments</h2>

      {/* Filter bar */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        <FilterChip label="All Kids" active={filterKid === "all"} onClick={() => setFilterKid("all")} />
        {kids.map(k => {
          const th = THEMES[k.theme] || THEMES.rose;
          return (
            <FilterChip key={k.id} label={`${k.avatar} ${k.name}`} active={filterKid === k.id}
              onClick={() => setFilterKid(k.id)} theme={filterKid === k.id ? th : null} />
          );
        })}
      </div>

      {/* Summary counts */}
      <SummaryBar count={filtered.length} />

      {/* Assignment list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length === 0
          ? <EmptyState />
          : filtered.map(a => {
              const assignedKids = getAssignedKids(a);
              // Use the first kid's theme for card styling
              const firstKid = assignedKids[0];
              const th = THEMES[firstKid?.theme] || THEMES.rose;
              const isEditing = editingId === a.id;
              const isConfirmingDelete = confirmDeleteId === a.id;

              return (
                <div key={a.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${th.light}`, overflow:"hidden" }}>

                  {/* Top row — info */}
                  <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", gap:10 }}>
                    {/* Status dot */}
                    <div style={{ width:12, height:12, borderRadius:"50%", flexShrink:0, background:th.accent }} />

                    {/* Assigned kids — now shows all assignees */}
                    <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0, minWidth:70 }}>
                      {assignedKids.map(kid => (
                        <span key={kid.id} title={kid.name} style={{ fontSize:18 }}>{kid.avatar}</span>
                      ))}
                      {assignedKids.length === 0 && <span style={{ fontSize:18 }}>👤</span>}
                      <span style={{ fontSize:12, color:th.text, fontWeight:600 }}>
                        {assignedKids.map(k => k.name).join(", ")}
                      </span>
                    </div>

                    {/* Job title + meta */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, color:"#1e293b", fontSize:14 }}>{a.title}</div>
                      <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>
                        {getRecurrenceLabel(a.recurrence)}
                        {a.category && a.category !== "uncategorized" ? ` · ${a.category}` : ""}
                      </div>
                    </div>

                    {/* Value — always visible */}
                    <div style={{ fontWeight:700, color:th.accent, fontSize:16, flexShrink:0 }}>
                      {fmt(a.value)}
                    </div>
                  </div>

                  {/* Action buttons row */}
                  <div style={{ display:"flex", gap:8, padding:"0 16px 14px", flexWrap:"nowrap" }}>
                    <ActionBtn color="#dcfce7" textColor="#16a34a" onClick={() => {
                      const isMarking = markingDoneId === a.id;
                      setMarkingDoneId(isMarking ? null : a.id);
                      // If only one kid assigned, skip the picker and mark done immediately
                      if (!isMarking && assignedKids.length === 1) {
                        handleMarkComplete(a, assignedKids[0].id);
                        setMarkingDoneId(null);
                      }
                    }} flex>
                      ✓ Mark Done
                    </ActionBtn>
                    <ActionBtn color="#ede9fe" textColor="#7c3aed" onClick={() => isEditing ? setEditingId(null) : startEdit(a)} flex>
                      {isEditing ? "Cancel Edit" : "✏️ Edit"}
                    </ActionBtn>
                    <ActionBtn color="#fee2e2" textColor="#dc2626" onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : a.id)} flex>
                      {isConfirmingDelete ? "Cancel" : "🗑 Delete"}
                    </ActionBtn>
                  </div>

                  {/* Pick which kid completed it (only shows for multi-assignee chores) */}
                  {markingDoneId === a.id && assignedKids.length > 1 && (
                    <div style={{ padding:"10px 16px 14px", borderTop:"1px solid #dcfce7", background:"#f0fdf4", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, color:"#16a34a", fontWeight:600 }}>Who completed it?</span>
                      {assignedKids.map(kid => {
                        const kidTh = THEMES[kid.theme] || THEMES.rose;
                        return (
                          <button key={kid.id} onClick={() => { handleMarkComplete(a, kid.id); setMarkingDoneId(null); }}
                            style={{ padding:"6px 14px", borderRadius:16, border:`2px solid ${kidTh.accent}`, background:kidTh.card, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:600, fontSize:13, color:kidTh.text, display:"flex", alignItems:"center", gap:4 }}>
                            <span>{kid.avatar}</span> {kid.name}
                          </button>
                        );
                      })}
                      <button onClick={() => setMarkingDoneId(null)}
                        style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontSize:12, fontFamily:"Georgia,serif", color:"#64748b" }}>
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Confirm delete */}
                  {isConfirmingDelete && (
                    <div style={{ padding:"10px 16px 14px", borderTop:"1px solid #fee2e2", background:"#fff5f5", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                      <span style={{ fontSize:13, color:"#dc2626" }}>Archive this assignment?</span>
                      <button onClick={() => deleteAssignment(a.id)}
                        style={{ padding:"6px 16px", borderRadius:8, border:"none", background:"#dc2626", color:"#fff", fontFamily:"Georgia,serif", fontWeight:600, cursor:"pointer", fontSize:13, flexShrink:0 }}>
                        Yes, Archive
                      </button>
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div style={{ padding:"16px", borderTop:`1px solid ${th.light}`, background:th.bg, display:"flex", flexDirection:"column", gap:10 }}>
                      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:10 }}>
                        <div>
                          <label style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"block", marginBottom:3 }}>TITLE</label>
                          <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title:e.target.value }))}
                            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontFamily:"Georgia,serif", fontSize:13, boxSizing:"border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"block", marginBottom:3 }}>VALUE ($)</label>
                          <input type="number" min="0" step="0.25" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value:e.target.value }))}
                            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontFamily:"Georgia,serif", fontSize:13, boxSizing:"border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"block", marginBottom:3 }}>RECURRENCE</label>
                          <select value={editForm.recurrence} onChange={e => setEditForm(f => ({ ...f, recurrence:e.target.value }))}
                            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontFamily:"Georgia,serif", fontSize:13, boxSizing:"border-box" }}>
                            {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"block", marginBottom:3 }}>INSTRUCTIONS</label>
                        <textarea value={editForm.instructions} onChange={e => setEditForm(f => ({ ...f, instructions:e.target.value }))} rows={2}
                          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontFamily:"Georgia,serif", fontSize:13, resize:"vertical", boxSizing:"border-box" }} />
                      </div>
                      <button onClick={() => saveEdit(a.id)}
                        style={{ alignSelf:"flex-start", padding:"8px 20px", borderRadius:8, border:"none", background:"#4f46e5", color:"#fff", fontFamily:"Georgia,serif", fontWeight:600, cursor:"pointer" }}>
                        Save Changes
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick, theme }) {
  return (
    <button onClick={onClick}
      style={{ padding:"7px 16px", borderRadius:20, border:`2px solid ${active && theme ? theme.accent : active ? "#4f46e5" : "#e2e8f0"}`, background:active && theme ? theme.card : active ? "#ede9fe" : "#fff", cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:active ? 700 : 400, color:active && theme ? theme.text : active ? "#4f46e5" : "#64748b", fontSize:13 }}>
      {label}
    </button>
  );
}

function ActionBtn({ children, color, textColor, onClick, flex }) {
  return (
    <button onClick={onClick}
      style={{ flex: flex ? 1 : "none", padding:"8px 12px", borderRadius:8, border:"none", background:color, color:textColor, cursor:"pointer", fontSize:13, fontFamily:"Georgia,serif", fontWeight:600, textAlign:"center" }}>
      {children}
    </button>
  );
}

function SummaryBar({ count }) {
  return (
    <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
      <div style={{ background:"#f1f5f9", borderRadius:8, padding:"6px 14px", display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontWeight:700, color:"#475569", fontSize:16 }}>{count}</span>
        <span style={{ color:"#475569", fontSize:12 }}>Active Assignments</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign:"center", padding:"48px 24px", color:"#94a3b8", fontFamily:"Georgia,serif" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
      <div style={{ fontSize:15 }}>No assignments found</div>
    </div>
  );
}
