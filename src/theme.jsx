// ============================================================
//  theme.jsx  —  Count You In shared design system (bright & cheerful)
//  Put this file in your project's  src/  folder.
//
//  One home for colors + reusable warm UI pieces. Import what you
//  need:  import { CY, Hero, Card, Pill, Btn, Section } from "./theme.jsx";
// ============================================================
import React from "react";

// ---- the bright & cheerful palette ----
export const CY = {
  // backgrounds
  bg:      "#FFF3E0",   // warm cream page background
  card:    "#FFFFFF",   // white cards
  soft:    "#FFF8EF",   // very soft cream for inner panels
  // brand colors
  coral:   "#FF8A4C",   // lead — warm friendly orange (headers, primary)
  coralDk: "#C85A2A",   // darker coral for text on light
  green:   "#2B8C6A",   // good news / money / success
  greenBg: "#E3F6EC",   // soft green panel
  gold:    "#E8A93C",   // sunny accent (you / highlights)
  // text
  ink:     "#2A2622",   // near-black text
  muted:   "#9A8574",   // warm grey for secondary text
  // status
  warn:    "#D9534F",   // allergy / danger
  warnBg:  "#FBEAE9",
  line:    "#F0E2CE",   // soft divider on cream
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');`;

export function Fonts() {
  return <style>{FONTS + " *{box-sizing:border-box;}"}</style>;
}

// ---- a warm colored hero header ----
export function Hero({ eyebrow, title, subtitle, color = CY.coral }) {
  return (
    <div style={{ background: color, borderRadius: 18, padding: "22px 20px 18px", textAlign: "center", marginBottom: 16 }}>
      {eyebrow && <div style={{ fontSize: 11, letterSpacing: 1, color: "#fff", opacity: 0.85, fontWeight: 700 }}>{eyebrow}</div>}
      <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 27, color: "#fff", margin: "3px 0 4px", lineHeight: 1.1 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13.5, color: "#fff", opacity: 0.92 }}>{subtitle}</div>}
    </div>
  );
}

// ---- a soft white card ----
export function Card({ children, style }) {
  return (
    <div style={{ background: CY.card, borderRadius: 16, padding: 18, marginBottom: 12, boxShadow: "0 2px 10px -6px rgba(80,50,20,0.18)", ...style }}>
      {children}
    </div>
  );
}

// ---- a soft pill (for chips, tags, RSVP) ----
export function Pill({ children, on, onClick, color = CY.coral, style }) {
  return (
    <span onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 13, fontWeight: 600, padding: "7px 13px", borderRadius: 999,
        background: on ? color : CY.soft, color: on ? "#fff" : CY.ink,
        border: on ? `1px solid ${color}` : `1px solid ${CY.line}`, ...style }}>
      {children}
    </span>
  );
}

// ---- a primary button ----
export function Btn({ children, onClick, kind = "primary", style, disabled }) {
  const kinds = {
    primary: { background: CY.coral, color: "#fff", border: "none" },
    green:   { background: CY.green, color: "#fff", border: "none" },
    soft:    { background: CY.soft, color: CY.ink, border: `1px solid ${CY.line}` },
    ghost:   { background: "transparent", color: CY.muted, border: `1px solid ${CY.line}` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: "12px 18px", borderRadius: 13, fontSize: 14.5, fontWeight: 700, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1, ...kinds[kind], ...style }}>
      {children}
    </button>
  );
}

// ---- a small section heading ----
export function Section({ children, style }) {
  return (
    <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 18, color: CY.ink, margin: "0 0 10px", ...style }}>
      {children}
    </div>
  );
}

// ---- shared input style ----
export const cyInput = {
  width: "100%", padding: "11px 13px", borderRadius: 12, border: `1px solid ${CY.line}`,
  background: CY.card, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: CY.ink,
};
