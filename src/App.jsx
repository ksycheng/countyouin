// ============================================================
//  App.jsx  —  the unified Count You In app (the "stitch")
//  Put this file in your project's  src/  folder (replace the old one).
//
//  One header, one tab bar. Three tabs:
//    Family   — your household & dietary info
//    Hosting  — events you create & manage
//    Invited  — events friends invited you to
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import FamilyScreen from "./FamilyScreen.jsx";
import CalendarScreen from "./CalendarScreen.jsx";
import EventsScreen from "./EventsScreen.jsx";
import InvitedScreen from "./InvitedScreen.jsx";
import FriendsScreen from "./FriendsScreen.jsx";
import HelpScreen from "./HelpScreen.jsx";

const C = {
  paper: "#FFF3E0", card: "#FFFFFF", ink: "#2A2622",
  terra: "#FF8A4C", sage: "#2B8C6A", gold: "#E8A93C", muted: "#9A8574",
};

function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-label="Count You In">
      <circle cx="48" cy="48" r="30" fill="none" stroke={C.terra} strokeWidth="6.5" />
      <g fill={C.sage}>
        <circle cx="48" cy="9" r="4.6" /><circle cx="81" cy="29" r="4.6" /><circle cx="81" cy="67" r="4.6" />
        <circle cx="15" cy="29" r="4.6" /><circle cx="15" cy="67" r="4.6" />
      </g>
      <circle cx="48" cy="87" r="5.4" fill={C.gold} />
      <path d="M35 50 a13 13 0 0 0 26 0 Z" fill={C.ink} />
      <g stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M43 44 q-3 -4 0 -8" /><path d="M53 44 q-3 -4 0 -8" />
      </g>
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState("calendar");
  const [familyNamed, setFamilyNamed] = useState(true); // assume ok until checked
  const [checked, setChecked] = useState(false);
  const [cancelled, setCancelled] = useState([]); // cancelled events to notify about
  const [removals, setRemovals] = useState([]); // events I was removed from
  const [showHelp, setShowHelp] = useState(false);

  // check whether this user's family has a real name yet
  useEffect(() => { checkName(); }, [tab]);
  // check for cancelled events to show a pop-up
  useEffect(() => { checkCancelled(); }, []);

  async function checkCancelled() {
    const { data } = await supabase.rpc("my_cancelled_events");
    setCancelled(data || []);
    const { data: rem } = await supabase.rpc("my_removal_notices");
    setRemovals(rem || []);
  }
  async function dismissCancel(eventId) {
    await supabase.rpc("dismiss_cancel", { the_event_id: eventId });
    setCancelled((c) => c.filter((x) => x.event_id !== eventId));
  }
  async function dismissRemoval(eventId) {
    await supabase.rpc("dismiss_removal", { the_event_id: eventId });
    setRemovals((c) => c.filter((x) => x.event_id !== eventId));
  }
  async function checkName() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: list } = await supabase.from("households")
      .select("name").eq("owner_id", user.id).order("created_at", { ascending: true });
    const hh = list && list[0];
    const named = hh && hh.name && hh.name.trim() && hh.name.trim() !== "My family";
    setFamilyNamed(!!named);
    setChecked(true);
    if (!named) setTab("family"); // force them to the family tab until named
  }

  async function signOut() { await supabase.auth.signOut(); }

  const tabs = [
    { id: "calendar", label: "Calendar" },
    { id: "family", label: "Family" },
    { id: "hosting", label: "Hosting" },
    { id: "invited", label: "Invited" },
    { id: "friends", label: "Friends" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: "'Hanken Grotesk',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap'); *{box-sizing:border-box;}`}</style>

      {showHelp && <HelpScreen onClose={() => setShowHelp(false)} />}

      {/* cancellation pop-up — shows as soon as a guest enters the app */}
      {cancelled.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(42,38,34,.45)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 18, padding: 28, maxWidth: 380, width: "100%", textAlign: "center",
            boxShadow: "0 20px 50px -20px rgba(0,0,0,.5)" }}>
            <div style={{ fontSize: 36 }}>😔</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 22, margin: "8px 0 6px" }}>Gathering cancelled</h2>
            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 4px", lineHeight: 1.5 }}>
              Unfortunately, the host has cancelled <b style={{ color: C.ink }}>{cancelled[0].title}</b>
              {cancelled[0].event_date ? <> (was set for {cancelled[0].event_date})</> : null}.
            </p>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px" }}>We're sorry for the disappointment.</p>
            <button onClick={() => dismissCancel(cancelled[0].event_id)}
              style={{ padding: "11px 22px", borderRadius: 12, border: "none", background: C.terra, color: "#fff",
                fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
              Got it
            </button>
          </div>
        </div>
      )}

      {/* removed-from-event pop-up */}
      {removals.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(42,38,34,.45)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 18, padding: 28, maxWidth: 380, width: "100%", textAlign: "center",
            boxShadow: "0 20px 50px -20px rgba(0,0,0,.5)" }}>
            <div style={{ fontSize: 36 }}>📭</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 22, margin: "8px 0 6px" }}>You've been removed</h2>
            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 4px", lineHeight: 1.5 }}>
              The host has removed your family from <b style={{ color: C.ink }}>{removals[0].event_title}</b>.
            </p>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px" }}>If you think this was a mistake, reach out to the host directly.</p>
            <button onClick={() => dismissRemoval(removals[0].event_id)}
              style={{ padding: "11px 22px", borderRadius: 12, border: "none", background: C.terra, color: "#fff",
                fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
              Got it
            </button>
          </div>
        </div>
      )}
      <div style={{ borderBottom: `1px solid ${C.gold}33`, background: C.paper, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <Logo />
            <h1 style={{ fontFamily: "'Fraunces',serif", margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>
              Count<span style={{ color: C.terra }}> You</span> In
            </h1>
            <button onClick={() => setShowHelp(true)}
              style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.muted, background: "transparent",
                border: `1px solid ${C.ink}22`, borderRadius: 999, padding: "5px 12px", cursor: "pointer" }}>
              ? Help
            </button>
            <button onClick={signOut}
              style={{ fontSize: 12, fontWeight: 700, color: C.muted, background: "transparent",
                border: `1px solid ${C.ink}22`, borderRadius: 999, padding: "5px 12px", cursor: "pointer", marginLeft: 8 }}>
              Sign out
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
            {tabs.map((t) => {
              const active = tab === t.id;
              const locked = !familyNamed && t.id !== "family";
              return (
                <button key={t.id} onClick={() => { if (!locked) setTab(t.id); }}
                  disabled={locked}
                  title={locked ? "Name your family first" : ""}
                  style={{ border: "none", cursor: locked ? "not-allowed" : "pointer", padding: "8px 16px", borderRadius: 999,
                    background: active ? C.terra : "transparent",
                    color: locked ? C.muted + "88" : (active ? "#fff" : C.muted),
                    fontWeight: active ? 700 : 600, fontSize: 14 }}>
                  {t.label}{locked ? " 🔒" : ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* the active tab */}
      <div>
        {tab === "calendar" && <CalendarScreen onGoTab={(t) => setTab(t)} />}
        {tab === "family" && <FamilyScreen onNamed={checkName} />}
        {tab === "hosting" && <EventsScreen />}
        {tab === "invited" && <InvitedScreen />}
        {tab === "friends" && <FriendsScreen />}
      </div>
    </div>
  );
}
