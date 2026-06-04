// ============================================================
//  DishSuggestions.jsx  —  allergy-aware dish ideas for an event
//  Put this file in your project's  src/  folder.
//
//  Pulls from the dish_catalog, filtered so nothing contains an
//  allergen of anyone attending (and matches required diets).
//  Suggestions are an AID — users must confirm ingredients.
// ============================================================
import React, { useState } from "react";
import { supabase } from "./supabaseClient.js";

const C = {
  card: "#FFFFFF", ink: "#2A2622", terra: "#FF8A4C", sage: "#2B8C6A",
  gold: "#E8A93C", muted: "#9A8574", warn: "#D9534F", soft: "#FFF8EF", line: "#F0E2CE",
};

const CATS = [
  ["appetizer", "Appetizers"], ["main", "Mains"], ["dessert", "Desserts"],
  ["drink", "Drinks"], ["snack", "Snacks"],
];

export default function DishSuggestions({ eventId }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("appetizer");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load(category) {
    setLoading(true);
    const { data } = await supabase.rpc("suggest_dishes", { the_event_id: eventId, the_category: category });
    setItems(data || []);
    setLoading(false);
  }

  function openPanel() { setOpen(true); load(cat); }
  function pick(c) { setCat(c); load(c); }

  if (!open) {
    return (
      <button onClick={openPanel}
        style={{ marginTop: 12, width: "100%", padding: "12px", borderRadius: 12, border: `1px dashed ${C.terra}`,
          background: C.soft, color: C.terra, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        🍽️ Suggest dishes (allergy-safe for everyone coming)
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 16 }}>Dish ideas 🍽️</span>
        <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", border: "none", background: "transparent", color: C.muted, cursor: "pointer", fontWeight: 700 }}>Close</button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {CATS.map(([id, label]) => (
          <button key={id} onClick={() => pick(id)}
            style={{ border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
              background: cat === id ? C.terra : "#fff", color: cat === id ? "#fff" : C.ink, boxShadow: cat === id ? "none" : `inset 0 0 0 1px ${C.line}` }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: C.muted, fontSize: 13 }}>Finding safe ideas…</p>
      ) : items.length === 0 ? (
        <p style={{ color: C.muted, fontSize: 13 }}>
          No dishes in this category fit everyone's needs. Try another category, or someone may need to bring something custom.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((d) => (
            <div key={d.id} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", boxShadow: `inset 0 0 0 1px ${C.line}` }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}{d.cuisine ? <span style={{ color: C.muted, fontWeight: 600, fontSize: 12 }}>  ·  {d.cuisine}</span> : null}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{d.ingredients}</div>
              {d.diets && d.diets.length > 0 && (
                <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {d.diets.map((dt) => (
                    <span key={dt} style={{ fontSize: 10.5, fontWeight: 700, color: C.sage, background: `${C.sage}14`, padding: "2px 7px", borderRadius: 999, textTransform: "capitalize" }}>{dt}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={() => load(cat)}
        style={{ marginTop: 10, width: "100%", padding: "9px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.ink, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        ↻ Show different ideas
      </button>

      <p style={{ color: C.muted, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
        ⚠️ These ideas are filtered to avoid the allergens and diets of everyone currently RSVP'd — but this is a helpful guide, <b>not a safety guarantee</b>. Always confirm exact ingredients with whoever prepares a dish, especially for severe allergies.
      </p>
    </div>
  );
}
