import { useState } from "react";
import { addJob, updateJob, deactivateJob } from "../../firestoreHelpers";

const fmt = (n) => n ? `$${Number(n).toFixed(2)}` : "—";

export default function JobLibrary({ jobLibrary }) {
  const blank = { title:"", instructions:"", value:"" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);

  const save = async () => {
    if (!form.title) return;
    if (editing) {
      // NEW: updateJob takes the job ID and an object of fields to update
      await updateJob(editing, {
        title: form.title,
        instructions: form.instructions,
        defaultValue: Number(form.value) || 0
      });
      setEditing(null);
    } else {
      // NEW: addJob creates a new document in Firestore
      await addJob({
        title: form.title,
        instructions: form.instructions,
        defaultValue: Number(form.value) || 0,
        category: "uncategorized"
      });
    }
    setForm(blank);
  };

  const startEdit = (j) => {
    setEditing(j.id);
    // NOTE: In Firestore, the field is "defaultValue" not "value"
    setForm({ title:j.title, instructions:j.instructions||"", value:j.defaultValue||"" });
  };

  const handleDelete = async (jobId) => {
    // NEW: We soft-delete (deactivate) instead of hard-deleting.
    // The job stays in Firestore but won't show up in the list anymore
    // because onJobLibraryChange only queries where active == true.
    await deactivateJob(jobId);
  };

  return (
    <div style={{ maxWidth:700 }}>
      <h2 style={{ margin:"0 0 20px", fontSize:22, color:"#1e1b4b" }}>Job Library</h2>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", padding:"18px 20px", marginBottom:20 }}>
        <h3 style={{ margin:"0 0 14px", fontSize:16, color:"#1e1b4b" }}>{editing ? "Edit Job" : "Add New Job"}</h3>

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>TITLE *</label>
        <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Job name"
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box", marginBottom:10 }} />

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>INSTRUCTIONS</label>
        <textarea value={form.instructions} onChange={e=>setForm(f=>({...f,instructions:e.target.value}))} rows={2} placeholder="Optional — describe how to do this job"
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, resize:"vertical", boxSizing:"border-box", marginBottom:10 }} />

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>DEFAULT VALUE ($)</label>
        <input type="number" min="0" step="0.25" value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))} placeholder="0.00 — can be overridden when assigning"
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box", marginBottom:14 }} />

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={save}
            style={{ padding:"9px 20px", borderRadius:8, border:"none", background:"#4f46e5", color:"#fff", fontFamily:"Georgia,serif", fontWeight:600, cursor:"pointer" }}>
            {editing ? "Update" : "Add to Library"}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm(blank); }}
              style={{ padding:"9px 20px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", fontFamily:"Georgia,serif", cursor:"pointer" }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
        {jobLibrary.length === 0
          ? <div style={{ padding:24, textAlign:"center", color:"#94a3b8" }}>No jobs in library yet — add one above</div>
          : jobLibrary.map(j => (
            <div key={j.id} style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:"1px solid #f1f5f9", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, color:"#1e293b" }}>{j.title}</div>
                {j.instructions && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{j.instructions}</div>}
              </div>
              {/* NOTE: Field is now "defaultValue" in Firestore */}
              <span style={{ fontWeight:700, color:"#4f46e5", minWidth:48, textAlign:"right" }}>{fmt(j.defaultValue)}</span>
              <button onClick={() => startEdit(j)}
                style={{ background:"#ede9fe", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", color:"#7c3aed", fontSize:12 }}>Edit</button>
              <button onClick={() => handleDelete(j.id)}
                style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", color:"#dc2626", fontSize:12 }}>Del</button>
            </div>
          ))}
      </div>
    </div>
  );
}
