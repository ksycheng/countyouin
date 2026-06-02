// ============================================================
//  emailClient.js  —  tiny helper to send emails from the app
//  Put this file in your project's  src/  folder.
//
//  It calls our /api/send-email serverless function. If email
//  isn't set up yet (no key on the server), it fails quietly so
//  the app never breaks — sending email is a "nice to have", not
//  something that should block the user.
// ============================================================

async function send(to, subject, html) {
  try {
    const r = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
    if (!r.ok) {
      console.warn("Email not sent:", (await r.json())?.error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Email error:", e);
    return false;
  }
}

// shared simple styling wrapper
function wrap(inner) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #2A2622;">
    <div style="font-size: 22px; font-weight: 800; margin-bottom: 6px;">Count<span style="color:#C5683D;"> You</span> In</div>
    <div style="height:1px; background:#2A262218; margin: 8px 0 18px;"></div>
    ${inner}
    <div style="height:1px; background:#2A262218; margin: 22px 0 12px;"></div>
    <div style="font-size: 12px; color: #8A7F6F;">Count You In · plan the potluck, split it fairly.</div>
  </div>`;
}

export function sendWelcomeEmail(to) {
  const html = wrap(`
    <h1 style="font-size:20px; margin:0 0 12px;">Welcome! 🎉</h1>
    <p style="line-height:1.55; font-size:14.5px;">
      Welcome to <b>Count You In</b> — the easy way to plan a get-together without the usual headaches.
    </p>
    <p style="line-height:1.55; font-size:14.5px;">Here's what you can do:</p>
    <ul style="line-height:1.6; font-size:14px; padding-left:18px;">
      <li><b>Plan a gathering</b> and invite people with a single shareable link.</li>
      <li><b>Keep everyone safe</b> — list allergies & diets, and get warned if a dish doesn't suit someone coming.</li>
      <li><b>Split the cost fairly</b> — see exactly who owes whom, or treat everyone with one tap.</li>
      <li><b>Make friends</b> — add the people you meet so they're easy to invite again.</li>
    </ul>
    <p style="line-height:1.55; font-size:14.5px;">To start, add your family and create your first event — or accept an invite.</p>
    <p style="line-height:1.55; font-size:14.5px;">Happy gathering!</p>
  `);
  return send(to, "Welcome to Count You In 🎉", html);
}

export function sendCancellationEmail(to, eventTitle, eventDate) {
  const html = wrap(`
    <h1 style="font-size:20px; margin:0 0 12px;">A gathering was cancelled</h1>
    <p style="line-height:1.55; font-size:14.5px;">
      We're sorry to share that <b>${eventTitle}</b>${eventDate ? `, planned for ${eventDate},` : ""} has been
      <b>cancelled by the host</b>.
    </p>
    <p style="line-height:1.55; font-size:14.5px;">No action is needed. We hope to see you at the next one!</p>
  `);
  return send(to, `${eventTitle} has been cancelled`, html);
}
