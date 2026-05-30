import React, { useState, useMemo } from "react";
import {
  Users, CalendarDays, ClipboardList, Receipt, PartyPopper,
  AlertTriangle, Plus, Check, Lock, Unlock, Heart, X, UserPlus, Utensils, ArrowRight
} from "lucide-react";

/* ============================================================
   THE GATHERING — a dietary-aware potluck + cost-split planner
   Single-file interactive prototype. In-memory state only.
   ============================================================ */

const ALLERGENS = [
  "peanuts", "tree nuts", "dairy", "eggs", "gluten",
  "soy", "shellfish", "fish", "sesame",
];

const DIETS = ["vegetarian", "vegan", "halal", "kosher", "pescatarian"];

// crude keyword scanner — suggests allergens from a dish name.
const KEYWORDS = {
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

function scanAllergens(name) {
  const n = name.toLowerCase();
  const found = new Set();
  for (const [allergen, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => n.includes(w))) found.add(allergen);
  }
  return [...found];
}

// ---- seed data ---------------------------------------------------------
const seedAccounts = [
  {
    id: "a1", holder: "You (Kenneth)", isFamily: true,
    members: [
      { id: "m1", name: "Kenneth", age: null, allergies: [], diets: [] },
      { id: "m2", name: "Mei", age: null, allergies: ["shellfish"], diets: [] },
      { id: "m3", name: "Theo", age: 6, allergies: ["peanuts", "tree nuts"], diets: [] },
    ],
  },
  {
    id: "a2", holder: "Priya", isFamily: true,
    members: [
      { id: "m4", name: "Priya", allergies: [], diets: ["vegetarian"] },
      { id: "m5", name: "Arjun", allergies: ["dairy"], diets: [] },
    ],
  },
  {
    id: "a3", holder: "Sam", isFamily: false,
    members: [{ id: "m6", name: "Sam", allergies: ["gluten"], diets: [] }],
  },
  {
    id: "a4", holder: "Dana", isFamily: false,
    members: [{ id: "m7", name: "Dana", allergies: [], diets: ["vegan"] }],
  },
];

const seedDishes = [
  { id: "d1", name: "Peanut butter sandwiches", by: "a2", price: 6, allergens: ["peanuts", "gluten"] },
  { id: "d2", name: "Garden salad", by: "a4", price: null, allergens: [] },
  { id: "d3", name: "Shrimp dumplings", by: "a3", price: 18, allergens: ["shellfish", "gluten", "soy"] },
  { id: "d4", name: "Fruit platter", by: "a1", price: null, allergens: [] },
];

export default function App() {
  const [tab, setTab] = useState("setup");
  const [accounts, setAccounts] = useState(seedAccounts);
  const [event, setEvent] = useState({
    title: "Friendsgiving at Kenneth's",
    date: "2026-06-13",
    location: "Kenneth's place",
    rsvpDeadline: "2026-06-08",
    paymentMode: "split", // "split" | "host"
  });
  // rsvps: { accountId: [memberId, ...] }
  const [rsvps, setRsvps] = useState({
    a1: ["m1", "m2", "m3"],
    a2: ["m4", "m5"],
    a3: ["m6"],
    a4: ["m7"],
  });
  const [dishes, setDishes] = useState(seedDishes);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [friends, setFriends] = useState([]);

  const hostId = "a1"; // the host's account ("You")
  const [invited, setInvited] = useState(["a2", "a3", "a4"]); // guest account ids

  // ---- derived ----
  // accounts actually part of this event = host + invited guests
  const participating = useMemo(
    () => accounts.filter((a) => a.id === hostId || invited.includes(a.id)),
    [accounts, invited]
  );

  const attendingMembers = useMemo(() => {
    const out = [];
    participating.forEach((acc) => {
      (rsvps[acc.id] || []).forEach((mid) => {
        const m = acc.members.find((x) => x.id === mid);
        if (m) out.push({ ...m, accId: acc.id, accHolder: acc.holder });
      });
    });
    return out;
  }, [participating, rsvps]);

  const partyAllergies = useMemo(() => {
    const s = new Set();
    attendingMembers.forEach((m) => m.allergies.forEach((a) => s.add(a)));
    return s;
  }, [attendingMembers]);

  // any allergy anyone typed in that isn't one of the presets
  const customAllergens = useMemo(() => {
    const s = new Set();
    accounts.forEach((a) => a.members.forEach((m) =>
      m.allergies.forEach((al) => { if (!ALLERGENS.includes(al)) s.add(al); })));
    return [...s];
  }, [accounts]);

  const headCount = attendingMembers.length;

  const me = accounts[0];

  // ---- styles ----
  const C = {
    paper: "#F4EDE0", card: "#FBF7EF", ink: "#2A2622", terra: "#C5683D",
    sage: "#6B7050", warn: "#B23A2E", gold: "#C9A24B", muted: "#8A7F6F",
  };

  const tabs = [
    { id: "setup", label: "Accounts", icon: Users },
    { id: "host", label: "Event", icon: CalendarDays },
    { id: "rsvp", label: "RSVP", icon: Check },
    { id: "list", label: "Potluck", icon: ClipboardList },
    { id: "split", label: "Split", icon: Receipt },
    { id: "after", label: "After", icon: PartyPopper },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: "'Hanken Grotesk', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        .disp { font-family: 'Fraunces', serif; }
        .chip { cursor: pointer; transition: all .15s ease; user-select: none; }
        .chip:hover { transform: translateY(-1px); }
        .tabbtn { transition: all .15s ease; }
        .card { box-shadow: 0 1px 0 rgba(0,0,0,.04), 0 8px 24px -16px rgba(42,38,34,.35); }
        input, select { font-family: inherit; }
        @keyframes pop { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform:none;} }
        .pop { animation: pop .3s ease both; }
      `}</style>

      {/* header */}
      <div style={{ borderBottom: `1px solid ${C.ink}1a`, background: C.paper, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <svg width="34" height="34" viewBox="0 0 96 96" aria-label="Count You In">
              <circle cx="48" cy="48" r="30" fill="none" stroke={C.terra} strokeWidth="6.5"/>
              <g fill={C.sage}>
                <circle cx="48" cy="9" r="4.6"/><circle cx="81" cy="29" r="4.6"/><circle cx="81" cy="67" r="4.6"/>
                <circle cx="15" cy="29" r="4.6"/><circle cx="15" cy="67" r="4.6"/>
              </g>
              <circle cx="48" cy="87" r="5.4" fill={C.gold}/>
              <path d="M35 50 a13 13 0 0 0 26 0 Z" fill={C.ink}/>
              <g stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" fill="none">
                <path d="M43 44 q-3 -4 0 -8"/><path d="M53 44 q-3 -4 0 -8"/>
              </g>
            </svg>
            <h1 className="disp" style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>
              Count<span style={{ color: C.terra }}> You</span> In
            </h1>
            <span style={{ color: C.muted, fontSize: 13, marginLeft: "auto" }}>prototype</span>
          </div>
          <p style={{ margin: "4px 0 14px 45px", color: C.muted, fontSize: 13.5 }}>
            A dietary-aware potluck planner that splits the bill fairly.
          </p>
          {/* tabs */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 0 }}>
            {tabs.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button key={t.id} className="tabbtn" onClick={() => setTab(t.id)}
                  style={{
                    border: "none", background: "transparent", cursor: "pointer",
                    padding: "8px 12px 12px", color: active ? C.ink : C.muted,
                    borderBottom: active ? `2px solid ${C.terra}` : "2px solid transparent",
                    fontWeight: active ? 700 : 500, fontSize: 14, display: "flex",
                    alignItems: "center", gap: 6, whiteSpace: "nowrap",
                  }}>
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 20px 60px" }}>
        {tab === "setup" && <SetupTab {...{ accounts, setAccounts, meId: hostId, C }} />}
        {tab === "host" && <HostTab {...{ event, setEvent, accounts, setAccounts, invited, setInvited, setRsvps, hostId, participating, C }} />}
        {tab === "rsvp" && <RsvpTab {...{ accounts: participating, rsvps, setRsvps, headCount, meId: hostId, C }} />}
        {tab === "list" && (
          <ListTab {...{ dishes, setDishes, accounts, participating, deadlinePassed, setDeadlinePassed,
            partyAllergies, attendingMembers, event, customAllergens, meId: hostId, C }} />
        )}
        {tab === "split" && <SplitTab {...{ event, dishes, accounts: participating, rsvps, attendingMembers, headCount, C }} />}
        {tab === "after" && <AfterTab {...{ event, attendingMembers, accounts, friends, setFriends, me, C }} />}
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */
function Section({ title, sub, children, C }) {
  return (
    <div className="pop" style={{ marginBottom: 18 }}>
      <h2 className="disp" style={{ fontSize: 21, fontWeight: 600, margin: "0 0 2px" }}>{title}</h2>
      {sub && <p style={{ color: C.muted, fontSize: 13.5, margin: "0 0 14px" }}>{sub}</p>}
      {children}
    </div>
  );
}
function Card({ children, C, style }) {
  return (
    <div className="card" style={{ background: C.card, border: `1px solid ${C.ink}12`, borderRadius: 14, padding: 16, ...style }}>
      {children}
    </div>
  );
}
function Tag({ text, color, bg }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, color, background: bg, padding: "3px 9px", borderRadius: 999, textTransform: "capitalize" }}>
      {text}
    </span>
  );
}

/* ---------- ACCOUNTS ---------- */
function SetupTab({ accounts, setAccounts, meId, C }) {
  const [newName, setNewName] = useState("");

  function toggle(accId, mid, field, value) {
    setAccounts((accs) => accs.map((a) => a.id !== accId ? a : {
      ...a, members: a.members.map((m) => m.id !== mid ? m : {
        ...m, [field]: m[field].includes(value) ? m[field].filter((x) => x !== value) : [...m[field], value],
      }),
    }));
  }
  function setField(accId, mid, field, value) {
    setAccounts((accs) => accs.map((a) => a.id !== accId ? a : {
      ...a, members: a.members.map((m) => m.id !== mid ? m : { ...m, [field]: value }),
    }));
  }
  function addMember() {
    if (!newName.trim()) return;
    setAccounts((accs) => accs.map((a) => a.id !== meId ? a : {
      ...a, members: [...a.members, { id: "m" + Date.now(), name: newName.trim(), age: null, allergies: [], diets: [] }],
    }));
    setNewName("");
  }
  function removeMember(accId, mid) {
    setAccounts((accs) => accs.map((a) => a.id !== accId ? a : {
      ...a, members: a.members.filter((m) => m.id !== mid),
    }));
  }

  // show the user's own family first
  const ordered = [...accounts].sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : 0));

  return (
    <Section title="Family accounts & dietary profiles" C={C}
      sub="One account can hold a whole family. You can edit your own family's details and dietary needs — other households manage their own.">
      {ordered.map((acc) => {
        const mine = acc.id === meId;
        return (
          <Card key={acc.id} C={C} style={{ marginBottom: 12, ...(mine ? { borderColor: `${C.terra}55`, boxShadow: `0 0 0 1px ${C.terra}22` } : {}) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="disp" style={{ fontWeight: 600, fontSize: 17 }}>{acc.holder}</span>
              {acc.isFamily && <Tag text="family" color={C.sage} bg={`${C.sage}1f`} />}
              {mine ? <Tag text="your family · editable" color={C.terra} bg={`${C.terra}1f`} />
                    : <Tag text="managed by them" color={C.muted} bg={`${C.ink}10`} />}
            </div>
            {acc.members.map((m) => (
              <div key={m.id} style={{ padding: "8px 0", borderTop: `1px dashed ${C.ink}14` }}>
                {mine ? (
                  <>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input value={m.name} onChange={(e) => setField(acc.id, m.id, "name", e.target.value)}
                        placeholder="Name" style={{ ...inp(C), flex: 2 }} />
                      <input value={m.age ?? ""} onChange={(e) => setField(acc.id, m.id, "age", e.target.value === "" ? null : Number(e.target.value))}
                        type="number" min="0" placeholder="Age (optional)" style={{ ...inp(C), flex: 1, minWidth: 90 }} />
                      {acc.members.length > 1 && (
                        <button onClick={() => removeMember(acc.id, m.id)} title="Remove member"
                          style={{ ...btn(C), padding: "0 11px", color: C.warn, borderColor: `${C.warn}40` }}>
                          <X size={15} />
                        </button>
                      )}
                    </div>
                    <MemberEditor acc={acc} m={m} toggle={toggle} C={C} />
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                      {m.name}{m.age != null && <span style={{ color: C.muted, fontWeight: 500 }}> · {m.age}</span>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {m.allergies.length === 0 && m.diets.length === 0 && (
                        <span style={{ color: C.muted, fontSize: 12.5 }}>no restrictions</span>
                      )}
                      {m.allergies.map((a) => <Tag key={a} text={a} color={C.warn} bg={`${C.warn}17`} />)}
                      {m.diets.map((d) => <Tag key={d} text={d} color={C.sage} bg={`${C.sage}1f`} />)}
                    </div>
                  </>
                )}
              </div>
            ))}
            {mine && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add a family member…"
                  style={inp(C)} onKeyDown={(e) => e.key === "Enter" && addMember()} />
                <button onClick={addMember} style={btn(C)}><Plus size={15} /> Add</button>
              </div>
            )}
          </Card>
        );
      })}
    </Section>
  );
}

function ChipRow({ label, options, selected, onToggle, active, C }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <span key={o} className="chip" onClick={() => onToggle(o)}
              style={{
                fontSize: 12.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999, textTransform: "capitalize",
                color: on ? "#fff" : C.ink, background: on ? active : "transparent",
                border: `1px solid ${on ? active : C.ink + "26"}`,
              }}>
              {o}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MemberEditor({ acc, m, toggle, C }) {
  const [custom, setCustom] = useState("");
  const customAllergies = m.allergies.filter((a) => !ALLERGENS.includes(a));
  function add() {
    const v = custom.trim().toLowerCase();
    setCustom("");
    if (!v || m.allergies.includes(v)) return;
    toggle(acc.id, m.id, "allergies", v);
  }
  return (
    <>
      <ChipRow label="Allergies" options={ALLERGENS} selected={m.allergies}
        onToggle={(v) => toggle(acc.id, m.id, "allergies", v)} active={C.warn} C={C} />
      {customAllergies.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {customAllergies.map((a) => (
            <span key={a} className="chip" onClick={() => toggle(acc.id, m.id, "allergies", a)}
              title="remove"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600,
                padding: "5px 9px 5px 11px", borderRadius: 999, color: "#fff", background: C.warn, textTransform: "capitalize" }}>
              {a} <X size={13} />
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={custom} onChange={(e) => setCustom(e.target.value)}
          placeholder="Other allergy not listed? e.g. mustard, kiwi, sulfites…"
          style={inp(C)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} style={btn(C)}><Plus size={15} /> Add</button>
      </div>
      <ChipRow label="Diet" options={DIETS} selected={m.diets}
        onToggle={(v) => toggle(acc.id, m.id, "diets", v)} active={C.sage} C={C} />
    </>
  );
}

/* ---------- EVENT ---------- */
function HostTab({ event, setEvent, accounts, setAccounts, invited, setInvited, setRsvps, hostId, participating, C }) {
  const set = (k, v) => setEvent((e) => ({ ...e, [k]: v }));
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const host = accounts.find((a) => a.id === hostId);
  const invitedAccounts = invited.map((id) => accounts.find((a) => a.id === id)).filter(Boolean);
  const canInviteFromContacts = accounts.filter((a) => a.id !== hostId && !invited.includes(a.id));

  function removeGuest(id) {
    setInvited((v) => v.filter((x) => x !== id));
    setRsvps((r) => ({ ...r, [id]: [] })); // drop their RSVP too
  }
  function inviteExisting(id) {
    setInvited((v) => (v.includes(id) ? v : [...v, id]));
  }
  function inviteByEmail() {
    const name = inviteName.trim();
    const contact = inviteEmail.trim();
    if (!name && !contact) return;
    const label = name || contact;
    const id = "a" + Date.now();
    setAccounts((accs) => [...accs, {
      id, holder: label, isFamily: false, pending: true, contact,
      members: [{ id: "m" + Date.now(), name: label, age: null, allergies: [], diets: [] }],
    }]);
    setInvited((v) => [...v, id]);
    setInviteName(""); setInviteEmail("");
  }

  return (
    <Section title="Host an event" sub="Set the details, choose who pays, and manage your guest list. Only you (the host) can invite or remove people." C={C}>
      <Card C={C} style={{ marginBottom: 12 }}>
        <Field label="Event name" C={C}><input value={event.title} onChange={(e) => set("title", e.target.value)} style={inp(C)} /></Field>
        <Field label="Location" C={C}><input value={event.location} onChange={(e) => set("location", e.target.value)} style={inp(C)} /></Field>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Event date" C={C}><input type="date" value={event.date} onChange={(e) => set("date", e.target.value)} style={inp(C)} /></Field>
          <Field label="RSVP deadline" C={C}><input type="date" value={event.rsvpDeadline} onChange={(e) => set("rsvpDeadline", e.target.value)} style={inp(C)} /></Field>
        </div>
        <Field label="Who pays?" C={C}>
          <div style={{ display: "flex", gap: 8 }}>
            {[["split", "Everyone splits the cost"], ["host", "I'm covering everything"]].map(([v, l]) => (
              <button key={v} onClick={() => set("paymentMode", v)}
                style={{ ...btn(C), flex: 1, justifyContent: "center",
                  background: event.paymentMode === v ? C.terra : "transparent",
                  color: event.paymentMode === v ? "#fff" : C.ink, border: `1px solid ${C.terra}` }}>
                {l}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      {/* guest list manager — host only */}
      <Card C={C}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="disp" style={{ fontWeight: 600, fontSize: 16 }}>Guest list</span>
          <Tag text="host controls" color={C.terra} bg={`${C.terra}1f`} />
          <span style={{ marginLeft: "auto", color: C.muted, fontSize: 13 }}>{invitedAccounts.length + 1} households</span>
        </div>

        {/* host row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px dashed ${C.ink}14` }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.ink, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "'Fraunces',serif" }}>
            {host?.holder?.[0] || "Y"}
          </div>
          <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{host?.holder}</div>
          <Tag text="you · host" color={C.ink} bg={`${C.ink}12`} />
        </div>

        {/* invited guests */}
        {invitedAccounts.map((acc) => (
          <div key={acc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px dashed ${C.ink}14` }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.terra, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "'Fraunces',serif" }}>
              {acc.holder[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{acc.holder}</span>
                {acc.pending && <Tag text="invite sent · not on app yet" color={C.gold} bg={`${C.gold}22`} />}
              </div>
              <div style={{ color: C.muted, fontSize: 12 }}>
                {acc.pending
                  ? (acc.contact ? `Invited via ${acc.contact}` : "Awaiting sign-up")
                  : `${acc.members.length} ${acc.members.length === 1 ? "person" : "people"}${acc.isFamily ? " · family" : ""}`}
              </div>
            </div>
            <button onClick={() => removeGuest(acc.id)} title="Remove from event"
              style={{ ...btn(C), padding: "6px 10px", color: C.warn, borderColor: `${C.warn}40` }}>
              <X size={14} /> Remove
            </button>
          </div>
        ))}

        {/* invite from contacts */}
        {canInviteFromContacts.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Invite from your contacts</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {canInviteFromContacts.map((a) => (
                <span key={a.id} className="chip" onClick={() => inviteExisting(a.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600,
                    padding: "6px 12px", borderRadius: 999, color: C.ink, background: "transparent", border: `1px solid ${C.ink}26` }}>
                  <UserPlus size={13} /> {a.holder}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* invite by email — works for people not on the app yet */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Invite someone not on the app</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Name"
              style={{ ...inp(C), flex: 1, minWidth: 110 }} onKeyDown={(e) => e.key === "Enter" && inviteByEmail()} />
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email or phone"
              style={{ ...inp(C), flex: 1.4, minWidth: 130 }} onKeyDown={(e) => e.key === "Enter" && inviteByEmail()} />
            <button onClick={inviteByEmail} style={{ ...btn(C), background: C.terra, color: "#fff", border: "none" }}>
              <Plus size={15} /> Invite
            </button>
          </div>
          <p style={{ color: C.muted, fontSize: 11.5, marginTop: 8 }}>
            They'll get a link by email or text — no account needed to RSVP. When they sign up, they fill in their own
            family, allergies, and dietary info, and their placeholder turns into a real profile.
          </p>
        </div>
      </Card>
    </Section>
  );
}
function Field({ label, children, C }) {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 5, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}

/* ---------- RSVP ---------- */
function RsvpTab({ accounts, rsvps, setRsvps, headCount, meId, C }) {
  function toggle(accId, mid) {
    if (accId !== meId) return; // you can only change your own family's RSVP
    setRsvps((r) => {
      const cur = r[accId] || [];
      return { ...r, [accId]: cur.includes(mid) ? cur.filter((x) => x !== mid) : [...cur, mid] };
    });
  }
  const ordered = [...accounts].sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : 0));
  return (
    <Section title="Who's coming?" sub="Pick which of your own family members will attend. You'll see everyone else's headcount, but only they can change theirs." C={C}>
      <Card C={C} style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, background: `${C.sage}14`, borderColor: `${C.sage}33` }}>
        <Users size={18} color={C.sage} />
        <span style={{ fontWeight: 700 }}>{headCount} attending</span>
        <span style={{ color: C.muted, fontSize: 13 }}>across {Object.values(rsvps).filter((v) => v.length).length} households</span>
      </Card>
      {ordered.map((acc) => {
        const mine = acc.id === meId;
        return (
          <Card key={acc.id} C={C} style={{ marginBottom: 10, ...(mine ? { borderColor: `${C.terra}55` } : {}) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="disp" style={{ fontWeight: 600, fontSize: 16 }}>{acc.holder}</span>
              {mine ? <Tag text="your family" color={C.terra} bg={`${C.terra}1f`} />
                    : <Tag text="their choice" color={C.muted} bg={`${C.ink}10`} />}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {acc.members.map((m) => {
                const on = (rsvps[acc.id] || []).includes(m.id);
                if (!mine) {
                  // read-only view of others' attendance
                  return on ? (
                    <span key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
                      padding: "7px 12px", borderRadius: 10, color: C.sage, background: `${C.sage}1a`, border: `1px solid ${C.sage}33` }}>
                      <Check size={14} /> {m.name}
                    </span>
                  ) : (
                    <span key={m.id} style={{ fontSize: 13, fontWeight: 500, padding: "7px 12px", borderRadius: 10,
                      color: C.muted, border: `1px dashed ${C.ink}22` }}>
                      {m.name}
                    </span>
                  );
                }
                return (
                  <span key={m.id} className="chip" onClick={() => toggle(acc.id, m.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
                      padding: "7px 12px", borderRadius: 10, color: on ? "#fff" : C.ink,
                      background: on ? C.ink : "transparent", border: `1px solid ${C.ink}26` }}>
                    {on ? <Check size={14} /> : <Plus size={14} />} {m.name}{m.age != null ? ` · ${m.age}` : ""}
                  </span>
                );
              })}
            </div>
          </Card>
        );
      })}
    </Section>
  );
}

/* ---------- POTLUCK LIST ---------- */
function ListTab({ dishes, setDishes, accounts, participating, deadlinePassed, setDeadlinePassed, partyAllergies, attendingMembers, event, customAllergens = [], meId, C }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [allergens, setAllergens] = useState([]);
  const [by, setBy] = useState("a1");

  const scanned = useMemo(() => scanAllergens(name), [name]);
  const effectiveAllergens = [...new Set([...allergens, ...scanned])];

  const conflicts = effectiveAllergens.filter((a) => partyAllergies.has(a));
  const affected = attendingMembers.filter((m) => m.allergies.some((a) => effectiveAllergens.includes(a)));

  function addDish() {
    if (!name.trim()) return; // price is optional — bringers add it after they shop
    setDishes((d) => [...d, {
      id: "d" + Date.now(), name: name.trim(), by,
      price: price === "" ? null : Number(price), allergens: effectiveAllergens,
    }]);
    setName(""); setPrice(""); setAllergens([]);
  }

  function updatePrice(id, value) {
    setDishes((d) => d.map((x) => (x.id === id && x.by === meId)
      ? { ...x, price: value === "" ? null : Number(value) } : x));
  }

  if (!deadlinePassed) {
    return (
      <Section title="Potluck list" C={C} sub="">
        <Card C={C} style={{ textAlign: "center", padding: "34px 20px" }}>
          <Lock size={30} color={C.muted} />
          <h3 className="disp" style={{ fontSize: 19, margin: "12px 0 4px" }}>Locked until RSVPs close</h3>
          <p style={{ color: C.muted, fontSize: 13.5, maxWidth: 360, margin: "0 auto 18px" }}>
            Dishes can be claimed only after the RSVP deadline ({event.rsvpDeadline}). This keeps the head count and
            allergy profile final before anyone commits to bringing something.
          </p>
          <button onClick={() => setDeadlinePassed(true)} style={{ ...btn(C), margin: "0 auto", background: C.terra, color: "#fff", border: "none" }}>
            <Unlock size={15} /> Simulate: deadline passed
          </button>
        </Card>
      </Section>
    );
  }

  return (
    <Section title="Who's bringing what" sub="Claim a dish so nobody doubles up. The app scans for allergens and warns you if a guest can't eat it." C={C}>
      {/* existing dishes */}
      {dishes.map((d) => {
        const acc = accounts.find((a) => a.id === d.by);
        const dup = dishes.filter((x) => x.name.toLowerCase().trim() === d.name.toLowerCase().trim()).length > 1;
        const dishAffected = attendingMembers.filter((m) => m.allergies.some((a) => d.allergens.includes(a)));
        return (
          <Card key={d.id} C={C} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</span>
              <span style={{ color: C.muted, fontSize: 13 }}>· {acc?.holder}</span>
              {d.by === meId ? (
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontWeight: 700, color: d.price == null ? C.muted : C.sage }}>$</span>
                  <input type="number" min="0" step="0.01" value={d.price ?? ""} placeholder="—"
                    onChange={(e) => updatePrice(d.id, e.target.value)} title="Your dish — add the cost once you've bought it"
                    style={{ width: 62, padding: "5px 7px", borderRadius: 8, border: `1px solid ${C.ink}26`,
                      background: "#fff", fontSize: 13.5, fontWeight: 700, textAlign: "right",
                      color: d.price == null ? C.muted : C.sage }} />
                </div>
              ) : (
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
                  color: d.price == null ? C.muted : C.sage }} title={`Only ${acc?.holder} can set this price`}>
                  <Lock size={12} />
                  <span style={{ fontWeight: 700 }}>{d.price == null ? "—" : `$${d.price.toFixed(2)}`}</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {d.price == null && <Tag text="price pending" color={C.gold} bg={`${C.gold}22`} />}
              {d.allergens.length === 0
                ? <Tag text="allergen-free*" color={C.sage} bg={`${C.sage}1f`} />
                : d.allergens.map((a) => <Tag key={a} text={a} color={C.warn} bg={`${C.warn}17`} />)}
            </div>
            {dup && (
              <Banner C={C} color={C.gold} icon={AlertTriangle}>Someone else already claimed “{d.name}.” Consider bringing something different.</Banner>
            )}
            {dishAffected.length > 0 && (
              <Banner C={C} color={C.warn} icon={AlertTriangle}>
                <b>{dishAffected.map((m) => m.name).join(", ")}</b> {dishAffected.length === 1 ? "is" : "are"} allergic to{" "}
                <b>{d.allergens.filter((a) => dishAffected.some((m) => m.allergies.includes(a))).join(", ")}</b>. Please reconsider or label it clearly.
              </Banner>
            )}
          </Card>
        );
      })}

      {/* add dish */}
      <Card C={C} style={{ marginTop: 14, borderStyle: "dashed" }}>
        <div className="disp" style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>Claim a dish</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. peanut butter sandwiches" style={{ ...inp(C), flex: 2, minWidth: 180 }} />
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="$ cost (optional)" style={{ ...inp(C), flex: 1, minWidth: 90 }} />
        </div>
        <select value={by} onChange={(e) => setBy(e.target.value)} style={{ ...inp(C), marginBottom: 10 }}>
          {(participating || accounts).map((a) => <option key={a.id} value={a.id}>Brought by {a.holder}</option>)}
        </select>
        <ChipRow label="Contains (auto-detected, tap to adjust)" options={[...ALLERGENS, ...customAllergens]}
          selected={effectiveAllergens} onToggle={(v) => setAllergens((s) => effectiveAllergens.includes(v) ? effectiveAllergens.filter((x) => x !== v) : [...s, v])}
          active={C.warn} C={C} />
        {conflicts.length > 0 && (
          <Banner C={C} color={C.warn} icon={AlertTriangle}>
            Heads up — this would contain <b>{conflicts.join(", ")}</b>, which{" "}
            <b>{affected.map((m) => m.name).join(", ")}</b> can't eat. You may want to bring something else.
          </Banner>
        )}
        <button onClick={addDish} style={{ ...btn(C), marginTop: 10, background: C.ink, color: "#fff", border: "none" }}>
          <Plus size={15} /> Add to the list
        </button>
      </Card>
      <p style={{ color: C.muted, fontSize: 11.5, marginTop: 12, lineHeight: 1.5 }}>
        Don't know the cost yet? Leave it blank and tap the price field on your dish to fill it in once you've shopped — the split updates on its own.
        <br />*Allergen detection is an aid, not a guarantee of safety. Anyone with a severe allergy should confirm ingredients
        directly with whoever prepared the dish.
      </p>
    </Section>
  );
}

function Banner({ children, color, icon: Icon, C }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: `${color}14`, border: `1px solid ${color}40`,
      borderRadius: 10, padding: "9px 11px", marginTop: 10, fontSize: 13, lineHeight: 1.45 }}>
      <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

/* ---------- SPLIT ---------- */
function SplitTab({ event, dishes, accounts, rsvps, attendingMembers, headCount, C }) {
  const priced = dishes.filter((d) => d.price != null);
  const pendingCount = dishes.length - priced.length;
  const total = priced.reduce((s, d) => s + d.price, 0);
  const share = headCount ? total / headCount : 0;

  const PendingNote = pendingCount > 0 ? (
    <Banner C={C} color={C.gold} icon={AlertTriangle}>
      {pendingCount} {pendingCount === 1 ? "dish doesn't" : "dishes don't"} have a price yet, so this is <b>provisional</b> —
      it'll finalize once everyone enters what they spent.
    </Banner>
  ) : null;

  if (event.paymentMode === "host") {
    return (
      <Section title="The bill" C={C}>
        <Card C={C} style={{ textAlign: "center", padding: 28 }}>
          <Heart size={26} color={C.terra} />
          <h3 className="disp" style={{ fontSize: 19, margin: "10px 0 4px" }}>The host is covering everything</h3>
          <p style={{ color: C.muted, fontSize: 14 }}>Total spend so far: <b>${total.toFixed(2)}</b>. Nobody owes anything.</p>
        </Card>
        {PendingNote}
      </Section>
    );
  }

  // per-account settle up: share * (its attending heads) - what it contributed (priced dishes only)
  const rows = accounts.map((acc) => {
    const heads = (rsvps[acc.id] || []).length;
    if (heads === 0) return null;
    const contributed = priced.filter((d) => d.by === acc.id).reduce((s, d) => s + d.price, 0);
    const owes = share * heads - contributed;
    return { holder: acc.holder, heads, contributed, owes };
  }).filter(Boolean);

  // greedy debt simplification → fewest payments that clear everyone
  const settlement = (() => {
    const debtors = rows.filter((r) => r.owes > 0.005).map((r) => ({ name: r.holder, amt: r.owes }))
      .sort((a, b) => b.amt - a.amt);
    const creditors = rows.filter((r) => r.owes < -0.005).map((r) => ({ name: r.holder, amt: -r.owes }))
      .sort((a, b) => b.amt - a.amt);
    const tx = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      const rounded = Math.round(pay * 100) / 100;
      if (rounded > 0) tx.push({ from: debtors[i].name, to: creditors[j].name, amt: rounded });
      debtors[i].amt -= pay; creditors[j].amt -= pay;
      if (debtors[i].amt <= 0.005) i++;
      if (creditors[j].amt <= 0.005) j++;
    }
    return tx;
  })();

  return (
    <Section title="Split the cost fairly" sub="Total cost ÷ everyone attending = each person's fair share. Then we credit you back for whatever you brought." C={C}>
      {PendingNote}
      <Card C={C} style={{ marginBottom: 14, marginTop: pendingCount > 0 ? 10 : 0, display: "flex", justifyContent: "space-around", textAlign: "center", flexWrap: "wrap", gap: 12 }}>
        <Stat label={pendingCount > 0 ? "Cost so far" : "Total food cost"} value={`$${total.toFixed(2)}`} C={C} />
        <Stat label="Attending" value={headCount} C={C} />
        <Stat label="Fair share / person" value={`$${share.toFixed(2)}`} C={C} accent />
      </Card>
      {rows.map((r) => (
        <Card key={r.holder} C={C} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{r.holder}</div>
            <div style={{ color: C.muted, fontSize: 12.5 }}>
              {r.heads} {r.heads === 1 ? "head" : "heads"} · brought ${r.contributed.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {r.owes > 0.005 ? (
              <span style={{ fontWeight: 800, color: C.warn }}>owes ${r.owes.toFixed(2)}</span>
            ) : r.owes < -0.005 ? (
              <span style={{ fontWeight: 800, color: C.sage }}>gets back ${Math.abs(r.owes).toFixed(2)}</span>
            ) : (
              <span style={{ fontWeight: 800, color: C.muted }}>even</span>
            )}
          </div>
        </Card>
      ))}
      {settlement.length > 0 && (
        <Card C={C} style={{ marginTop: 6, background: `${C.terra}0e`, borderColor: `${C.terra}33` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Receipt size={16} color={C.terra} />
            <span className="disp" style={{ fontWeight: 600, fontSize: 16 }}>Settle up{pendingCount > 0 ? " (so far)" : ""}</span>
            <span style={{ marginLeft: "auto", color: C.muted, fontSize: 12.5 }}>{settlement.length} payment{settlement.length > 1 ? "s" : ""}</span>
          </div>
          {settlement.map((t, k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px dashed ${C.ink}14` }}>
              <span style={{ fontWeight: 700 }}>{t.from}</span>
              <ArrowRight size={15} color={C.muted} />
              <span style={{ fontWeight: 700 }}>{t.to}</span>
              <span style={{ marginLeft: "auto", fontWeight: 800, color: C.terra }}>${t.amt.toFixed(2)}</span>
            </div>
          ))}
          <p style={{ color: C.muted, fontSize: 11.5, marginTop: 10 }}>
            The fewest payments that settle everyone up — paid to whoever fronted more than their share. Rounded to the nearest cent.
          </p>
        </Card>
      )}
      <p style={{ color: C.muted, fontSize: 11.5, marginTop: 10 }}>
        Family accounts are charged per attending head, since everyone eats. Balances always sum to zero.
      </p>
    </Section>
  );
}
function Stat({ label, value, C, accent }) {
  return (
    <div>
      <div className="disp" style={{ fontSize: 24, fontWeight: 900, color: accent ? C.terra : C.ink }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

/* ---------- AFTER ---------- */
function AfterTab({ event, attendingMembers, accounts, friends, setFriends, me, C }) {
  // distinct attending accounts other than me
  const guestAccounts = accounts.filter((a) => a.id !== me.id && attendingMembers.some((m) => m.accId === a.id));
  function toggleFriend(id) {
    setFriends((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  }
  return (
    <Section title="After the party" sub="Once it's over, only the date and the people who came remain. Add anyone as a friend to invite them again." C={C}>
      <Card C={C} style={{ marginBottom: 14, background: `${C.gold}14`, borderColor: `${C.gold}40` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PartyPopper size={18} color={C.gold} />
          <span className="disp" style={{ fontSize: 17, fontWeight: 600 }}>{event.title}</span>
        </div>
        <div style={{ color: C.muted, fontSize: 13.5, marginTop: 4 }}>Happened on {event.date} · {attendingMembers.length} guests attended</div>
      </Card>

      <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Attendees</div>
      {guestAccounts.map((acc) => {
        const isFriend = friends.includes(acc.id);
        const names = attendingMembers.filter((m) => m.accId === acc.id).map((m) => m.name).join(", ");
        return (
          <Card key={acc.id} C={C} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.terra, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "'Fraunces',serif" }}>
              {acc.holder[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{acc.holder}</div>
              <div style={{ color: C.muted, fontSize: 12.5 }}>{names}</div>
            </div>
            <button onClick={() => toggleFriend(acc.id)}
              style={{ ...btn(C), background: isFriend ? C.sage : "transparent", color: isFriend ? "#fff" : C.ink,
                border: `1px solid ${isFriend ? C.sage : C.ink + "33"}` }}>
              {isFriend ? <><Check size={14} /> Friend</> : <><UserPlus size={14} /> Add</>}
            </button>
          </Card>
        );
      })}
      {friends.length > 0 && (
        <p style={{ color: C.sage, fontSize: 13, marginTop: 12, fontWeight: 600 }}>
          <Heart size={13} style={{ verticalAlign: "middle" }} /> {friends.length} friend{friends.length > 1 ? "s" : ""} saved for next time.
        </p>
      )}
    </Section>
  );
}

/* ---------- tiny style helpers ---------- */
function inp(C) {
  return { width: "100%", padding: "9px 11px", borderRadius: 10, border: `1px solid ${C.ink}26`,
    background: "#fff", fontSize: 14, color: C.ink, outline: "none" };
}
function btn(C) {
  return { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10,
    border: `1px solid ${C.ink}26`, background: "transparent", color: C.ink, fontWeight: 700, fontSize: 13.5, cursor: "pointer" };
}
