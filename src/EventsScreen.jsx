// ============================================================
//  EventsScreen.jsx  —  create & manage your potluck events
//  Put this file in your project's  src/  folder.
//
//  Create an event, refresh — it's still here. Click one to open
//  it (we'll fill in what "open" does in the next steps: RSVP,
//  dishes, split). For now opening just shows the details.
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import EventSplit from "./EventSplit.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import { sendCancellationEmail } from "./emailClient.js";

const C = {
  paper: "#FFF3E0", card: "#FFFFFF", ink: "#2A2622",
  terra: "#FF8A4C", sage: "#2B8C6A", gold: "#E8A93C", muted: "#9A8574", warn: "#D9534F",
};

export default function EventsScreen() {
  const [household, setHousehold] = useState(null);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);      // your family
  const [rsvpMap, setRsvpMap] = useState({});       // { "eventId:memberId": rsvpRow }
  const [dishesByEvent, setDishesByEvent] = useState({}); // { eventId: [dish, ...] }
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [splitTick, setSplitTick] = useState(0);

  // form fields for a new event
  const [form, setForm] = useState({
    title: "", location: "", event_date: "", start_time: "", end_time: "",
    rsvp_deadline: "", payment_mode: "split", host_show_bill: "show",
  });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [formError, setFormError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // find this user's household (oldest, like FamilyScreen)
    const { data: list } = await supabase
      .from("households").select("*").eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    const hh = (list && list[0]) || null;
    setHousehold(hh);

    if (hh) {
      const { data: evs } = await supabase
        .from("events").select("*").eq("host_household_id", hh.id)
        .order("event_date", { ascending: true });
      setEvents(evs || []);

      // load this family's members (for RSVP)
      const { data: mem } = await supabase
        .from("members").select("*").eq("household_id", hh.id).order("name");
      setMembers(mem || []);

      // load any existing RSVPs for these members
      const memberIds = (mem || []).map((m) => m.id);
      if (memberIds.length) {
        const { data: rs } = await supabase
          .from("rsvps").select("*").in("member_id", memberIds);
        const map = {};
        (rs || []).forEach((r) => { map[`${r.event_id}:${r.member_id}`] = r; });
        setRsvpMap(map);
      }

      // load dishes for all of this host's events
      const eventIds = (evs || []).map((e) => e.id);
      if (eventIds.length) {
        const { data: ds } = await supabase
          .from("dishes").select("*").in("event_id", eventIds);
        const byEvent = {};
        (ds || []).forEach((d) => {
          (byEvent[d.event_id] = byEvent[d.event_id] || []).push(d);
        });
        setDishesByEvent(byEvent);
      }
    }
    setLoading(false);
  }

  // ---- dishes ----
  // the dish list unlocks once we're past the RSVP deadline
  function dishesUnlocked(ev) {
    if (!ev.rsvp_deadline) return true;
    const today = new Date().toISOString().slice(0, 10);
    return today > ev.rsvp_deadline;
  }

  async function addDish(eventId, name) {
    if (!name.trim() || !household) return;
    const allergens = scanAllergens(name);   // auto-detect from the dish name
    const { data } = await supabase.from("dishes")
      .insert({ event_id: eventId, household_id: household.id, name: name.trim(), price: null, allergens })
      .select().single();
    if (data) setDishesByEvent((b) => ({ ...b, [eventId]: [...(b[eventId] || []), data] }));
  }

  async function updateDishPrice(eventId, dishId, value) {
    const price = value === "" ? null : Number(value);
    setDishesByEvent((b) => ({
      ...b, [eventId]: (b[eventId] || []).map((d) => d.id === dishId ? { ...d, price } : d),
    }));
    await supabase.from("dishes").update({ price }).eq("id", dishId);
    setSplitTick((t) => t + 1);
  }

  async function deleteDish(eventId, dishId) {
    await supabase.from("dishes").delete().eq("id", dishId);
    setDishesByEvent((b) => ({ ...b, [eventId]: (b[eventId] || []).filter((d) => d.id !== dishId) }));
    setSplitTick((t) => t + 1);
  }

  // The deadline is a friendly nudge, not a lock — RSVPs stay editable.
  // This just tells us whether we're past the deadline (to show a note).
  function pastDeadline(ev) {
    if (!ev.rsvp_deadline) return false;
    const today = new Date().toISOString().slice(0, 10);
    return today > ev.rsvp_deadline;
  }

  // toggle one family member's attendance for an event
  async function toggleRsvp(eventId, memberId) {
    const key = `${eventId}:${memberId}`;
    const existing = rsvpMap[key];
    if (existing) {
      // flip attending true/false
      const next = !existing.attending;
      setRsvpMap((m) => ({ ...m, [key]: { ...existing, attending: next } }));
      await supabase.from("rsvps").update({ attending: next }).eq("id", existing.id);
    } else {
      // create a new "attending" rsvp
      const { data } = await supabase.from("rsvps")
        .insert({ event_id: eventId, member_id: memberId, attending: true })
        .select().single();
      if (data) setRsvpMap((m) => ({ ...m, [key]: data }));
    }
    setSplitTick((t) => t + 1); // refresh the split AFTER the DB write lands
  }

  async function createEvent() {
    setFormError("");
    if (!household) return;

    // 1. every field is required
    if (!form.title.trim()) return setFormError("Please give the event a name.");
    if (!form.location.trim()) return setFormError("Please add a location.");
    if (!form.event_date) return setFormError("Please pick the event date.");
    if (!form.start_time) return setFormError("Please set a start time.");
    if (!form.end_time) return setFormError("Please set an end time.");
    if (!form.rsvp_deadline) return setFormError("Please set an RSVP deadline.");

    // 2. end time must be after start time (same day)
    if (form.end_time <= form.start_time)
      return setFormError("The end time must be after the start time.");

    // 3. RSVP deadline must be on or before the event date — and not in the past
    if (form.rsvp_deadline > form.event_date)
      return setFormError("The RSVP deadline must be on or before the event date.");
    const today = new Date().toISOString().slice(0, 10);
    if (form.rsvp_deadline < today)
      return setFormError("The RSVP deadline can't be in the past.");

    setCreating(true);
    const { data, error } = await supabase.from("events").insert({
      host_household_id: household.id,
      title: form.title.trim(),
      location: form.location.trim(),
      event_date: form.event_date,
      start_time: form.start_time,
      end_time: form.end_time,
      rsvp_deadline: form.rsvp_deadline,
      payment_mode: form.payment_mode,
      host_show_bill: form.host_show_bill,
    }).select().single();
    if (data) {
      setEvents((e) => [...e, data]);
      setForm({ title: "", location: "", event_date: "", start_time: "", end_time: "",
        rsvp_deadline: "", payment_mode: "split", host_show_bill: "show" });
      setShowCreate(false);
    }
    if (error) setFormError("Could not save: " + error.message);
    setCreating(false);
  }

  async function deleteEvent(id) {
    // check whether anyone else has joined this event
    const { data: guests } = await supabase.from("event_guests").select("household_id").eq("event_id", id);
    const others = (guests || []).filter((g) => g.household_id !== household?.id);

    if (others.length > 0) {
      // people have joined → CANCEL (keep the row so they get notified)
      const ev = events.find((e) => e.id === id);
      if (!confirm(`Cancel "${ev?.title}"? Everyone who joined will be notified that it's cancelled.`)) return;
      await supabase.from("events").update({ cancelled: true, cancelled_at: new Date().toISOString() }).eq("id", id);
      // email the guests (best-effort; won't block if email isn't set up)
      try {
        const { data: emails } = await supabase.rpc("event_guest_emails", { the_event_id: id });
        (emails || []).forEach((row) => {
          if (row.email) sendCancellationEmail(row.email, ev?.title || "your event", ev?.event_date || "");
        });
      } catch { /* email is optional */ }
      setEvents((e) => e.filter((x) => x.id !== id));
    } else {
      // nobody else joined → safe to delete outright
      if (!confirm("Delete this event? This can't be undone.")) return;
      await supabase.from("events").delete().eq("id", id);
      setEvents((e) => e.filter((x) => x.id !== id));
    }
    if (openId === id) setOpenId(null);
  }

  function countAttending(eventId) {
    return members.filter((m) => {
      const r = rsvpMap[`${eventId}:${m.id}`];
      return r && r.attending;
    }).length;
  }

  // who's attending this event, and what are they allergic to?
  // returns [{ name, allergies: [...] }, ...] for attending members
  function attendingAllergyProfiles(eventId) {
    return members
      .filter((m) => {
        const r = rsvpMap[`${eventId}:${m.id}`];
        return r && r.attending;
      })
      .map((m) => ({ name: m.name, allergies: m.allergies || [] }));
  }

  if (loading) {
    return <div style={{ padding: 30, color: C.muted, fontFamily: "'Hanken Grotesk',sans-serif" }}>Loading your events…</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "22px 20px 60px", fontFamily: "'Hanken Grotesk',sans-serif", color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap');`}</style>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 30, margin: "0 0 2px" }}>Your events 🎉</h2>
      <p style={{ color: C.muted, fontSize: 13.5, margin: "0 0 18px" }}>
        Create a potluck and it saves automatically. Click one to open it.
      </p>

      {/* existing events */}
      {events.length === 0 && (
        <p style={{ color: C.muted, fontSize: 14, fontStyle: "italic", marginBottom: 18 }}>
          No events yet — create your first one below.
        </p>
      )}
      {events.map((ev) => (
        <div key={ev.id} style={{ background: C.card, borderRadius: 18, padding: 18, marginBottom: 12,
          boxShadow: "0 2px 10px -6px rgba(80,50,20,0.18)",
          outline: openId === ev.id ? `2px solid ${C.terra}` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setOpenId(openId === ev.id ? null : ev.id)}>
              <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 19 }}>{ev.title}</div>
              <div style={{ color: C.muted, fontSize: 12.5 }}>
                {ev.event_date || "no date yet"}{fmtTimeRange(ev.start_time, ev.end_time)}{ev.location ? ` · ${ev.location}` : ""}
                {" · "}{ev.payment_mode === "host" ? "host pays" : "split the cost"}
              </div>
            </div>
            <button onClick={() => deleteEvent(ev.id)} title="Delete or cancel event"
              style={{ border: "none", background: `${C.warn}15`, color: C.warn, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>✕</button>
          </div>
          {openId === ev.id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.ink}14` }}>
              <InviteLink event={ev} />
              <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 10 }}>
                <b style={{ color: C.ink }}>RSVP deadline:</b> {ev.rsvp_deadline || "not set"}
              </div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>
                Who's coming from your family?
              </div>
              {pastDeadline(ev) && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: `${C.gold}1a`, border: `1px solid ${C.gold}55`,
                  borderRadius: 10, padding: "8px 11px", marginBottom: 10, fontSize: 12.5, color: C.ink }}>
                  📋 RSVPs were due {ev.rsvp_deadline}. The host is planning around the current headcount — but you can still update if your plans change.
                </div>
              )}
              {members.length === 0 && (
                <p style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>
                  No family members yet — add them on the family screen first.
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {members.map((m) => {
                  const r = rsvpMap[`${ev.id}:${m.id}`];
                  const on = r && r.attending;
                  return (
                    <span key={m.id} onClick={() => toggleRsvp(ev.id, m.id)}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
                        padding: "7px 12px", borderRadius: 10, color: on ? "#fff" : C.ink,
                        background: on ? C.ink : "transparent", border: `1px solid ${C.ink}26` }}>
                      {on ? "✓" : "+"} {m.name}{m.age != null ? ` · ${m.age}` : ""}
                    </span>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 12.5, color: C.sage, fontWeight: 600 }}>
                {countAttending(ev.id)} attending from your family · saves automatically
                <span style={{ color: C.muted, fontWeight: 400 }}> (everyone's total is in the split below)</span>
              </div>

              {/* ---- DISHES ---- */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.ink}14` }}>
                <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>
                  Who's bringing what
                </div>
                {!dishesUnlocked(ev) ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", background: `${C.ink}08`, border: `1px solid ${C.ink}1a`,
                    borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: C.muted }}>
                    🔒 The dish list opens after the RSVP deadline ({ev.rsvp_deadline}), once the headcount has settled.
                  </div>
                ) : (
                  <DishList
                    dishes={dishesByEvent[ev.id] || []}
                    myHouseholdId={household?.id}
                    attendees={attendingAllergyProfiles(ev.id)}
                    showPrices={ev.payment_mode !== "host"}
                    onAdd={(name) => addDish(ev.id, name)}
                    onPrice={(dishId, val) => updateDishPrice(ev.id, dishId, val)}
                    onDelete={(dishId) => deleteDish(ev.id, dishId)}
                  />
                )}
              </div>

              {/* ---- COST SPLIT ---- */}
              {dishesUnlocked(ev) && (
                <EventSplit event={ev} refreshKey={`${(dishesByEvent[ev.id] || []).length}-${countAttending(ev.id)}-${splitTick}`} />
              )}

              {/* ---- LATE CHANGES ---- */}
              <ActivityFeed event={ev} refreshKey={`${countAttending(ev.id)}-${splitTick}`} />
            </div>
          )}
        </div>
      ))}

      {/* create new event — collapsed once you already have events */}
      {events.length > 0 && !showCreate ? (
        <button onClick={() => setShowCreate(true)}
          style={{ ...btn, marginTop: 8, fontWeight: 700, borderStyle: "dashed", width: "100%", justifyContent: "center" }}>
          + Create another event
        </button>
      ) : (
      <div style={{ background: C.card, border: `1px dashed ${C.ink}33`, borderRadius: 14, padding: 16, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 16 }}>Create an event</div>
          {events.length > 0 && (
            <button onClick={() => setShowCreate(false)}
              style={{ marginLeft: "auto", border: "none", background: "transparent", color: C.muted, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              Cancel
            </button>
          )}
        </div>
        <Field label="Event name *"><input value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="e.g. Friendsgiving" style={inp} /></Field>
        <Field label="Location *"><input value={form.location} onChange={(e) => setF("location", e.target.value)} placeholder="e.g. my place" style={inp} /></Field>
        <Field label="Event date *"><input type="date" value={form.event_date} onChange={(e) => setF("event_date", e.target.value)} style={inp} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Starts *"><input type="time" value={form.start_time} onChange={(e) => setF("start_time", e.target.value)} style={inp} /></Field>
          <Field label="Ends *"><input type="time" value={form.end_time} onChange={(e) => setF("end_time", e.target.value)} style={inp} /></Field>
        </div>
        <Field label="RSVP deadline * (on or before the event date)"><input type="date" value={form.rsvp_deadline} onChange={(e) => setF("rsvp_deadline", e.target.value)} style={inp} /></Field>
        <Field label="Who pays? *">
          <div style={{ display: "flex", gap: 8 }}>
            {[["split", "Everyone splits"], ["host", "I'm covering it"]].map(([v, l]) => (
              <button key={v} onClick={() => setF("payment_mode", v)}
                style={{ ...btn, flex: 1, justifyContent: "center",
                  background: form.payment_mode === v ? C.terra : "transparent",
                  color: form.payment_mode === v ? "#fff" : C.ink, border: `1px solid ${C.terra}` }}>{l}</button>
            ))}
          </div>
        </Field>
        {form.payment_mode === "host" && (
          <Field label="Show what you spent?">
            <div style={{ display: "flex", gap: 8 }}>
              {[["show", "Show the total"], ["hide", "Keep it private"]].map(([v, l]) => (
                <button key={v} onClick={() => setF("host_show_bill", v)}
                  style={{ ...btn, flex: 1, justifyContent: "center",
                    background: form.host_show_bill === v ? C.sage : "transparent",
                    color: form.host_show_bill === v ? "#fff" : C.ink, border: `1px solid ${C.sage}` }}>{l}</button>
              ))}
            </div>
          </Field>
        )}
        {formError && (
          <p style={{ color: C.warn, fontSize: 13, fontWeight: 600, margin: "12px 0 0" }}>{formError}</p>
        )}
        <button onClick={createEvent} disabled={creating}
          style={{ ...btn, marginTop: 12, background: C.ink, color: "#fff", border: "none", fontWeight: 700 }}>
          {creating ? "Saving…" : "+ Create event"}
        </button>
      </div>
      )}
    </div>
  );
}

function fmtTimeRange(start, end) {
  if (!start || !end) return "";
  return ` · ${fmt12(start)}–${fmt12(end)}`;
}
function fmt12(t) {
  // t looks like "18:00" or "18:00:00"
  const [hStr, m] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function InviteLink({ event }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${window.location.pathname}?join=${event.invite_code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard can fail on some browsers — user can still select the text
    }
  }

  if (!event.invite_code) {
    return (
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
        Invite link not ready — make sure you've run the invites setup.
      </div>
    );
  }

  return (
    <div style={{ background: `${C.sage}12`, border: `1px solid ${C.sage}33`, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>
        Invite people
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input readOnly value={link} onFocus={(e) => e.target.select()}
          style={{ ...inp, fontSize: 12.5, background: "#fff", flex: 1 }} />
        <button onClick={copy} style={{ ...btn, fontWeight: 700, background: copied ? C.sage : "transparent", color: copied ? "#fff" : C.ink, border: `1px solid ${C.sage}` }}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: C.muted, margin: "6px 0 0" }}>
        Share this link by text or chat. Anyone who opens it can sign in and join the get-together.
      </p>
    </div>
  );
}

export function SplitPanel({ paymentMode, dishes, headCount, myHouseholdId, myName }) {
  const priced = dishes.filter((d) => d.price != null);
  const pendingCount = dishes.length - priced.length;
  const total = priced.reduce((s, d) => s + Number(d.price), 0);
  const share = headCount > 0 ? total / headCount : 0;

  if (paymentMode === "host") {
    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.ink}14` }}>
        <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>The bill</div>
        <div style={{ background: `${C.terra}0e`, border: `1px solid ${C.terra}33`, borderRadius: 10, padding: "12px 14px", fontSize: 13.5 }}>
          ❤️ The host is covering everything. Total spent so far: <b>${total.toFixed(2)}</b>. Nobody owes anything.
        </div>
      </div>
    );
  }

  // group what each household contributed
  const byHousehold = {};
  priced.forEach((d) => {
    byHousehold[d.household_id] = (byHousehold[d.household_id] || 0) + Number(d.price);
  });

  // NOTE: today there is usually just your household. The per-household
  // settle-up becomes fully meaningful once invited guests bring dishes too.
  const myContributed = byHousehold[myHouseholdId] || 0;
  const myShare = share; // your share counts your attending heads once multi-household exists

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.ink}14` }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>
        Split the cost
      </div>

      {pendingCount > 0 && (
        <div style={{ background: `${C.gold}1a`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "8px 11px", fontSize: 12.5, marginBottom: 10 }}>
          ⚠ {pendingCount} {pendingCount === 1 ? "dish doesn't" : "dishes don't"} have a price yet — this is provisional until everyone fills in what they spent.
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
        <Stat label={pendingCount > 0 ? "Cost so far" : "Total food cost"} value={`$${total.toFixed(2)}`} />
        <Stat label="Attending" value={headCount} />
        <Stat label="Fair share / person" value={`$${share.toFixed(2)}`} accent />
      </div>

      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
        Everyone pays an equal share of the total. You're credited back for whatever you bring, so:
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.ink}14`, borderRadius: 10, padding: "10px 12px", marginTop: 8, fontSize: 14 }}>
        You brought <b>${myContributed.toFixed(2)}</b> of food · your share is <b>${myShare.toFixed(2)}</b>.
        {" "}
        {myContributed - myShare > 0.005 ? (
          <span style={{ color: C.sage, fontWeight: 700 }}>You're owed ${ (myContributed - myShare).toFixed(2) } back.</span>
        ) : myContributed - myShare < -0.005 ? (
          <span style={{ color: C.warn, fontWeight: 700 }}>You owe ${ (myShare - myContributed).toFixed(2) }.</span>
        ) : (
          <span style={{ color: C.muted, fontWeight: 700 }}>You're even.</span>
        )}
      </div>

      <p style={{ color: C.muted, fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>
        Once friends are invited and bring their own dishes, this becomes the full "who pays whom" list — the fewest payments that settle everyone up. The math is ready; it just needs more than one household to show.
      </p>
    </div>
  );
}

// The full settle-up engine — used once multiple households exist.
// balances: [{ name, owes }]  (positive = owes money, negative = is owed)
// returns the minimal set of payments [{ from, to, amt }]
export function settleUp(balances) {
  const debtors = balances.filter((b) => b.owes > 0.005).map((b) => ({ ...b })).sort((a, b) => b.owes - a.owes);
  const creditors = balances.filter((b) => b.owes < -0.005).map((b) => ({ name: b.name, amt: -b.owes })).sort((a, b) => b.amt - a.amt);
  const tx = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].owes, creditors[j].amt);
    const rounded = Math.round(pay * 100) / 100;
    if (rounded > 0) tx.push({ from: debtors[i].name, to: creditors[j].name, amt: rounded });
    debtors[i].owes -= pay; creditors[j].amt -= pay;
    if (debtors[i].owes <= 0.005) i++;
    if (creditors[j].amt <= 0.005) j++;
  }
  return tx;
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 22, color: accent ? C.terra : C.ink }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

// crude keyword scanner — guesses allergens from a dish name.
// An AID, not a guarantee — hidden ingredients can be missed.
const ALLERGEN_KEYWORDS = {
  peanuts: ["peanut", "satay", "pad thai"],
  "tree nuts": ["almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "pesto", "nut"],
  dairy: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "parmesan", "mozzarella"],
  eggs: ["egg", "mayo", "mayonnaise", "custard", "meringue", "quiche"],
  gluten: ["bread", "wheat", "flour", "pasta", "sandwich", "cracker", "cookie", "cake", "bun", "noodle"],
  soy: ["soy", "tofu", "edamame", "tempeh", "miso", "teriyaki"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "scallop", "clam", "mussel"],
  fish: ["salmon", "tuna", "cod", "anchovy", "fish", "sardine"],
  sesame: ["sesame", "tahini", "hummus"],
};
export function scanAllergens(name) {
  const n = name.toLowerCase();
  const found = [];
  for (const [allergen, words] of Object.entries(ALLERGEN_KEYWORDS)) {
    if (words.some((w) => n.includes(w))) found.push(allergen);
  }
  return found;
}

export function DishList({ dishes, myHouseholdId, attendees = [], showPrices = true, onAdd, onPrice, onDelete }) {
  const [name, setName] = useState("");
  function submit() { if (name.trim()) { onAdd(name); setName(""); } }

  // figure out which attendees would be affected by a set of allergens
  function affectedBy(allergens) {
    if (!allergens || allergens.length === 0) return [];
    return attendees.filter((a) => a.allergies.some((al) => allergens.includes(al)));
  }

  // live preview for what's being typed
  const typedAllergens = scanAllergens(name);
  const typedAffected = affectedBy(typedAllergens);

  return (
    <div>
      {dishes.length === 0 && (
        <p style={{ color: C.muted, fontSize: 13, fontStyle: "italic", marginBottom: 10 }}>
          Nothing claimed yet — add the first dish below.
        </p>
      )}
      {dishes.map((d) => {
        const mine = d.household_id === myHouseholdId;
        // is this dish a duplicate name with another?
        const dup = dishes.filter((x) => x.name.trim().toLowerCase() === d.name.trim().toLowerCase()).length > 1;
        return (
          <div key={d.id} style={{ background: "#fff", border: `1px solid ${C.ink}14`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</span>
              {mine && <span style={{ fontSize: 11, fontWeight: 700, color: C.terra, background: `${C.terra}1a`, padding: "2px 7px", borderRadius: 999 }}>you</span>}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                {mine ? (
                  <>
                    {showPrices && (
                      <>
                        <span style={{ fontWeight: 700, color: d.price == null ? C.muted : C.sage }}>$</span>
                        <input type="number" min="0" step="0.01" value={d.price ?? ""} placeholder="—"
                          onChange={(e) => onPrice(d.id, e.target.value)} title="Your dish — add the cost once you've bought it"
                          style={{ width: 64, padding: "5px 7px", borderRadius: 8, border: `1px solid ${C.ink}26`,
                            background: "#fff", fontSize: 13.5, fontWeight: 700, textAlign: "right",
                            color: d.price == null ? C.muted : C.sage }} />
                      </>
                    )}
                    <button onClick={() => onDelete(d.id)} title="Remove your dish"
                      style={{ border: "none", background: "transparent", color: C.warn, cursor: "pointer", fontSize: 15, padding: "0 2px" }}>✕</button>
                  </>
                ) : (
                  showPrices && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: d.price == null ? C.muted : C.sage, fontWeight: 700, fontSize: 13.5 }}>
                      🔒 {d.price == null ? "—" : `$${Number(d.price).toFixed(2)}`}
                    </span>
                  )
                )}
              </div>
            </div>
            {showPrices && d.price == null && (
              <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, marginTop: 4 }}>price pending</div>
            )}
            {dup && (
              <div style={{ fontSize: 11.5, color: C.gold, marginTop: 4 }}>
                ⚠ Someone else already claimed “{d.name}” — consider bringing something different.
              </div>
            )}
            {(() => {
              const affected = affectedBy(d.allergens);
              if (affected.length === 0) return null;
              const which = [...new Set(affected.flatMap((a) => a.allergies.filter((al) => (d.allergens || []).includes(al))))];
              return (
                <div style={{ fontSize: 12, color: C.warn, marginTop: 6, fontWeight: 600, lineHeight: 1.4 }}>
                  ⚠ {affected.map((a) => a.name).join(", ")} {affected.length === 1 ? "is" : "are"} allergic to {which.join(", ")}. Please label it clearly or reconsider.
                </div>
              );
            })()}
          </div>
        );
      })}
      {name.trim() && typedAffected.length > 0 && (
        <div style={{ fontSize: 12, color: C.warn, fontWeight: 600, margin: "0 0 8px", lineHeight: 1.4 }}>
          ⚠ Heads up — this looks like it contains {typedAllergens.join(", ")}, which {typedAffected.map((a) => a.name).join(", ")} can't eat. You may want to bring something else.
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Claim a dish you'll bring…"
          style={inp} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button onClick={submit} style={{ ...btn, fontWeight: 700 }}>+ Add</button>
      </div>
      <p style={{ color: C.muted, fontSize: 11.5, marginTop: 8 }}>
        Leave the price blank until you've shopped — tap the price on your own dish to fill it in later. Only you can set the price on dishes you bring.
        <br />Allergen detection is an aid, not a guarantee — anyone with a severe allergy should confirm ingredients with whoever made the dish.
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 5, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}

const inp = {
  width: "100%", padding: "11px 13px", borderRadius: 12, border: `1px solid #F0E2CE`,
  background: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};
const btn = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 15px", borderRadius: 12,
  border: `1px solid #F0E2CE`, background: "#FFF8EF", color: C.ink, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap",
};
