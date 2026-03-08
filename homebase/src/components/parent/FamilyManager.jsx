import { useState } from "react";
import { addMember, updateMember, deleteMember } from "../../firestoreHelpers";

const THEMES = {
  rose:    { bg:"#fff0f3", card:"#ffe4ea", accent:"#e11d48", light:"#fda4af", text:"#881337", grad:"linear-gradient(135deg,#fda4af,#e11d48)" },
  sky:     { bg:"#f0f9ff", card:"#e0f2fe", accent:"#0284c7", light:"#7dd3fc", text:"#0c4a6e", grad:"linear-gradient(135deg,#7dd3fc,#0284c7)" },
  violet:  { bg:"#f5f3ff", card:"#ede9fe", accent:"#7c3aed", light:"#c4b5fd", text:"#4c1d95", grad:"linear-gradient(135deg,#c4b5fd,#7c3aed)" },
  amber:   { bg:"#fffbeb", card:"#fef3c7", accent:"#d97706", light:"#fcd34d", text:"#78350f", grad:"linear-gradient(135deg,#fcd34d,#d97706)" },
  emerald: { bg:"#ecfdf5", card:"#d1fae5", accent:"#059669", light:"#6ee7b7", text:"#064e3b", grad:"linear-gradient(135deg,#6ee7b7,#059669)" },
  orange:  { bg:"#fff7ed", card:"#ffedd5", accent:"#ea580c", light:"#fdba74", text:"#7c2d12", grad:"linear-gradient(135deg,#fdba74,#ea580c)" },
};
const THEME_NAMES = Object.keys(THEMES);
const AVATAR_OPTIONS = ["🌸","⚡","🦋","🦊","🐬","🦁","🌈","🎮","🎨","🚀","🏆","🌻"];

export default function FamilyManager({ kids }) {
  const blank = { name:"", theme:"rose", avatar:"🌸" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);

  const save = async () => {
    if (!form.name) return;
    if (editing) {
      // NEW: updateMember takes the member ID and fields to update
      await updateMember(editing, {
        name: form.name,
        theme: form.theme,
        avatar: form.avatar
      });
      setEditing(null);
    } else {
      // NEW: addMember creates a new document in the members subcollection
      await addMember({
        name: form.name,
        role: "child",
        theme: form.theme,
        avatar: form.avatar,
        age: null
      });
    }
    setForm(blank);
  };

  const handleDelete = async (kidId) => {
    await deleteMember(kidId);
  };

  return (
    <div style={{ maxWidth:600 }}>
      <h2 style={{ margin:"0 0 20px", fontSize:22, color:"#1e1b4b" }}>Family Members</h2>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", padding:"18px 20px", marginBottom:20 }}>
        <h3 style={{ margin:"0 0 14px", fontSize:16 }}>{editing ? "Edit Kid" : "Add Kid"}</h3>

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>NAME *</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} placeholder="Kid's name"
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box", marginBottom:10 }} />

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:6 }}>AVATAR</label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
          {AVATAR_OPTIONS.map(a => (
            <button key={a} onClick={() => setForm(f => ({ ...f, avatar:a }))}
              style={{ fontSize:24, padding:"4px 8px", borderRadius:8, border:`2px solid ${form.avatar === a ? "#4f46e5" : "#e2e8f0"}`, background:form.avatar === a ? "#ede9fe" : "#fff", cursor:"pointer" }}>
              {a}
            </button>
          ))}
        </div>

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:6 }}>COLOR THEME</label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
          {THEME_NAMES.map(t => {
            const th = THEMES[t];
            return (
              <button key={t} onClick={() => setForm(f => ({ ...f, theme:t }))}
                style={{ padding:"6px 14px", borderRadius:20, border:`2px solid ${form.theme === t ? th.accent : th.light}`, background:form.theme === t ? th.card : th.bg, cursor:"pointer", color:th.text, fontSize:12, fontWeight:form.theme === t ? 700 : 400, fontFamily:"Georgia,serif" }}>
                {t}
              </button>
            );
          })}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={save}
            style={{ padding:"9px 20px", borderRadius:8, border:"none", background:"#4f46e5", color:"#fff", fontFamily:"Georgia,serif", fontWeight:600, cursor:"pointer" }}>
            {editing ? "Update" : "Add Kid"}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm(blank); }}
              style={{ padding:"9px 20px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", fontFamily:"Georgia,serif", cursor:"pointer" }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
        {kids.map(k => {
          const th = THEMES[k.theme] || THEMES.rose;
          return (
            <div key={k.id} style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
              <div style={{ background:th.grad, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:32 }}>{k.avatar}</span>
                <span style={{ color:"#fff", fontWeight:700, fontSize:16 }}>{k.name}</span>
              </div>
              <div style={{ padding:"10px 12px", display:"flex", gap:6 }}>
                <button onClick={() => { setEditing(k.id); setForm({ name:k.name, theme:k.theme, avatar:k.avatar }); }}
                  style={{ flex:1, padding:"6px", borderRadius:6, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", fontSize:12 }}>Edit</button>
                <button onClick={() => handleDelete(k.id)}
                  style={{ flex:1, padding:"6px", borderRadius:6, border:"none", background:"#fee2e2", color:"#dc2626", cursor:"pointer", fontSize:12 }}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
