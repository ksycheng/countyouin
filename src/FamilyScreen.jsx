// ============================================================
//  FamilyScreen.jsx  —  your REAL family, saved to the database
//  Put this file in your project's  src/  folder.
//
//  This version reads and writes your household + members in
//  Supabase. Add a person, refresh the page — they're still there.
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { uploadPhoto } from "./photoUpload.js";

const C = {
  paper: "#FFF3E0", card: "#FFFFFF", ink: "#2A2622",
  terra: "#FF8A4C", sage: "#2B8C6A", gold: "#E8A93C", muted: "#9A8574", warn: "#D9534F",
};
const ALLERGENS = ["peanuts", "tree nuts", "dairy", "eggs", "gluten", "soy", "shellfish", "fish", "sesame"];
const DIETS = ["vegetarian", "vegan", "halal", "kosher", "pescatarian"];

export default function FamilyScreen({ onNamed, onGoTab }) {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [hasEvents, setHasEvents] = useState(true); // assume true until checked (avoids flash)
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // load (or create) the logged-in person's household + members
  useEffect(() => { load(); checkHasEvents(); }, []);

  async function checkHasEvents() {
    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;
    if (!user) return;
    const { data: hh } = await supabase.from("households").select("id").eq("owner_id", user.id).order("created_at", { ascending: true });
    const myHid = hh && hh[0]?.id;
    if (!myHid) { setHasEvents(false); return; }
    // hosting any?
    const { count: hostCount } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("host_household_id", myHid);
    // invited to any?
    const { count: guestCount } = await supabase.from("event_guests").select("id", { count: "exact", head: true }).eq("household_id", myHid);
    setHasEvents((hostCount || 0) + (guestCount || 0) > 0);
    // remember dismissal in this browser
    setNudgeDismissed(localStorage.getItem("cy_nudge_dismissed") === "1");
  }
  function dismissNudge() {
    localStorage.setItem("cy_nudge_dismissed", "1");
    setNudgeDismissed(true);
  }

  // when the household loads, prefill the family-name box
  useEffect(() => {
    if (household) {
      // treat the auto-created "My family" placeholder as empty so they must name it
      setFamilyName(household.name === "My family" ? "" : (household.name || ""));
    }
  }, [household]);

  async function saveFamilyName(value) {
    setFamilyName(value);
    if (!household) return;
    await supabase.from("households").update({ name: value.trim() || "My family" }).eq("id", household.id);
    if (onNamed) onNamed(); // let the app re-check and unlock the other tabs
  }

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // find ALL households this user owns, oldest first
    let { data: list } = await supabase
      .from("households").select("*").eq("owner_id", user.id)
      .order("created_at", { ascending: true });

    let hh = (list && list[0]) || null;  // always use the oldest one

    // only make one if NONE exists yet
    if (!hh) {
      const { data: created } = await supabase
        .from("households")
        .insert({ owner_id: user.id, name: "My family", is_family: true })
        .select().single();
      hh = created;
    }
    setHousehold(hh);

    const { data: mem } = await supabase
      .from("members").select("*").eq("household_id", hh.id).order("name");
    setMembers(mem || []);
    setLoading(false);
  }

  async function addMember() {
    if (!newName.trim() || !household) return;
    setSaving(true);
    const { data } = await supabase.from("members")
      .insert({ household_id: household.id, name: newName.trim(), allergies: [], diets: [] })
      .select().single();
    if (data) setMembers((m) => [...m, data]);
    setNewName("");
    setSaving(false);
  }

  async function removeMember(id) {
    await supabase.from("members").delete().eq("id", id);
    setMembers((m) => m.filter((x) => x.id !== id));
  }

  async function updateMember(id, field, value) {
    setMembers((m) => m.map((x) => x.id === id ? { ...x, [field]: value } : x)); // instant on screen
    await supabase.from("members").update({ [field]: value }).eq("id", id);      // save in background
  }

  function toggleInList(member, field, value) {
    const list = member[field] || [];
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    updateMember(member.id, field, next);
  }

  if (loading) {
    return <div style={{ padding: 30, color: C.muted, fontFamily: "'Hanken Grotesk',sans-serif" }}>Loading your family…</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "22px 20px 60px", fontFamily: "'Hanken Grotesk',sans-serif", color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap');`}</style>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 30, margin: "0 0 2px" }}>Your family 🏡</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 18px" }}>
        Add everyone and their food needs — it all saves as you go.
      </p>

      {/* family name — shown in the cost split as "The <name> Family" */}
      <div style={{ background: C.card, borderRadius: 18, padding: 18, marginBottom: 14,
        boxShadow: familyName.trim() ? "0 2px 10px -6px rgba(80,50,20,0.18)" : "none",
        border: familyName.trim() ? "none" : `2px solid ${C.terra}` }}>
        <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 700, marginBottom: 6 }}>Family name *</div>
        <input value={familyName} onChange={(e) => saveFamilyName(e.target.value)}
          placeholder="e.g. Cheng"
          style={{ ...inp, borderRadius: 12 }} />
        {!familyName.trim() ? (
          <p style={{ color: C.terra, fontSize: 12.5, fontWeight: 700, margin: "8px 0 0" }}>
            Please enter your family name — it's how everyone is identified in the cost split.
          </p>
        ) : (
          <p style={{ color: C.muted, fontSize: 12, margin: "8px 0 0" }}>
            You'll appear as “The {familyName.trim()} Family” when splitting costs. 🎉
          </p>
        )}
      </div>

      {members.map((m) => (
        <div key={m.id} style={{ background: C.card, borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: "0 2px 10px -6px rgba(80,50,20,0.18)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <Avatar member={m} onPick={(url) => updateMember(m.id, "photo_url", url)} C={C} />
            <input value={m.name} onChange={(e) => updateMember(m.id, "name", e.target.value)}
              placeholder="Name" style={{ ...inp, flex: 2 }} />
            <input value={m.age ?? ""} onChange={(e) => updateMember(m.id, "age", e.target.value === "" ? null : Number(e.target.value))}
              type="number" min="0" placeholder="Age (optional)" style={{ ...inp, flex: 1, minWidth: 80 }} />
            {members.length > 1 && (
              <button onClick={() => removeMember(m.id)} title="Remove"
                style={{ ...btn, padding: "0 14px", color: "#fff", fontSize: 16, fontWeight: 700 }}>✕</button>
            )}
          </div>
          <ChipRow label="Allergies" options={ALLERGENS} selected={m.allergies || []}
            onToggle={(v) => toggleInList(m, "allergies", v)} active={C.warn} />
          <CustomChips member={m} field="allergies" preset={ALLERGENS} color={C.warn}
            placeholder="Other allergy not listed? e.g. mustard, kiwi…"
            onToggle={(v) => toggleInList(m, "allergies", v)} C={C} />
          <ChipRow label="Diet" options={DIETS} selected={m.diets || []}
            onToggle={(v) => toggleInList(m, "diets", v)} active={C.sage} />
          <CustomChips member={m} field="diets" preset={DIETS} color={C.sage}
            placeholder="Other dietary preference? e.g. keto, low-sodium…"
            onToggle={(v) => toggleInList(m, "diets", v)} C={C} />
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add a family member…"
          style={inp} onKeyDown={(e) => e.key === "Enter" && addMember()} />
        <button onClick={addMember} disabled={saving} style={{ ...btn, fontWeight: 700 }}>
          {saving ? "…" : "+ Add"}
        </button>
      </div>

      {/* "what's next" nudge — first-timers only: shown once family is set up,
          gone once they have an event or they dismiss it */}
      {familyName.trim() && members.length > 0 && !hasEvents && !nudgeDismissed && (
        <div style={{ background: `${C.terra}0e`, border: `1px solid ${C.terra}40`, borderRadius: 18, padding: 18, marginTop: 6, position: "relative" }}>
          <button onClick={dismissNudge} title="Dismiss"
            style={{ position: "absolute", top: 12, right: 12, border: "none", background: "transparent", color: C.muted, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✕</button>
          <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 19, marginBottom: 4 }}>You're all set! 🎉</div>
          <p style={{ color: C.ink, fontSize: 13.5, margin: "0 0 14px", lineHeight: 1.5 }}>
            What would you like to do next?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => onGoTab && onGoTab("hosting")}
              style={{ ...btn, background: C.terra, color: "#fff", fontWeight: 700, justifyContent: "center", padding: "12px" }}>
              🎉 Plan an event
            </button>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, textAlign: "center" }}>
              Got an invite from a friend? Just tap the link they sent you — it'll bring you straight in.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomChips({ member, field, preset, placeholder, color, onToggle, C }) {
  const [text, setText] = useState("");
  const custom = (member[field] || []).filter((a) => !preset.includes(a));
  function add() {
    const v = text.trim().toLowerCase();
    setText("");
    if (!v || (member[field] || []).includes(v)) return;
    onToggle(v);
  }
  return (
    <div style={{ marginBottom: 8 }}>
      {custom.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {custom.map((a) => (
            <span key={a} onClick={() => onToggle(a)} title="remove"
              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600,
                padding: "5px 9px 5px 11px", borderRadius: 999, color: "#fff", background: color, textTransform: "capitalize" }}>
              {a} ✕
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          style={{ ...inp, fontSize: 13 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} style={{ ...btn, fontWeight: 700 }}>Add</button>
      </div>
    </div>
  );
}

function Avatar({ member, onPick, C }) {
  const [busy, setBusy] = useState(false);
  const inputRef = React.useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const url = await uploadPhoto(file, "members", member.id);
    setBusy(false);
    if (url) onPick(url);
  }

  const initial = (member.name || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <>
      <div onClick={() => inputRef.current?.click()} title="Add a photo"
        style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
          background: member.photo_url ? `center/cover url(${member.photo_url})` : C.gold,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontFamily: "'Fraunces',serif", fontSize: 18,
          border: `2px solid ${C.card}`, boxShadow: "0 0 0 1px #F0E2CE", position: "relative" }}>
        {!member.photo_url && (busy ? "…" : initial)}
        {!member.photo_url && !busy && (
          <span style={{ position: "absolute", bottom: -2, right: -2, background: C.terra, color: "#fff",
            borderRadius: "50%", width: 18, height: 18, fontSize: 12, display: "flex", alignItems: "center",
            justifyContent: "center", border: `2px solid ${C.card}` }}>+</span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </>
  );
}

function ChipRow({ label, options, selected, onToggle, active }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <span key={o} onClick={() => onToggle(o)}
              style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999,
                textTransform: "capitalize", color: on ? "#fff" : C.ink, background: on ? active : "#FFF8EF",
                border: on ? `1px solid ${active}` : `1px solid #F0E2CE` }}>
              {o}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const inp = {
  width: "100%", padding: "11px 13px", borderRadius: 12, border: `1px solid #F0E2CE`,
  background: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};
const btn = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 16px", borderRadius: 12,
  border: "none", background: C.terra, color: "#fff", fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap",
};
