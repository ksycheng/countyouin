// ============================================================
//  HelpScreen.jsx  —  a simple "how it works" guide
//  Put this file in your project's  src/  folder.
// ============================================================
import React from "react";

const C = {
  paper: "#FFF3E0", card: "#FFFFFF", ink: "#2A2622",
  terra: "#FF8A4C", sage: "#2B8C6A", gold: "#E8A93C", muted: "#9A8574",
};

const steps = [
  ["①", "Set up your family", "On the Family tab, enter your family name and add each person with their allergies and dietary needs. This keeps everyone safe and is how you're identified when splitting costs."],
  ["②", "Host or join an event", "Create a gathering on the Hosting tab, or open an invite link a friend shared. Set the date, time, location, RSVP deadline, and whether everyone splits the cost or you're covering it."],
  ["③", "Invite people", "Open your event and copy the invite link. Share it by text or chat — anyone who opens it can join and RSVP their own family."],
  ["④", "RSVP", "Say who's coming from your family. You can update this anytime, even after the deadline — life happens! Late changes are shown to everyone so the headcount stays clear."],
  ["⑤", "Who's bringing what", "After the RSVP deadline, the dish list opens. Claim what you'll bring. The app warns you if a dish contains something a guest is allergic to."],
  ["⑥", "Split the cost", "If you're sharing costs, add what you spent on your dish. The app totals everything, divides it fairly by headcount, and shows exactly who pays whom — in the fewest payments."],
  ["⑦", "Make friends", "Anyone you share an event with can be added as a friend, so they're easy to invite next time. Find them on the Friends tab."],
];

export default function HelpScreen({ onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(42,38,34,.45)", zIndex: 90,
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto",
      fontFamily: "'Hanken Grotesk',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap');`}</style>
      <div style={{ background: C.card, borderRadius: 18, padding: 26, maxWidth: 460, width: "100%", marginTop: 40,
        boxShadow: "0 20px 50px -20px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 22, margin: 0 }}>How it works</h2>
          <button onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "transparent",
            fontSize: 20, cursor: "pointer", color: C.muted }}>✕</button>
        </div>
        <p style={{ color: C.muted, fontSize: 13.5, margin: "0 0 18px" }}>
          Count You In makes planning a potluck or get-together simple — invites, allergies, and splitting the cost, all in one place.
        </p>
        {steps.map(([n, title, body]) => (
          <div key={n} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 18, color: C.terra, flexShrink: 0 }}>{n}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</div>
              <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>{body}</div>
            </div>
          </div>
        ))}
        <button onClick={onClose} style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none",
          background: C.terra, color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", marginTop: 6 }}>
          Got it
        </button>
      </div>
    </div>
  );
}
