// ============================================================
//  FriendsScreen.jsx  —  people you've met & your friends
//  Put this file in your project's  src/  folder.
//
//  Anyone you've shared an event with can be added as a friend,
//  so you can easily invite them again next time.
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

const C = {
  paper: "#FFF3E0", card: "#FFFFFF", ink: "#2A2622",
  terra: "#FF8A4C", sage: "#2B8C6A", gold: "#E8A93C", muted: "#9A8574", warn: "#D9534F",
};

export default function FriendsScreen() {
  const [met, setMet] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("people_i_have_met");
    setMet(data || []);
    setLoading(false);
  }

  async function addFriend(id) {
    setMet((m) => m.map((p) => p.household_id === id ? { ...p, already_friend: true } : p));
    await supabase.rpc("add_friend", { the_friend: id });
  }
  async function removeFriend(id) {
    setMet((m) => m.map((p) => p.household_id === id ? { ...p, already_friend: false } : p));
    await supabase.rpc("remove_friend", { the_friend: id });
  }

  if (loading) return <div style={{ padding: 30, color: C.muted, fontFamily: "'Hanken Grotesk',sans-serif" }}>Loading…</div>;

  const friends = met.filter((p) => p.already_friend);
  const others = met.filter((p) => !p.already_friend);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "22px 20px 60px", fontFamily: "'Hanken Grotesk',sans-serif", color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap');`}</style>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 22, margin: "0 0 2px" }}>Friends</h2>
      <p style={{ color: C.muted, fontSize: 13.5, margin: "0 0 18px" }}>
        Families you've shared an event with. Add them as friends so they're easy to invite again.
      </p>

      {met.length === 0 && (
        <p style={{ color: C.muted, fontSize: 14, fontStyle: "italic" }}>
          Once you host or join an event with another family, they'll show up here.
        </p>
      )}

      {/* your friends */}
      {friends.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, margin: "0 0 8px" }}>
            Your friends
          </div>
          {friends.map((p) => (
            <Row key={p.household_id} p={p} onRemove={() => removeFriend(p.household_id)} C={C} isFriend />
          ))}
        </>
      )}

      {/* people you've met but not yet friended */}
      {others.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, margin: "18px 0 8px" }}>
            People you've met
          </div>
          {others.map((p) => (
            <Row key={p.household_id} p={p} onAdd={() => addFriend(p.household_id)} C={C} />
          ))}
        </>
      )}
    </div>
  );
}

function Row({ p, onAdd, onRemove, isFriend, C }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.ink}12`, borderRadius: 14, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: isFriend ? C.sage : C.terra, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "'Fraunces',serif" }}>
        {(p.family_name || "?")[0]}
      </div>
      <div style={{ flex: 1, fontWeight: 700 }}>The {p.family_name} Family</div>
      {isFriend ? (
        <button onClick={onRemove}
          style={{ ...btn(C), color: C.muted }}>♥ Friend</button>
      ) : (
        <button onClick={onAdd}
          style={{ ...btn(C), background: C.sage, color: "#fff", border: `1px solid ${C.sage}` }}>+ Add friend</button>
      )}
    </div>
  );
}

function btn(C) {
  return { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 10,
    border: `1px solid ${C.ink}26`, background: "transparent", color: C.ink, fontSize: 13, cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" };
}
