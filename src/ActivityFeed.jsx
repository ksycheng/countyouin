// ============================================================
//  ActivityFeed.jsx  —  who joined / dropped AFTER the deadline
//  Put this file in your project's  src/  folder.
//
//  Shows a clear, friendly list so all families can see late changes:
//   "📋 After the RSVP deadline:  Dana joined · Sam (Lo Family) dropped out"
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

const C = {
  paper: "#F4EDE0", card: "#FBF7EF", ink: "#2A2622",
  terra: "#C5683D", sage: "#6B7050", gold: "#C9A24B", muted: "#8A7F6F", warn: "#B23A2E",
};

export default function ActivityFeed({ event, refreshKey }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [event.id, refreshKey]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("event_late_changes", { the_event_id: event.id });
    if (!error) setChanges(data || []);
    setLoading(false);
  }

  if (loading || changes.length === 0) return null; // show nothing if no late changes

  function when(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.ink}14` }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>
        📋 Changes after the RSVP deadline
      </div>
      <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}44`, borderRadius: 10, padding: "6px 12px" }}>
        {changes.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: i ? `1px dashed ${C.ink}12` : "none", fontSize: 13.5 }}>
            <span style={{ fontSize: 15 }}>{c.attending ? "✅" : "❌"}</span>
            <span>
              <b>{c.member_name}</b>
              <span style={{ color: C.muted }}> (The {c.family_name} Family)</span>
              {" "}{c.attending
                ? <span style={{ color: C.sage, fontWeight: 600 }}>joined</span>
                : <span style={{ color: C.warn, fontWeight: 600 }}>dropped out</span>}
            </span>
            <span style={{ marginLeft: "auto", color: C.muted, fontSize: 12 }}>{when(c.changed_at)}</span>
          </div>
        ))}
      </div>
      <p style={{ color: C.muted, fontSize: 11.5, marginTop: 8 }}>
        Everyone can see these so the headcount stays clear when plans shift late.
      </p>
    </div>
  );
}
