// ============================================================
//  CalendarScreen.jsx  —  the home screen: a calendar of
//  upcoming events (both hosting and invited).
//  Put this file in your project's  src/  folder.
//
//  Tapping an event tells the app to open it (via onOpenEvent),
//  which the App shell routes to the right tab.
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

const C = {
  paper: "#FFF3E0", card: "#FFFFFF", ink: "#2A2622", terra: "#FF8A4C",
  sage: "#2B8C6A", gold: "#E8A93C", muted: "#9A8574", soft: "#FFF8EF", line: "#F0E2CE",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function ymd(d) { return d.toISOString().slice(0, 10); }

export default function CalendarScreen({ onGoTab }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;
    if (!user) { setLoading(false); return; }

    const { data: list } = await supabase.from("households")
      .select("id").eq("owner_id", user.id).order("created_at", { ascending: true });
    const hh = list && list[0];
    if (!hh) { setLoading(false); return; }

    // events I host
    const { data: hosted } = await supabase.from("events")
      .select("*").eq("host_household_id", hh.id);

    // events I'm invited to
    const { data: guestRows } = await supabase.from("event_guests")
      .select("event_id").eq("household_id", hh.id);
    const ids = (guestRows || []).map((g) => g.event_id);
    let invited = [];
    if (ids.length) {
      const { data: evs } = await supabase.from("events")
        .select("*").in("id", ids).neq("host_household_id", hh.id);
      invited = evs || [];
    }

    const tag = (arr, role) => (arr || []).map((e) => ({ ...e, _role: role }));
    const all = [...tag(hosted, "hosting"), ...tag(invited, "invited")]
      .filter((e) => !e.cancelled && e.event_date);
    setEvents(all);
    setLoading(false);
  }

  // map date -> events on that date
  const byDate = {};
  events.forEach((e) => { (byDate[e.event_date] = byDate[e.event_date] || []).push(e); });

  // upcoming list (today onward, sorted)
  const todayStr = ymd(new Date());
  const upcoming = [...events]
    .filter((e) => e.event_date >= todayStr)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  // build the month grid
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function fmtDate(s) {
    const [y, m, d] = s.split("-").map(Number);
    return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
  }

  if (loading) return <div style={{ padding: 30, color: C.muted, fontFamily: "'Hanken Grotesk',sans-serif" }}>Loading your calendar…</div>;

  return (
    <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", color: C.ink }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 30, margin: "0 0 2px" }}>Your calendar 📅</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 18px" }}>Everything you're hosting or invited to, all in one place.</p>

      {/* month grid */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, marginBottom: 16, boxShadow: "0 2px 10px -6px rgba(80,50,20,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => setCursor(new Date(year, month - 1, 1))}
            style={{ border: "none", background: C.soft, borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 16, color: C.ink }}>‹</button>
          <div style={{ flex: 1, textAlign: "center", fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 18 }}>
            {MONTHS[month]} {year}
          </div>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))}
            style={{ border: "none", background: C.soft, borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 16, color: C.ink }}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
          {DOW.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.muted, padding: "4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayEvents = byDate[ds] || [];
            const isToday = ds === todayStr;
            const has = dayEvents.length > 0;
            return (
              <div key={i}
                style={{ aspectRatio: "1", borderRadius: 10, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", position: "relative",
                  background: isToday ? `${C.gold}22` : (has ? `${C.terra}12` : "transparent"),
                  border: isToday ? `1.5px solid ${C.gold}` : "none" }}>
                <span style={{ fontSize: 13, fontWeight: has ? 800 : 500, color: C.ink }}>{d}</span>
                {has && (
                  <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                    {dayEvents.slice(0, 3).map((e, k) => (
                      <span key={k} style={{ width: 5, height: 5, borderRadius: "50%",
                        background: e._role === "hosting" ? C.terra : C.sage }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11.5, color: C.muted, justifyContent: "center" }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: C.terra, marginRight: 5 }} />Hosting</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: C.sage, marginRight: 5 }} />Invited</span>
        </div>
      </div>

      {/* upcoming list */}
      <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 18, margin: "0 0 10px" }}>Coming up</div>
      {upcoming.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 18, padding: 22, textAlign: "center", boxShadow: "0 2px 10px -6px rgba(80,50,20,0.18)" }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🎉</div>
          <p style={{ color: C.muted, fontSize: 14, margin: "0 0 14px" }}>No upcoming events yet. Host one, or wait for an invite!</p>
          <button onClick={() => onGoTab && onGoTab("hosting")}
            style={{ padding: "11px 18px", borderRadius: 12, border: "none", background: C.terra, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            + Plan an event
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {upcoming.map((e) => (
            <div key={e.id} onClick={() => onGoTab && onGoTab(e._role)}
              style={{ background: C.card, borderRadius: 16, padding: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                boxShadow: "0 2px 10px -6px rgba(80,50,20,0.18)" }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: e._role === "hosting" ? `${C.terra}15` : `${C.sage}15`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: e._role === "hosting" ? C.terra : C.sage, textTransform: "uppercase" }}>
                  {fmtDate(e.event_date).split(" ")[0]}
                </span>
                <span style={{ fontSize: 17, fontWeight: 900, color: C.ink, lineHeight: 1 }}>{fmtDate(e.event_date).split(" ")[1]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{e.title}</div>
                <div style={{ color: C.muted, fontSize: 12.5 }}>
                  {e._role === "hosting" ? "You're hosting" : "You're invited"}{e.location ? ` · ${e.location}` : ""}
                </div>
              </div>
              <span style={{ color: C.muted, fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
