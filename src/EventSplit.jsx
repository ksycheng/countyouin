// ============================================================
//  EventSplit.jsx  —  the REAL multi-household headcount + settle-up
//  Put this file in your project's  src/  folder.
//
//  Uses the event_summary database function to gather every
//  household's attending count and contribution, then shows the
//  total, fair share, and the minimal "who pays whom" payments.
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

const C = {
  paper: "#F4EDE0", card: "#FBF7EF", ink: "#2A2622",
  terra: "#C5683D", sage: "#6B7050", gold: "#C9A24B", muted: "#8A7F6F", warn: "#B23A2E",
};

// minimal set of payments that clears everyone
function settleUp(balances) {
  const debtors = balances.filter((b) => b.owes > 0.005).map((b) => ({ ...b })).sort((a, b) => b.owes - a.owes);
  const creditors = balances.filter((b) => b.owes < -0.005).map((b) => ({ name: b.name, amt: -b.owes })).sort((a, b) => b.amt - a.amt);
  const tx = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].owes, creditors[j].amt);
    const r = Math.round(pay * 100) / 100;
    if (r > 0) tx.push({ from: debtors[i].name, to: creditors[j].name, amt: r });
    debtors[i].owes -= pay; creditors[j].amt -= pay;
    if (debtors[i].owes <= 0.005) i++;
    if (creditors[j].amt <= 0.005) j++;
  }
  return tx;
}

export default function EventSplit({ event, refreshKey }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myHid, setMyHid] = useState(null);
  const [friendIds, setFriendIds] = useState(new Set());

  useEffect(() => { load(); }, [event.id, refreshKey]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("event_summary", { the_event_id: event.id });
    if (!error) setRows(data || []);

    // who am I, and who are already my friends (for the add-friend buttons)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: hh } = await supabase.from("households")
        .select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
      setMyHid(hh?.id || null);
    }
    const { data: friends } = await supabase.rpc("my_friends");
    setFriendIds(new Set((friends || []).map((f) => f.friend_household_id)));
    setLoading(false);
  }

  async function addFriend(hid) {
    setFriendIds((s) => new Set(s).add(hid));
    await supabase.rpc("add_friend", { the_friend: hid });
  }

  if (loading) return <div style={{ color: C.muted, fontSize: 13, marginTop: 14 }}>Calculating the split…</div>;
  if (!rows) return null;

  const headCount = rows.reduce((s, r) => s + Number(r.attending_count), 0);
  const total = rows.reduce((s, r) => s + Number(r.contributed), 0);
  const share = headCount > 0 ? total / headCount : 0;

  // Build a display label for each household. If two households share the
  // same name, disambiguate by listing their attending members' first names
  // (stable + recognizable). If those collide too, fall back to a number.
  const nameCounts = {};
  rows.forEach((r) => { nameCounts[r.household_name] = (nameCounts[r.household_name] || 0) + 1; });

  function firstName(full) { return (full || "").trim().split(/\s+/)[0]; }
  function familyLabel(name) { return `The ${name} Family`; }

  function labelFor(r, indexAmongDupes) {
    const base = familyLabel(r.household_name);
    if (nameCounts[r.household_name] <= 1) return base; // unique → "The Cheng Family"
    const names = (r.attending_names || []).map(firstName).filter(Boolean);
    if (names.length > 0) return `${base} (${names.join(", ")})`; // "The Cheng Family (Kenneth, Mei)"
    return `${base} (#${indexAmongDupes + 1})`;
  }

  // track an index per duplicated name for the numbered fallback
  const dupeSeen = {};
  const labelled = rows.map((r) => {
    const idx = dupeSeen[r.household_name] || 0;
    dupeSeen[r.household_name] = idx + 1;
    return { ...r, label: labelFor(r, idx) + (r.is_host ? " · host" : "") };
  });

  // any household contributing 0 with attendees might just not have shopped;
  // we can't know "pending" per household here, so show total as live.

  if (event.payment_mode === "host") {
    const roster = (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>
          Who's coming ({headCount} total)
        </div>
        {labelled.map((r) => {
          const heads = Number(r.attending_count);
          const isMe = r.household_id === myHid;
          const isFriend = friendIds.has(r.household_id);
          const names = (r.attending_names || []).join(", ");
          return (
            <div key={r.household_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: `1px dashed ${C.ink}12` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.label}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{heads} {heads === 1 ? "person" : "people"}{names ? ` · ${names}` : ""}</div>
              </div>
              {!isMe && (isFriend
                ? <span style={{ fontSize: 11.5, color: C.sage, fontWeight: 700 }}>♥ Friend</span>
                : <button onClick={() => addFriend(r.household_id)}
                    style={{ fontSize: 11.5, fontWeight: 700, color: C.sage, background: "transparent",
                      border: `1px solid ${C.sage}66`, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>+ Friend</button>)}
            </div>
          );
        })}
      </div>
    );

    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.ink}14` }}>
        <Header>The get-together</Header>
        <div style={{ background: `${C.terra}0e`, border: `1px solid ${C.terra}33`, borderRadius: 10, padding: "12px 14px", fontSize: 13.5 }}>
          {event.host_show_bill === "hide"
            ? <>❤️ The host is treating everyone — just come and enjoy!</>
            : <>❤️ The host is covering everything. Total spent so far: <b>${total.toFixed(2)}</b>. Nobody owes anything.</>}
        </div>
        {roster}
      </div>
    );
  }

  // balance per household = their fair share (share × their heads) − what they contributed
  const balances = labelled.map((r) => ({
    name: r.label,
    owes: share * Number(r.attending_count) - Number(r.contributed),
  }));
  const payments = settleUp(balances);

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.ink}14` }}>
      <Header>Split the cost</Header>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <Stat label="Total food cost" value={`$${total.toFixed(2)}`} />
        <Stat label="Attending (everyone)" value={headCount} />
        <Stat label="Fair share / person" value={`$${share.toFixed(2)}`} accent />
      </div>

      {/* per-household breakdown */}
      {labelled.map((r) => {
        const heads = Number(r.attending_count);
        const contributed = Number(r.contributed);
        const owes = share * heads - contributed;
        const isMe = r.household_id === myHid;
        const isFriend = friendIds.has(r.household_id);
        return (
          <div key={r.household_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px dashed ${C.ink}12` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.label}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{heads} {heads === 1 ? "head" : "heads"} · brought ${contributed.toFixed(2)}</div>
            </div>
            {!isMe && (
              isFriend ? (
                <span style={{ fontSize: 11.5, color: C.sage, fontWeight: 700 }}>♥ Friend</span>
              ) : (
                <button onClick={() => addFriend(r.household_id)}
                  style={{ fontSize: 11.5, fontWeight: 700, color: C.sage, background: "transparent",
                    border: `1px solid ${C.sage}66`, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>
                  + Friend
                </button>
              )
            )}
            <div style={{ textAlign: "right", fontWeight: 800, minWidth: 90 }}>
              {owes > 0.005 ? <span style={{ color: C.warn }}>owes ${owes.toFixed(2)}</span>
                : owes < -0.005 ? <span style={{ color: C.sage }}>gets ${Math.abs(owes).toFixed(2)} back</span>
                : <span style={{ color: C.muted }}>even</span>}
            </div>
          </div>
        );
      })}

      {/* who pays whom */}
      {payments.length > 0 && (
        <div style={{ background: `${C.terra}0e`, border: `1px solid ${C.terra}33`, borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Settle up — {payments.length} payment{payments.length > 1 ? "s" : ""}</div>
          {payments.map((t, k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: k ? `1px dashed ${C.ink}12` : "none" }}>
              <span style={{ fontWeight: 700 }}>{t.from}</span>
              <span style={{ color: C.muted }}>→</span>
              <span style={{ fontWeight: 700 }}>{t.to}</span>
              <span style={{ marginLeft: "auto", fontWeight: 800, color: C.terra }}>${t.amt.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ color: C.muted, fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>
        Everyone pays an equal share of the total; you're credited back for what you bring. The fewest payments that settle everyone up. Updates as prices and RSVPs change.
      </p>
    </div>
  );
}

function Header({ children }) {
  return <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}
function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 22, color: accent ? C.terra : C.ink }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}
