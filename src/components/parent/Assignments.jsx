import { useState } from "react";
import { db } from "../../firebase";
import { ref, update, remove } from "firebase/database";

const THEMES = {
  rose:    { bg:"#fff0f3", card:"#ffe4ea", accent:"#e11d48", light:"#fda4af", text:"#881337", grad:"linear-gradient(135deg,#fda4af,#e11d48)" },
  sky:     { bg:"#f0f9ff", card:"#e0f2fe", accent:"#0284c7", light:"#7dd3fc", text:"#0c4a6e", grad:"linear-gradient(135deg,#7dd3fc,#0284c7)" },
  violet:  { bg:"#f5f3ff", card:"#ede9fe", accent:"#7c3aed", light:"#c4b5fd", text:"#4c1d95", grad:"linear-gradient(135deg,#c4b5fd,#7c3aed)" },
  amber:   { bg:"#fffbeb", card:"#fef3c7", accent:"#d97706", light:"#fcd34d", text:"#78350f", grad:"linear-gradient(135deg,#fcd34d,#d97706)" },
  emerald: { bg:"#ecfdf5", card:"#d1fae5", accent:"#059669", light:"#6ee7b7", text:"#064e3b", grad:"linear-gradient(135deg,#6ee7b7,#059669)" },
  orange:  { bg:"#fff7ed", card:"#ffedd5", accent:"#ea580c", light:"#fdba74", text:"#7c2d12", grad:"linear-gradient(135deg,#fdba74,#ea580c)" },
};

const RECURRENCE = { once:"One-time", daily:"Daily", weekly:"Weekly", biweekly:"Bi-weekly", monthly:"Monthly" };
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0,10);

export default function Assignments({ kids, assignments }) {
  const [filterKid, setFilterKid] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filtered = assignments
    .filter(a => filterKid === "all" || a.kidId === filterKid)
    .sort((a, b) => {
      // Sort: incomplete first, then by due date
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.dueDate > b.dueDate ? 1 : -1;
    });

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({ title:a.title, instructions:a.instructions||"", value:a.value, dueDate:a.dueDate, recurrence:a.recurrence });
  };

  const saveEdit = async (id) => {
    await update(ref(db, `assignments/${id}`), {
      title:        editForm.title,
      instructions: editForm.instructions,
      value:        Number(editForm.value) || 0,
      dueDate:      editForm.dueDate,
      recurrence:   editForm.recurrence,
    });
    setEditingId(null);
  };

  const markComplete = async (id) => {
    await update(ref(db, `assignments/${id}`), { completed:true, completedDate:today() });
  };

  const deleteAssignment = async (id) => {
    await remove(ref(db, `assignments/${id}`));
    setConfirmDeleteId(null);
  };

  return (
    <div style={{ maxWidth:800 }}>
      <h2 style={{ margin:"0 0 20px", fontSize:22, color:"#1e1b4b" }}>Assignments</h2>

      {/* Filter bar */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        <FilterChip label="All Kids" active={filterKid==="all"} onClick={()=>setFilterKid("all")} />
        {kids.map(k => {
          const th = THEMES[k.theme]||THEMES.rose;
          return (
            <FilterChip
              key={k.id}
              label={`${k.avatar} ${k.name}`}
              active={filterKid===k.id}
              onClick={()=>setFilterKid(k.id)}
              theme={filterKid===k.id ? th : null}
            />
          );
        })}
      </div>

      {/* Summary counts */}
      <SummaryBar assignments={filtered} />

      {/* Assignment list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length === 0
          ? <EmptyState />
          : filtered.map(a => {
              const kid = kids.find(k=>k.id===a.kidId);
              const th  = THEMES[kid?.theme]||THEMES.rose;
              const isEditing = editingId === a.id;
              const isConfirmingDelete = confirmDeleteId === a.id;

              return (
                <div key={a.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${a.completed?"#e2e8f0":th.light}`, overflow:"hidden", opacity:a.paid?0.6:1 }}>

                  {/* Card header */}
                  <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", gap:12 }}>
                    {/* Status indicator */}
                    <div style={{ width:12, height:12, borderRadius:"50%", flexShrink:0, background: a.paid?"#94a3b8":a.completed?"#16a34a":th.accent }} />

                    {/* Kid avatar + name */}
                    <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:80 }}>
                      <span style={{ fontSize:18 }}>{kid?.avatar||"👤"}</span>
                      <span style={{ fontSize:12, color:th.text, fontWeight:600 }}>{kid?.name}</span>
                    </div>

                    {/* Job info */}
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, color:"#1e293b", fontSize:15 }}>{a.title}</div>
                      <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>
                        Due {a.dueDate} · {RECURRENCE[a.recurrence]||a.recurrence}
                        {a.completed && <span style={{ color:"#16a34a", marginLeft:8 }}>✓ Completed {a.completedDate}</span>}
                        {a.paid      && <span style={{ color:"#94a3b8", marginLeft:8 }}>💰 Paid</span>}
                      </div>
                    </div>

                    {/* Value */}
                    <div style={{ fontWeight:700, color:a.completed?"#16a34a":th.accent, fontSize:16, minWidth:52, textAlign:"right" }}>
                      {fmt(a.value)}
                    </div>

                    {/* Action buttons — hidden if paid */}
                    {!a.paid && (
                      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                        {!a.completed && (
                          <ActionBtn color="#dcfce7" textColor="#16a34a" onClick={()=>markComplete(a.id)}>✓ Done</ActionBtn>
                        )}
                        <ActionBtn color="#ede9fe" textColor="#7c3aed" onClick={()=>isEditing?setEditingId(null):startEdit(a)}>
                          {isEditing ? "Cancel" : "Edit"}
                        </ActionBtn>
                        <ActionBtn color="#fee2e2" textColor="#dc2626" onClick={()=>setConfirmDeleteId(isConfirmingDelete?null:a.id)}>
                          {isConfirmingDelete ? "Cancel" : "Delete"}
                        </ActionBtn>
                      </div>
                    )}
                  </div>

                  {/* Confirm delete */}
                  {isConfirmingDelete && (
                    <div style={{ padding:"10px 16px", background:"#fff5f5", borderTop:"1px solid #fee2e2", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:13, color:"#dc2626" }}>Are you sure you want to delete this assignment?</span>
                      <button onClick={()=>deleteAssignment(a.id)}
                        style={{ padding:"6px 16px", borderRadius:8, border:"none", background:"#dc2626", color:"#fff", fontFamily:"Georgia,serif", fontWeight:600, cursor:"pointer", fontSize:13 }}>
                        Yes, Delete
                      </button>
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div style={{ padding:"16px", borderTop:`1px solid ${th.light}`, background:th.bg, display:"flex", flexDirection:"column", gap:10 }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <div>
                          <label style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"block", marginBottom:3 }}>TITLE</label>
                          <input value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))}
                            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontFamily:"Georgia,serif", fontSize:13, boxSizing:"border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"block", marginBottom:3 }}>VALUE ($)</label>
                          <input type="number" min="0" step="0.25" value={editForm.value} onChange={e=>setEditForm(f=>({...f,value:e.target.value}))}
                            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontFamily:"Georgia,serif", fontSize:13, boxSizing:"border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"block", marginBottom:3 }}>DUE DATE</label>
                          <input type="date" value={editForm.dueDate} onChange={e=>setEditForm(f=>({...f,dueDate:e.target.value}))}
                            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontFamily:"Georgia,serif", fontSize:13, boxSizing:"border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"block", marginBottom:3 }}>RECURRENCE</label>
                          <select value={editForm.recurrence} onChange={e=>setEditForm(f=>({...f,recurrence:e.target.value}))}
                            style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontFamily:"Georgia,serif", fontSize:13, boxSizing:"border-box" }}>
                            {Object.entries(RECURRENCE).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"block", marginBottom:3 }}>INSTRUCTIONS</label>
                        <textarea value={editForm.instructions} onChange={e=>setEditForm(f=>({...f,instructions:e.target.value}))} rows={2}
                          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 10px", fontFamily:"Georgia,serif", fontSize:13, resize:"vertical", boxSizing:"border-box" }} />
                      </div>
                      <button onClick={()=>saveEdit(a.id)}
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

// ── Small reusable pieces ─────────────────────────────────────────────────────
function FilterChip({ label, active, onClick, theme }) {
  return (
    <button onClick={onClick}
      style={{ padding:"7px 16px", borderRadius:20, border:`2px solid ${active&&theme?theme.accent:active?"#4f46e5":"#e2e8f0"}`, background:active&&theme?theme.card:active?"#ede9fe":"#fff", cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:active?700:400, color:active&&theme?theme.text:active?"#4f46e5":"#64748b", fontSize:13, transition:"all .15s" }}>
      {label}
    </button>
  );
}

function ActionBtn({ children, color, textColor, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding:"5px 10px", borderRadius:6, border:"none", background:color, color:textColor, cursor:"pointer", fontSize:12, fontFamily:"Georgia,serif", fontWeight:600, whiteSpace:"nowrap" }}>
      {children}
    </button>
  );
}

function SummaryBar({ assignments }) {
  const pending   = assignments.filter(a=>!a.completed).length;
  const completed = assignments.filter(a=>a.completed&&!a.paid).length;
  const paid      = assignments.filter(a=>a.paid).length;

  return (
    <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
      {[
        { label:"Pending",   count:pending,   color:"#f1f5f9", text:"#475569" },
        { label:"Completed", count:completed, color:"#dcfce7", text:"#16a34a" },
        { label:"Paid",      count:paid,      color:"#f1f5f9", text:"#94a3b8" },
      ].map(s => (
        <div key={s.label} style={{ background:s.color, borderRadius:8, padding:"6px 14px", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontWeight:700, color:s.text, fontSize:16 }}>{s.count}</span>
          <span style={{ color:s.text, fontSize:12 }}>{s.label}</span>
        </div>
      ))}
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