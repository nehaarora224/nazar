// Composes the bait email. The body comes from an approved template (sent by the app); the server
// adds the authorized-exercise link and a mandatory footer. No brand names, no logos, no sender
// spoofing, and the link never asks for a password, OTP, or any other credential.

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function composeEmail(opts: { subject: string; body: string; linkUrl: string }): { subject: string; html: string; text: string } {
  const bodyHtml = esc(opts.body).replace(/\n/g, '<br>');
  const url = esc(opts.linkUrl);

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1f1c2e;max-width:520px;margin:0 auto;padding:24px;line-height:1.5">
<p>${bodyHtml}</p>
<p style="margin:24px 0"><a href="${url}" style="background:#4b3ad6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block">Open the link</a></p>
<p style="font-size:12px;color:#6b6780">Or paste this address into your browser:<br>${url}</p>
<hr style="border:none;border-top:1px solid #e7e4f0;margin:24px 0">
<p style="font-size:12px;color:#6b6780">This is an authorized security-awareness exercise sent with Nazar at the request of the mailbox owner. It is not a real account notice. You will never be asked for a password, verification code, or payment. Opening the link only records that it was opened, so the test's owner can review it with you.</p>
</body></html>`;

  const text = `${opts.body}

Open the link:
${opts.linkUrl}

---
This is an authorized security-awareness exercise sent with Nazar at the request of the mailbox owner. It is not a real account notice. You will never be asked for a password, verification code, or payment. Opening the link only records that it was opened.`;

  return { subject: opts.subject, html, text };
}
