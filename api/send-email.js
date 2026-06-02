// ============================================================
//  /api/send-email.js  —  Vercel serverless function
//  Sends email via Resend. The secret API key lives in Vercel's
//  environment variables (NEVER in the app code the browser sees).
//
//  Put this file in an  /api  folder at your project root
//  (i.e.  countyouin/api/send-email.js ).
// ============================================================

export default async function handler(req, res) {
  // only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: "Email is not configured yet." });
  }

  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing to, subject, or html." });
    }

    // The "from" address. Until countyouin.com is verified with Resend,
    // use their shared test sender. After you verify the domain, switch
    // this to something like:  Count You In <hello@countyouin.com>
    const FROM = process.env.EMAIL_FROM || "Count You In <onboarding@resend.dev>";

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.message || "Send failed", details: data });
    }
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
