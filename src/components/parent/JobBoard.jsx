import { useState, useEffect } from "react";
import {
  onAllJobBoardChange,
  postJobToBoard,
  removeJobBoardPost,
  reopenJobBoardPost
} from "../../firestoreHelpers";

const fmt = (n) => n ? `$${Number(n).toFixed(2)}` : "—";

export default function JobBoard({ kids, jobLibrary }) {
  const blank = { title:"", instructions:"", value:"", fromLibrary:"" };
  const [form, setForm] = useState(blank);
  const [posts, setPosts] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsub = onAllJobBoardChange((jobList) => setPosts(jobList));
    return () => unsub();
  }, []);

  const pickLibrary = (id) => {
    const j = jobLibrary.find(x => x.id === id);
    if (j) {
      setForm(f => ({
        ...f,
        fromLibrary: id,
        title: j.title,
        instructions: j.instructions || "",
        value: j.defaultValue || ""
      }));
    } else {
      setForm(f => ({ ...f, fromLibrary:"" }));
    }
  };

  const handlePost = async () => {
    if (!form.title) return;
    await postJobToBoard({
      title: form.title,
      instructions: form.instructions,
      value: Number(form.value) || 0,
      category: "uncategorized",
      postedBy: "parent"
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setForm(blank);
  };

  const getKidName = (memberId) => {
    const kid = kids.find(k => k.id === memberId);
    return kid ? `${kid.avatar} ${kid.name}` : "Unknown";
  };

  const available = posts.filter(p => p.status === "available");
  const claimed = posts.filter(p => p.status === "claimed");

  return (
    <div style={{ maxWidth:700 }}>
      <h2 style={{ margin:"0 0 4px", fontSize:22, color:"#1e1b4b" }}>Job Board</h2>
      <p style={{ margin:"0 0 20px", fontSize:13, color:"#64748b" }}>
        Post jobs here for the kids to claim on their own — first come, first served!
      </p>

      {/* Post form */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", padding:"18px 20px", marginBottom:20 }}>
        <h3 style={{ margin:"0 0 14px", fontSize:16, color:"#1e1b4b" }}>Post a Job</h3>

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>QUICK PICK FROM LIBRARY</label>
        <select value={form.fromLibrary} onChange={e => pickLibrary(e.target.value)}
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, marginBottom:10 }}>
          <option value="">— start from scratch —</option>
          {jobLibrary.map(j => (
            <option key={j.id} value={j.id}>{j.title}{j.defaultValue ? ` (${fmt(j.defaultValue)})` : ""}</option>
          ))}
        </select>

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>TITLE *</label>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))} placeholder="e.g. Organize the garage"
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box", marginBottom:10 }} />

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>INSTRUCTIONS</label>
        <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions:e.target.value }))} rows={2} placeholder="Optional details"
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, resize:"vertical", boxSizing:"border-box", marginBottom:10 }} />

        <label style={{ fontSize:12, fontWeight:600, color:"#64748b", display:"block", marginBottom:4 }}>DOLLAR VALUE</label>
        <input type="number" min="0" step="0.25" value={form.value} onChange={e => setForm(f => ({ ...f, value:e.target.value }))} placeholder="0.00"
          style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontFamily:"Georgia,serif", fontSize:14, boxSizing:"border-box", marginBottom:14 }} />

        <button onClick={handlePost}
          style={{ width:"100%", padding:"10px", borderRadius:8, border:"none", background:"#4f46e5", color:"#fff", fontFamily:"Georgia,serif", fontWeight:600, fontSize:14, cursor:"pointer" }}>
          {saved ? "✓ Posted!" : "📌 Post to Job Board"}
        </button>
      </div>

      {/* Available jobs */}
      <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#1e1b4b" }}>
        Available ({available.length})
      </h3>
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden", marginBottom:20 }}>
        {available.length === 0
          ? <div style={{ padding:24, textAlign:"center", color:"#94a3b8", fontSize:14 }}>No available jobs posted</div>
          : available.map(p => (
            <div key={p.id} style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:"1px solid #f1f5f9", gap:12 }}>
              <span style={{ fontSize:22 }}>📌</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, color:"#1e293b" }}>{p.title}</div>
                {p.instructions && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{p.instructions}</div>}
              </div>
              <span style={{ fontWeight:700, color:"#16a34a", minWidth:48, textAlign:"right" }}>{fmt(p.value)}</span>
              <button onClick={() => removeJobBoardPost(p.id)}
                style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", color:"#dc2626", fontSize:12 }}>
                Remove
              </button>
            </div>
          ))}
      </div>

      {/* Claimed jobs */}
      {claimed.length > 0 && (
        <>
          <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#1e1b4b" }}>
            Claimed ({claimed.length})
          </h3>
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
            {claimed.map(p => (
              <div key={p.id} style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:"1px solid #f1f5f9", gap:12 }}>
                <span style={{ fontSize:22 }}>✋</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:"#1e293b" }}>{p.title}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>Claimed by {getKidName(p.claimedBy)}</div>
                </div>
                <span style={{ fontWeight:700, color:"#16a34a", minWidth:48, textAlign:"right" }}>{fmt(p.value)}</span>
                <button onClick={() => reopenJobBoardPost(p.id)}
                  style={{ background:"#fef3c7", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", color:"#92400e", fontSize:12 }}>
                  Reopen
                </button>
                <button onClick={() => removeJobBoardPost(p.id)}
                  style={{ background:"#fee2e2", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", color:"#dc2626", fontSize:12 }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
