import { useState } from "react";
import { db } from "../../firebase";
import { ref, push } from "firebase/database";

const THEMES = {
  rose:    { bg:"#fff0f3", card:"#ffe4ea", accent:"#e11d48", light:"#fda4af", text:"#881337", grad:"linear-gradient(135deg,#fda4af,#e11d48)" },
  sky:     { bg:"#f0f9ff", card:"#e0f2fe", accent:"#0284c7", light:"#7dd3fc", text:"#0c4a6e", grad:"linear-gradient(135deg,#7dd3fc,#0284c7)" },
  violet:  { bg:"#f5f3ff", card:"#ede9fe", accent:"#7c3aed", light:"#c4b5fd", text:"#4c1d95", grad:"linear-gradient(135deg,#c4b5fd,#7c3aed)" },
  amber:   { bg:"#fffbeb", card:"#fef3c7", accent:"#d97706", light:"#fcd34d", text:"#78350f", grad:"linear-gradient(135deg,#fcd34d,#d97706)" },
  emerald: { bg:"#ecfdf5", card:"#d1fae5", accent:"#059669", light:"#6ee7b7", text:"#064e3b", grad:"linear-gradient(135deg,#6ee7b7,#059669)" },
  orange:  { bg:"#fff7ed", card:"#ffedd5", accent:"#ea580c", light:"#fdba74", text:"#7c2d12", grad:"linear-gradient(135deg,#fdba74,#ea580c)" },
};

const RECURRENCE = { once:"One-time", daily:"Daily", weekly:"Weekly", biweekly:"Bi-weekly", monthly:"Monthly" };
const today = () => new Date().toISOString().slice(0,10);

export default function AssignJob({ kids, jobLibrary }) {
  const blank = { title:"", instructions:"", value:"", kidIds:[], recurrence:"once", dueDate:today(), fromLibrary:"" };
  const [form, setForm] = useState(blank);
  const [saved, setSaved] = useState(false);

  const pickLibrary = (id) => {
    const j = jobLibrary.find(x=>x.id===id);
    if (j) setForm(f=>({...f, fromLibrary:id, title:j.title, instructions:j.instructions||""}));
    else   setForm(f=>({...f, fromLibrary:""}));
  };

  const toggleKid = (id) => setForm(f=>({
    ...f, kidIds: f.kidIds.includes(id) ? f.kidIds.filter(x=>x!==id) : [...f.kidIds, id]
  }));

  const submit = async () => {
    if (!form.title || form.kidIds.length === 0) return;
    for (const kidId of form.kidIds) {
      await push(ref(db, "assignments"), {
        kidId,
        title:        form.title,
        instructions: form.instructions,
        value:        Number(form.value) || 0,
        recurrence:   form.recurrence,
        dueDate:      form.dueDate,
        completed:    false,
        paid:         false,
        completedDate: null,
        createdDate:  today(),
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setForm(blank);
  };

  return (
    <div style={{ maxWidth:600 }}>
      <h2 style={{ margin:"0 0 20px", fontSize:22, color:"#1e1b4b" }}>Assign a Job</h2>

      {/* Library picker */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", padding:"18px 20px", marginBottom:12 }}>
        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>QUICK PICK FROM LIBRARY</label>
        <select value={form.fromLibrary} onChange={e=>pickLibrary(e.target.value)}
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14 }}>
          <option value="">— start from scratch —</option>
          {jobLibrary.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </div>

      {/* Form */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", padding:"18px 20px" }}>
        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>JOB TITLE *</label>
        <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Vacuum Living Room"
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box", marginBottom:12 }} />

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>INSTRUCTIONS</label>
        <textarea value={form.instructions} onChange={e=>setForm(f=>({...f,instructions:e.target.value}))} rows={3} placeholder="How to do this job…"
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, resize:"vertical", boxSizing:"border-box", marginBottom:12 }} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>DOLLAR VALUE</label>
            <input type="number" min="0" step="0.25" value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))} placeholder="0.00"
              style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>DUE DATE</label>
            <input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}
              style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box" }} />
          </div>
        </div>

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>RECURRENCE</label>
        <select value={form.recurrence} onChange={e=>setForm(f=>({...f,recurrence:e.target.value}))}
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, marginBottom:12 }}>
          {Object.entries(RECURRENCE).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:8 }}>ASSIGN TO *</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
          {kids.map(k => {
            const sel = form.kidIds.includes(k.id);
            const th  = THEMES[k.theme] || THEMES.rose;
            return (
              <button key={k.id} onClick={()=>toggleKid(k.id)}
                style={{ padding:"8px 16px", borderRadius:20, border:`2px solid ${sel?th.accent:"#e2e8f0"}`, background:sel?th.card:"#fff", cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:sel?700:400, color:sel?th.text:"#475569", display:"flex", alignItems:"center", gap:6 }}>
                <span>{k.avatar}</span>{k.name}
              </button>
            );
          })}
        </div>

        <button onClick={submit}
          style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:"#4f46e5", color:"#fff", fontFamily:"Georgia,serif", fontWeight:700, fontSize:16, cursor:"pointer" }}>
          {saved ? "✓ Assigned!" : "Assign Job"}
        </button>
      </div>
    </div>
  );
}