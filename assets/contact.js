// 問い合わせフォーム。サーバー（/api/contact/config）が受付を有効にしているときだけ表示する。
// 取得に失敗したとき・無効のときは「受付の方法を準備しています」のまま。
(async () => {
  const form = document.getElementById("guide-contact");
  const status = document.getElementById("contact-status");
  const pending = document.getElementById("contact-pending");
  if (!form || !status) return;
  const base = new URL("../", document.currentScript ? document.currentScript.src : location.href);
  let config;
  try {
    const r = await fetch(new URL("api/contact/config", base), { cache: "no-store" });
    config = r.ok ? await r.json() : null;
  } catch { return; }
  if (!config || !config.enabled || !config.sitekey) return;

  try {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.append(s);
    });
  } catch { return; } // 認証が読み込めなければ表示しない

  let token = "";
  form.hidden = false;
  if (pending) pending.hidden = true;
  const widget = window.turnstile.render("#contact-challenge", {
    sitekey: config.sitekey,
    action: "contact",
    language: "ja",
    callback: t => { token = t; },
    "expired-callback": () => { token = ""; },
    "error-callback": () => { token = ""; }
  });
  const submit = form.querySelector('button[type="submit"]');
  const say = (text, ok) => { status.textContent = text; status.style.color = ok ? "var(--t3)" : "var(--t1)"; };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = form.elements.message.value.trim();
    const email = form.elements.email.value.trim();
    if (!message) { say("内容を書いてください。"); form.elements.message.focus(); return; }
    if (email && !form.elements.email.checkValidity()) { say("メールアドレスの形式を確認してください。"); form.elements.email.focus(); return; }
    if (!token) { say("「確認」が終わるまでお待ちください。"); return; }
    submit.disabled = true;
    say("送信しています…", true);
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.token = token;
    try {
      const reply = await fetch(new URL("api/contact", base), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await reply.json().catch(() => ({}));
      if (reply.ok && result.ok) {
        form.reset();
        say("送信しました。ありがとうございました。", true);
      } else {
        say(result.error || "送信できませんでした。時間をおいてお試しください。");
      }
    } catch {
      say("通信に失敗しました。電波の良い場所でもう一度お試しください。");
    }
    token = "";
    try { window.turnstile.reset(widget); } catch {}
    submit.disabled = false;
  });
})();
