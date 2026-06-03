// ============================================================
//  GuestEventView.jsx  —  what a GUEST sees for an event they joined
//  Put this file in your project's  src/  folder.
//
//  Shows the event details, lets the guest RSVP their own family,
//  see the shared dish list and claim dishes, and see the split.
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { DishList, scanAllergens } from "./EventsScreen.jsx";
import EventSplit from "./EventSplit.jsx";
import ActivityFeed from "./ActivityFeed.jsx";

const C = {
  paper: "#FFF3E0", card: "#FFFFFF", ink: "#2A2622",
  terra: "#FF8A4C", sage: "#2B8C6A", gold: "#E8A93C", muted: "#9A8574", warn: "#D9534F",
};

export default function GuestEventView({ event, household, members, onBack }) {
  const [rsvpMap, setRsvpMap] = useState({});      // { memberId: rsvpRow }
  const [dishes, setDishes] = useState([]);
  const [attendeeProfiles, setAttendeeProfiles] = useState([]); // everyone attending (for allergy alerts)
  const [loading, setLoading] = useState(true);
  const [splitTick, setSplitTick] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    // my family's rsvps for this event
    const memberIds = members.map((m) => m.id);
    if (memberIds.length) {
      const { data: rs } = await supabase.from("rsvps")
        .select("*").eq("event_id", event.id).in("member_id", memberIds);
      const map = {};
      (rs || []).forEach((r) => { map[r.member_id] = r; });
      setRsvpMap(map);
    }
    // all dishes for this event (guests can read them now)
    const { data: ds } = await supabase.from("dishes").select("*").eq("event_id", event.id);
    setDishes(ds || []);

    // attending allergy profiles — from MY family (others' allergy data
    // isn't readable for privacy; the host sees the full picture).
    refreshAttendees();
    setLoading(false);
  }

  function refreshAttendees() {
    const profs = members
      .filter((m) => rsvpMap[m.id]?.attending)
      .map((m) => ({ name: m.name, allergies: m.allergies || [] }));
    setAttendeeProfiles(profs);
  }

  async function toggleRsvp(memberId) {
    const existing = rsvpMap[memberId];
    if (existing) {
      const next = !existing.attending;
      setRsvpMap((m) => ({ ...m, [memberId]: { ...existing, attending: next } }));
      await supabase.from("rsvps").update({ attending: next }).eq("id", existing.id);
    } else {
      const { data } = await supabase.from("rsvps")
        .insert({ event_id: event.id, member_id: memberId, attending: true }).select().single();
      if (data) setRsvpMap((m) => ({ ...m, [memberId]: data }));
    }
    setSplitTick((t) => t + 1);
  }

  function pastDeadline() {
    if (!event.rsvp_deadline) return false;
    return new Date().toISOString().slice(0, 10) > event.rsvp_deadline;
  }
  function dishesUnlocked() {
    if (!event.rsvp_deadline) return true;
    return new Date().toISOString().slice(0, 10) > event.rsvp_deadline;
  }

  async function addDish(name) {
    if (!name.trim()) return;
    const allergens = scanAllergens(name);
    const { data } = await supabase.from("dishes")
      .insert({ event_id: event.id, household_id: household.id, name: name.trim(), price: null, allergens })
      .select().single();
    if (data) setDishes((d) => [...d, data]);
    setSplitTick((t) => t + 1);
  }
  async function updateDishPrice(dishId, value) {
    const price = value === "" ? null : Number(value);
    setDishes((d) => d.map((x) => x.id === dishId ? { ...x, price } : x));
    await supabase.from("dishes").update({ price }).eq("id", dishId);
    setSplitTick((t) => t + 1);
  }
  async function deleteDish(dishId) {
    await supabase.from("dishes").delete().eq("id", dishId);
    setDishes((d) => d.filter((x) => x.id !== dishId));
    setSplitTick((t) => t + 1);
  }

  const headCount = members.filter((m) => rsvpMap[m.id]?.attending).length;
  const attendees = members.filter((m) => rsvpMap[m.id]?.attending)
    .map((m) => ({ name: m.name, allergies: m.allergies || [] }));

  if (loading) return <div style={{ padding: 30, color: C.muted }}>Loading the event…</div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 0 40px" }}>
      <button onClick={onBack} style={{ ...btn, marginBottom: 14 }}>← Back to invites</button>

      <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 22, margin: "0 0 2px" }}>{event.title}</h2>
      <p style={{ color: C.muted, fontSize: 13.5, margin: "0 0 16px" }}>
        {event.event_date}{event.location ? ` · ${event.location}` : ""}
        {" · "}{event.payment_mode === "host" ? "host is covering it" : "split the cost"}
      </p>

      {/* RSVP */}
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>
        Who's coming from your family?
      </div>
      {pastDeadline() && (
        <div style={{ background: `${C.gold}1a`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "8px 11px", marginBottom: 10, fontSize: 12.5 }}>
          📋 RSVPs were due {event.rsvp_deadline}. You can still update if your plans change.
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {members.map((m) => {
          const on = rsvpMap[m.id]?.attending;
          return (
            <span key={m.id} onClick={() => toggleRsvp(m.id)}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
                padding: "7px 12px", borderRadius: 10, color: on ? "#fff" : C.ink,
                background: on ? C.ink : "transparent", border: `1px solid ${C.ink}26` }}>
              {on ? "✓" : "+"} {m.name}{m.age != null ? ` · ${m.age}` : ""}
            </span>
          );
        })}
      </div>
      <div style={{ fontSize: 12.5, color: C.sage, fontWeight: 600 }}>
        {headCount} attending from your family · saves automatically
      </div>

      {/* DISHES */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.ink}14` }}>
        <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>
          Who's bringing what
        </div>
        {!dishesUnlocked() ? (
          <div style={{ background: `${C.ink}08`, border: `1px solid ${C.ink}1a`, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: C.muted }}>
            🔒 The dish list opens after the RSVP deadline ({event.rsvp_deadline}).
          </div>
        ) : headCount === 0 ? (
          <div style={{ background: `${C.gold}1a`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: C.ink }}>
            👆 RSVP at least one person from your family above before claiming a dish to bring.
          </div>
        ) : (
          <DishList
            dishes={dishes}
            myHouseholdId={household.id}
            attendees={attendees}
            showPrices={event.payment_mode !== "host"}
            onAdd={addDish}
            onPrice={updateDishPrice}
            onDelete={deleteDish}
          />
        )}
      </div>

      {/* SPLIT */}
      {dishesUnlocked() && (
        <EventSplit event={event} refreshKey={`${dishes.length}-${headCount}-${splitTick}`} />
      )}

      {/* LATE CHANGES */}
      <ActivityFeed event={event} refreshKey={`${headCount}-${splitTick}`} />
    </div>
  );
}

const btn = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 10,
  border: `1px solid ${C.ink}26`, background: "transparent", color: C.ink, fontSize: 13.5, cursor: "pointer", fontWeight: 600,
};
