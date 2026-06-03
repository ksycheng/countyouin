// ============================================================
//  JoinScreen.jsx  —  handles invite links like  ?join=CODE
//  Put this file in your project's  src/  folder.
//
//  When someone opens a shared invite link, this finds the event
//  by its secret code and adds their household to the guest list.
//  Then they can RSVP and bring dishes like any guest.
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

const C = {
  paper: "#FFF3E0", card: "#FFFFFF", ink: "#2A2622",
  terra: "#FF8A4C", sage: "#2B8C6A", gold: "#E8A93C", muted: "#9A8574", warn: "#D9534F",
};

// read ?join=CODE from the URL
function getInviteCode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("join");
}

export default function JoinScreen({ children }) {
  const code = getInviteCode();
  const [status, setStatus] = useState("checking"); // checking | joining | joined | error | none
  const [event, setEvent] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!code) { setStatus("none"); return; }
    handleJoin();
  }, []);

  async function handleJoin() {
    setStatus("joining");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus("error"); setMessage("Please sign in first, then open the link again."); return; }

    // find the event by its invite code (via a trusted function so a
    // brand-new guest can look it up before they've joined)
    const { data: rows, error: evErr } = await supabase
      .rpc("event_by_invite", { the_code: code });
    const ev = rows && rows[0];
    if (evErr || !ev) { setStatus("error"); setMessage("This invite link is invalid or expired."); return; }
    setEvent(ev);

    // find (or create) the joiner's household
    const { data: list } = await supabase
      .from("households").select("*").eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    let hh = (list && list[0]) || null;
    if (!hh) {
      const { data: created } = await supabase
        .from("households").insert({ owner_id: user.id, name: "My family", is_family: true })
        .select().single();
      hh = created;
    }

    // don't add twice — check if already on the guest list
    const { data: existing } = await supabase
      .from("event_guests").select("*")
      .eq("event_id", ev.id).eq("household_id", hh.id).maybeSingle();

    if (!existing) {
      const { error: insErr } = await supabase.from("event_guests").insert({
        event_id: ev.id, household_id: hh.id, pending: false,
      });
      if (insErr) { setStatus("error"); setMessage("Could not join: " + insErr.message); return; }
    }
    setStatus("joined");
  }

  function goToApp() {
    // clear the ?join= from the URL and show the main app
    window.history.replaceState({}, "", window.location.pathname);
    setStatus("none");
  }

  // No invite code in the URL → just show the normal app
  if (status === "none") return children;

  // Otherwise show a friendly invite screen
  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'Hanken Grotesk',sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 400, textAlign: "center", background: C.card,
        border: `1px solid ${C.ink}12`, borderRadius: 18, padding: 28 }}>
        {status === "checking" || status === "joining" ? (
          <p style={{ color: C.muted }}>Checking your invite…</p>
        ) : status === "joined" ? (
          <>
            <div style={{ fontSize: 40 }}>🎉</div>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 24, margin: "8px 0 4px" }}>You're in!</h1>
            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 6px" }}>
              You've joined <b style={{ color: C.ink }}>{event?.title}</b>
              {event?.event_date ? ` on ${event.event_date}` : ""}.
            </p>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px" }}>
              Next: let everyone know who's coming from your family — and enjoy the get-together!
            </p>
            <button onClick={goToApp}
              style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: C.terra,
                color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
              Go to the event
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36 }}>😕</div>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 22, margin: "8px 0 4px" }}>Hmm…</h1>
            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 20px" }}>{message}</p>
            <button onClick={goToApp}
              style={{ padding: "11px 20px", borderRadius: 12, border: `1px solid ${C.ink}26`, background: "transparent",
                color: C.ink, fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
              Continue to the app
            </button>
          </>
        )}
      </div>
    </div>
  );
}
