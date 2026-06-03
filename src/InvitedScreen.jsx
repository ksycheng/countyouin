// ============================================================
//  InvitedScreen.jsx  —  events you've JOINED as a guest
//  Put this file in your project's  src/  folder.
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import GuestEventView from "./GuestEventView.jsx";

const C = {
  paper: "#FFF3E0", card: "#FFFFFF", ink: "#2A2622",
  terra: "#FF8A4C", sage: "#2B8C6A", gold: "#E8A93C", muted: "#9A8574",
};

export default function InvitedScreen() {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openEvent, setOpenEvent] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: list } = await supabase.from("households")
      .select("*").eq("owner_id", user.id).order("created_at", { ascending: true });
    const hh = (list && list[0]) || null;
    setHousehold(hh);
    if (!hh) { setLoading(false); return; }

    const { data: mem } = await supabase.from("members")
      .select("*").eq("household_id", hh.id).order("name");
    setMembers(mem || []);

    // events where my household is on the guest list
    const { data: guestRows } = await supabase.from("event_guests")
      .select("event_id").eq("household_id", hh.id);
    const eventIds = (guestRows || []).map((g) => g.event_id);
    if (eventIds.length) {
      // I host some of my own events too — exclude those so this tab is
      // only events OTHER people invited me to.
      const { data: evs } = await supabase.from("events")
        .select("*").in("id", eventIds).neq("host_household_id", hh.id)
        .order("event_date", { ascending: true });
      setEvents(evs || []);
    }
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 30, color: C.muted, fontFamily: "'Hanken Grotesk',sans-serif" }}>Loading your invites…</div>;

  if (openEvent) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "22px 20px 60px", fontFamily: "'Hanken Grotesk',sans-serif", color: C.ink }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap');`}</style>
        <GuestEventView event={openEvent} household={household} members={members} onBack={() => { setOpenEvent(null); load(); }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "22px 20px 60px", fontFamily: "'Hanken Grotesk',sans-serif", color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap');`}</style>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 28, margin: "0 0 2px" }}>You're invited</h2>
      <p style={{ color: C.muted, fontSize: 13.5, margin: "0 0 18px" }}>
        Events friends have invited you to. Open one to RSVP and see the details.
      </p>
      {events.length === 0 && (
        <p style={{ color: C.muted, fontSize: 14, fontStyle: "italic" }}>
          No invites yet. When someone shares an invite link with you and you open it, the event shows up here.
        </p>
      )}
      {events.map((ev) => (
        <div key={ev.id} onClick={() => setOpenEvent(ev)}
          style={{ background: C.card, borderRadius: 18, boxShadow: "0 2px 10px -6px rgba(80,50,20,0.18)", padding: 16, marginBottom: 12, cursor: "pointer" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 17 }}>{ev.title}</div>
          <div style={{ color: C.muted, fontSize: 12.5 }}>
            {ev.event_date || "no date yet"}{ev.location ? ` · ${ev.location}` : ""}
            {" · "}{ev.payment_mode === "host" ? "host pays" : "split the cost"}
          </div>
        </div>
      ))}
    </div>
  );
}
