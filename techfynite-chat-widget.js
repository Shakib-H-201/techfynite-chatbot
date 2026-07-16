/**
 * Techfynite AI - Product Consultant Widget
 * ------------------------------------------------------------------
 * Drop-in floating chat widget for the Techfynite website (Framer).
 * Premium "AI Product Consultant" experience: rich welcome screen with
 * feature tags + category cards + popular questions, no sticky CTAs
 * (links appear contextually inside replies), suggested-reply chips,
 * and lightly formatted (bold/bullets) messages.
 *
 * USAGE (paste into Framer > Site Settings > Custom Code > End of <body>):
 *
 *   <script
 *     src="https://YOUR-CDN-OR-HOST/techfynite-chat-widget.js"
 *     data-api-url="https://your-backend-url.up.railway.app"
 *     data-position="bottom-right"
 *     data-primary-color="#2563eb"
 *     data-dark-color="#0f172a"
 *     data-book-call-url="https://calendly.com/shakib201/30min"
 *     data-contact-url="https://www.techfynite.com/contact-us"
 *   ></script>
 *
 * Every data-* attribute above is optional - remove any you don't want
 * to override and the widget falls back to the Techfynite defaults.
 *
 * Everything is scoped inside a Shadow DOM so it can never break, or be
 * broken by, Framer's own CSS.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  // ---- Config -----------------------------------------------------------
  var currentScript = document.currentScript;
  function cfg(attr, fallbackKey, defaultValue) {
    return (
      (currentScript && currentScript.getAttribute(attr)) ||
      (window.TechFyniteChatConfig && window.TechFyniteChatConfig[fallbackKey]) ||
      defaultValue
    );
  }

  var API_URL = cfg("data-api-url", "apiUrl", "https://techfynite-chatbot.onrender.com");
  var POSITION = cfg("data-position", "position", "bottom-right"); // "bottom-right" | "bottom-left"
  var PRIMARY = cfg("data-primary-color", "primaryColor", "#2563eb");
  var PRIMARY_DARK = cfg("data-primary-dark", "primaryColorDark", "#1d4ed8");
  var DARK = cfg("data-dark-color", "darkColor", "#0f172a");
  var DARK_2 = cfg("data-dark-color-2", "darkColor2", "#0b1220");
  var BOOK_CALL_URL = cfg("data-book-call-url", "bookCallUrl", "https://calendly.com/shakib201/30min");
  var CONTACT_URL = cfg("data-contact-url", "contactUrl", "https://www.techfynite.com/contact-us");
  var ASSISTANT_NAME = cfg("data-assistant-name", "assistantName", "Maya");
  var ASSISTANT_ROLE = cfg("data-assistant-role", "assistantRole", "Product Consultant at Techfynite");
  // Optional: once you have a real illustrated/photo avatar hosted somewhere,
  // set data-avatar-url="https://.../maya.png" and it replaces the icon below
  // automatically - no other code changes needed.
  var AVATAR_URL = cfg("data-avatar-url", "avatarUrl", "");
  // Optional: your real Techfynite logo image, replacing the "TF" square
  // in the header once you have one hosted somewhere.
  var LOGO_URL = cfg("data-logo-url", "logoUrl", "");

  var isLeft = POSITION === "bottom-left";
  var STORAGE_KEY = "techfynite_chat_history_v1";

  // ---- Host element + Shadow DOM ----------------------------------------
  var host = document.createElement("div");
  host.id = "techfynite-chat-widget-host";
  host.style.position = "relative";
  host.style.zIndex = "2147483000";
  // Critical for Lenis (and similar smooth-scroll libraries): they check
  // event.target.closest('[data-lenis-prevent]') from a listener OUTSIDE
  // this component. Because wheel/touch events that cross a Shadow DOM
  // boundary get "retargeted" to the shadow host for any listener outside
  // the shadow tree, the exclusion attribute must live here - on the real
  // host element - not on anything inside the shadow root, or Lenis will
  // never see it and will keep hijacking scroll over the widget.
  host.setAttribute("data-lenis-prevent", "");
  host.setAttribute("data-lenis-prevent-wheel", "");
  host.setAttribute("data-lenis-prevent-touch", "");
  // Appending to <body> (the standard place). An earlier version of this
  // widget appended to <html> instead, to try to escape a potentially
  // transformed wrapper - but that turned out to cause mobile viewport
  // sizing/positioning bugs (appending outside <body> is non-standard and
  // some mobile browsers miscompute position:fixed for it). The real fix
  // for the scroll-hijacking issue was the data-lenis-prevent attribute
  // above, so we can safely use the standard <body> attachment here.
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  var side = isLeft ? "left" : "right";
  var otherSide = isLeft ? "right" : "left";

  // ---- Small inline icon library (stroke-based, 24x24 viewBox) -------------
  var ICONS = {
    rocket:
      '<path d="M12 3c2.5 1.7 4 4.6 4 8 0 2-.5 3.6-1.2 5H9.2C8.5 14.6 8 13 8 11c0-3.4 1.5-6.3 4-8Z" fill="currentColor" fill-opacity=".16"/>' +
      '<path d="M12 3c2.5 1.7 4 4.6 4 8 0 2-.5 3.6-1.2 5H9.2C8.5 14.6 8 13 8 11c0-3.4 1.5-6.3 4-8Z"/>' +
      '<circle cx="12" cy="10" r="1.7" fill="currentColor" fill-opacity=".9"/>' +
      '<path d="M9 16l-2 3M15 16l2 3M10.3 19.2h3.4"/>',
    bot:
      '<rect x="5" y="8" width="14" height="11" rx="3.4" fill="currentColor" fill-opacity=".14"/>' +
      '<rect x="5" y="8" width="14" height="11" rx="3.4"/><path d="M12 8V4M9.3 4h5.4"/>' +
      '<circle cx="9.6" cy="13.6" r="1.3" fill="currentColor" stroke="none"/>' +
      '<circle cx="14.4" cy="13.6" r="1.3" fill="currentColor" stroke="none"/>',
    globe:
      '<circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity=".14"/>' +
      '<circle cx="12" cy="12" r="8"/><path d="M4.3 12h15.4M12 4c2.6 2.3 2.6 13.7 0 16M12 4c-2.6 2.3-2.6 13.7 0 16"/>',
    brush:
      '<path d="M15.5 4.5c1.4-1.4 3.6-1.4 5 0s1.4 3.6 0 5L12 18l-5 1 1-5 7.5-9.5Z" fill="currentColor" fill-opacity=".16"/>' +
      '<path d="M15.5 4.5c1.4-1.4 3.6-1.4 5 0s1.4 3.6 0 5L12 18l-5 1 1-5 7.5-9.5Z"/>' +
      '<path d="M8 19c-1 1-2.5 1.3-4 .8.5-1.5.8-3 1.8-4"/>',
    phone:
      '<rect x="7" y="3" width="10" height="18" rx="2.4" fill="currentColor" fill-opacity=".14"/>' +
      '<rect x="7" y="3" width="10" height="18" rx="2.4"/>' +
      '<circle cx="12" cy="18.1" r="1" fill="currentColor" stroke="none"/>',
    calculator:
      '<rect x="5" y="3" width="14" height="18" rx="2.4" fill="currentColor" fill-opacity=".14"/>' +
      '<rect x="5" y="3" width="14" height="18" rx="2.4"/><path d="M8 7h8"/>' +
      '<circle cx="8" cy="11.3" r=".9" fill="currentColor" stroke="none"/>' +
      '<circle cx="12" cy="11.3" r=".9" fill="currentColor" stroke="none"/>' +
      '<circle cx="16" cy="11.3" r=".9" fill="currentColor" stroke="none"/>' +
      '<circle cx="8" cy="15.3" r=".9" fill="currentColor" stroke="none"/>' +
      '<circle cx="12" cy="15.3" r=".9" fill="currentColor" stroke="none"/>' +
      '<circle cx="16" cy="15.3" r=".9" fill="currentColor" stroke="none"/>' +
      '<circle cx="8" cy="19.1" r=".9" fill="currentColor" stroke="none"/>' +
      '<circle cx="12" cy="19.1" r=".9" fill="currentColor" stroke="none"/>' +
      '<circle cx="16" cy="19.1" r=".9" fill="currentColor" stroke="none"/>',
    sparkle:
      '<path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z"/><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/>',
    chart:
      '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users:
      '<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15 14.2c2.7.4 5 2.3 5 4.8"/>',
    lock:
      '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    paperclip:
      '<path d="M8 12l6.5-6.5a3 3 0 014.2 4.2L11 17.4a5 5 0 01-7-7L12.5 2"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    dots: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  };

  function icon(name, extraAttrs) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" ' + (extraAttrs || "") + ">" +
      (ICONS[name] || "") +
      "</svg>"
    );
  }

  var styleTag = document.createElement("style");
  styleTag.textContent = [
    ":host, *{box-sizing:border-box;}",
    ".tf-root{position:fixed;bottom:24px;" + side + ":24px;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;}",

    /* Launcher button */
    ".tf-launcher{position:relative;width:60px;height:60px;border-radius:18px;border:none;cursor:pointer;",
    "background:linear-gradient(135deg," + PRIMARY + "," + PRIMARY_DARK + ");box-shadow:0 8px 24px " + PRIMARY + "55;display:flex;align-items:center;justify-content:center;",
    "transition:transform .18s ease, box-shadow .18s ease;}",
    ".tf-launcher:hover{transform:translateY(-2px);box-shadow:0 12px 28px " + PRIMARY + "66;}",
    ".tf-launcher svg{width:24px;height:24px;}",
    ".tf-pulse-ring{position:absolute;inset:-6px;border-radius:22px;border:2px solid #60a5fa;opacity:0;animation:tf-pulse 2.6s ease-out infinite;}",
    "@keyframes tf-pulse{0%{opacity:.55;transform:scale(.92);}70%{opacity:0;transform:scale(1.12);}100%{opacity:0;transform:scale(1.12);}}",

    /* Panel */
    ".tf-panel{position:absolute;bottom:76px;" + side + ":0;width:396px;max-width:calc(100vw - 32px);height:620px;max-height:calc(100vh - 120px);",
    "background:#ffffff;border-radius:22px;box-shadow:0 24px 60px rgba(15,23,42,0.28);display:flex;flex-direction:column;overflow:hidden;overscroll-behavior:contain;",
    "opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease, transform .18s ease;}",
    ".tf-panel.tf-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}",
    ".tf-panel.tf-minimized .tf-messages, .tf-panel.tf-minimized .tf-inputbar, .tf-panel.tf-minimized .tf-footer-note{display:none;}",
    ".tf-panel.tf-minimized{height:auto;}",

    /* Header */
    ".tf-header{position:relative;background:" + DARK_2 + ";color:#f5f5f7;padding:18px 18px 20px;display:flex;align-items:flex-start;gap:11px;flex-shrink:0;overflow:hidden;}",
    ".tf-header::after{content:'';position:absolute;top:-30px;right:-30px;width:140px;height:140px;border-radius:50%;",
    "background:radial-gradient(circle," + PRIMARY + "55,transparent 70%);pointer-events:none;}",
    ".tf-avatar{position:relative;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg," + PRIMARY + "," + PRIMARY_DARK + ");",
    "display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;color:#fff;z-index:1;overflow:hidden;}",
    ".tf-avatar img{width:100%;height:100%;object-fit:cover;display:block;}",
    ".tf-avatar-badge{position:absolute;bottom:-2px;right:-2px;width:11px;height:11px;border-radius:50%;background:#34d399;border:2px solid " + DARK_2 + ";}",
    ".tf-header-text{line-height:1.3;flex:1;min-width:0;z-index:1;}",
    ".tf-header-title-row{display:flex;align-items:center;gap:7px;}",
    ".tf-header-title{font-size:15px;font-weight:650;margin:0;letter-spacing:-.01em;}",
    ".tf-ai-badge{font-size:9.5px;font-weight:700;letter-spacing:.03em;background:rgba(96,165,250,.18);color:#93c5fd;",
    "border:1px solid rgba(147,197,253,.35);padding:1.5px 6px;border-radius:6px;}",
    ".tf-header-sub{font-size:11.5px;color:#93a0c2;margin:2px 0 0 0;}",
    ".tf-status{font-size:11px;color:#7c89ab;display:flex;align-items:center;gap:5px;margin-top:5px;}",
    ".tf-dot{width:6px;height:6px;border-radius:50%;background:#34d399;box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:tf-dot 2s infinite;flex-shrink:0;}",
    "@keyframes tf-dot{0%{box-shadow:0 0 0 0 rgba(52,211,153,.55);}70%{box-shadow:0 0 0 6px rgba(52,211,153,0);}100%{box-shadow:0 0 0 0 rgba(52,211,153,0);}}",
    ".tf-header-actions{display:flex;align-items:center;gap:2px;z-index:1;flex-shrink:0;}",
    ".tf-icon-btn{background:none;border:none;color:#93a0c2;cursor:pointer;padding:5px;border-radius:8px;display:flex;flex-shrink:0;}",
    ".tf-icon-btn svg{width:16px;height:16px;}",
    ".tf-icon-btn:hover{background:rgba(255,255,255,.08);color:#fff;}",
    ".tf-menu{position:absolute;top:52px;right:16px;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,.2);",
    "padding:6px;display:none;z-index:5;min-width:180px;}",
    ".tf-menu.tf-menu-open{display:block;}",
    ".tf-menu-item{display:block;width:100%;text-align:left;background:none;border:none;padding:9px 11px;border-radius:8px;",
    "font-size:12.5px;color:#20222e;cursor:pointer;}",
    ".tf-menu-item:hover{background:#f3f4f8;}",

    /* Messages */
    ".tf-messages{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding:18px 16px;display:flex;flex-direction:column;gap:12px;background:#fafafc;}",
    ".tf-messages::-webkit-scrollbar{width:6px;}",
    ".tf-messages::-webkit-scrollbar-thumb{background:#d9dae3;border-radius:10px;}",
    ".tf-msg{max-width:86%;padding:11px 14px;border-radius:16px;font-size:13.5px;line-height:1.55;word-wrap:break-word;}",
    ".tf-msg p{margin:0 0 8px 0;}",
    ".tf-msg p:last-child{margin-bottom:0;}",
    ".tf-msg ul{margin:6px 0;padding-left:18px;}",
    ".tf-msg li{margin:3px 0;}",
    ".tf-msg strong{font-weight:650;}",
    ".tf-msg-user{align-self:flex-end;background:" + PRIMARY + ";color:#fff;border-bottom-right-radius:5px;}",
    ".tf-msg-bot{position:relative;align-self:flex-start;background:#fff;color:#20222e;border:1px solid #ecedf3;border-bottom-left-radius:5px;box-shadow:0 1px 2px rgba(15,23,42,.04);}",
    ".tf-msg-block .tf-msg-bot::after{content:'';position:absolute;left:9px;bottom:-5px;width:10px;height:10px;",
    "background:#fff;border-right:1px solid #ecedf3;border-bottom:1px solid #ecedf3;transform:rotate(45deg);border-radius:0 0 2px 0;}",

    /* Assistant message row: small avatar + bubble + name/role caption */
    ".tf-msg-block{display:flex;flex-direction:column;gap:6px;align-self:flex-start;max-width:92%;}",
    ".tf-msg-block .tf-msg-bot{max-width:100%;}",
    ".tf-msg-attribution{display:flex;align-items:center;gap:6px;padding-left:1px;}",
    ".tf-msg-avatar-sm{width:20px;height:20px;border-radius:50%;background:" + DARK_2 + ";flex-shrink:0;",
    "display:flex;align-items:center;justify-content:center;overflow:hidden;}",
    ".tf-msg-avatar-sm img{width:100%;height:100%;object-fit:cover;}",
    ".tf-msg-avatar-sm svg{width:11px;height:11px;color:#60a5fa;}",
    ".tf-msg-meta{font-size:10.5px;color:#9297ab;}",
    ".tf-msg-meta b{color:#5b5f73;font-weight:650;}",
    ".tf-fade-in{animation:tf-fadein .3s ease;}",
    "@keyframes tf-fadein{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}",

    /* Welcome screen (shown before any conversation exists) */
    ".tf-welcome{padding:4px 2px 4px;}",
    ".tf-welcome-hero{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;}",
    ".tf-welcome-avatar{position:relative;width:56px;height:56px;border-radius:50%;background:" + DARK_2 + ";",
    "display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 0 4px #eef1fb;overflow:hidden;}",
    ".tf-welcome-avatar svg{width:26px;height:26px;color:#60a5fa;}",
    ".tf-welcome-avatar img{width:100%;height:100%;object-fit:cover;display:block;}",
    ".tf-welcome-avatar .tf-spark{position:absolute;top:-4px;right:-4px;width:16px;height:16px;color:" + PRIMARY + ";}",
    ".tf-welcome-greet{font-size:13px;color:#5b5f73;margin:2px 0 2px 0;}",
    ".tf-welcome-title{font-size:19px;font-weight:750;color:#111827;margin:0;letter-spacing:-.015em;line-height:1.25;}",
    ".tf-welcome-title span{color:" + PRIMARY + ";}",
    ".tf-welcome-role{font-size:12.5px;font-weight:650;color:" + PRIMARY + ";margin:3px 0 0 0;}",
    ".tf-welcome-sub{font-size:12.5px;color:#5b5f73;margin:8px 0 0 0;line-height:1.5;}",

    ".tf-tag-row{display:flex;flex-wrap:wrap;gap:14px;margin:14px 0 16px 0;}",
    ".tf-tag{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:" + PRIMARY_DARK + ";}",
    ".tf-tag svg{width:13px;height:13px;color:" + PRIMARY + ";}",
    ".tf-divider{height:1px;background:#edeef3;margin:0 0 16px 0;}",

    ".tf-section-title{font-size:13.5px;font-weight:700;color:#111827;margin:0 0 10px 0;}",

    /* Category cards (welcome screen) */
    ".tf-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}",
    ".tf-card{position:relative;text-align:left;border:1px solid #ecedf3;background:#fff;border-radius:13px;padding:9px 9px 10px;",
    "cursor:pointer;transition:all .15s ease;}",
    ".tf-card:hover{border-color:" + PRIMARY + "55;box-shadow:0 6px 16px rgba(15,23,42,.08);transform:translateY(-1px);}",
    ".tf-card-icon{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;}",
    ".tf-card-icon svg{width:13.5px;height:13.5px;}",
    ".tf-card-chevron{position:absolute;top:10px;right:9px;width:12px;height:12px;color:#c3c6d4;}",
    ".tf-card-title{font-size:11.5px;font-weight:650;color:#181a24;margin:0 0 2px 0;}",
    ".tf-card-sub{font-size:9.8px;color:#8a8fa3;line-height:1.35;margin:0;}",

    /* Popular questions */
    ".tf-popular{background:linear-gradient(135deg,#f4f6ff,#f8f5ff);border:1px solid #ecebfa;border-radius:16px;padding:13px 13px 10px;margin-bottom:2px;}",
    ".tf-popular-title{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#3730a3;margin:0 0 10px 0;}",
    ".tf-popular-title svg{width:13px;height:13px;color:" + PRIMARY + ";}",
    ".tf-popular-grid{display:flex;flex-direction:column;gap:7px;}",
    ".tf-popular-chip{display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #e6e5fb;border-radius:11px;",
    "padding:8px 11px;font-size:12px;color:#33354a;cursor:pointer;text-align:left;transition:all .15s ease;}",
    ".tf-popular-chip:hover{border-color:" + PRIMARY + ";background:#f6f8ff;}",
    ".tf-popular-chip svg{width:12px;height:12px;color:" + PRIMARY + ";flex-shrink:0;}",

    /* Suggested reply chips (appear under a specific bot message) */
    ".tf-suggest-row{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:92%;margin-top:-2px;}",
    ".tf-suggest-chip{border:1px solid #dbe0ee;background:#fff;color:" + PRIMARY + ";font-size:12px;font-weight:600;padding:7px 13px;border-radius:999px;cursor:pointer;transition:all .15s ease;}",
    ".tf-suggest-chip:hover{background:" + PRIMARY + ";color:#fff;border-color:" + PRIMARY + ";}",

    /* Typing indicator */
    ".tf-typing{align-self:flex-start;display:flex;align-items:center;gap:8px;padding:11px 14px;background:#fff;border:1px solid #ecedf3;border-radius:16px;border-bottom-left-radius:5px;}",
    ".tf-typing-label{font-size:12px;color:#9297ab;}",
    ".tf-typing-dots{display:flex;gap:4px;}",
    ".tf-typing-dots span{width:6px;height:6px;border-radius:50%;background:#9a9db3;animation:tf-typing-anim 1.1s infinite ease-in-out;}",
    ".tf-typing-dots span:nth-child(2){animation-delay:.15s;}",
    ".tf-typing-dots span:nth-child(3){animation-delay:.3s;}",
    "@keyframes tf-typing-anim{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-4px);opacity:1;}}",

    /* Inline CTA buttons under a bot message (contextual, not sticky) */
    ".tf-msg-links{display:flex;flex-wrap:wrap;gap:6px;}",
    ".tf-msg-link-btn{display:inline-flex;align-items:center;gap:5px;padding:8px 13px;border-radius:11px;",
    "font-size:12.3px;font-weight:650;text-decoration:none;background:" + PRIMARY + ";color:#fff;transition:background .15s ease, transform .12s ease;}",
    ".tf-msg-link-btn:hover{background:" + PRIMARY_DARK + ";transform:translateY(-1px);}",
    ".tf-msg-link-btn.tf-msg-link-secondary{background:#fff;color:#20222e;border:1px solid #dcdee8;}",
    ".tf-msg-link-btn.tf-msg-link-secondary:hover{border-color:" + PRIMARY + ";color:" + PRIMARY + ";}",
    ".tf-msg-link-btn svg{width:13px;height:13px;}",

    /* Input */
    ".tf-inputbar{display:flex;align-items:center;gap:8px;padding:12px;border-top:1px solid #ecedf3;background:#fff;flex-shrink:0;}",
    ".tf-input-wrap{flex:1;border:1.5px solid #e6e7ef;border-radius:14px;padding:8px 12px;transition:border-color .15s ease;}",
    ".tf-input-wrap:focus-within{border-color:" + PRIMARY + ";}",
    ".tf-input{width:100%;resize:none;border:none;padding:2px 0;font-size:13.5px;font-family:inherit;max-height:70px;outline:none;display:block;}",
    ".tf-input-example{font-size:10.5px;color:#b3b5c4;margin-top:1px;}",
    ".tf-send{background:" + PRIMARY + ";border:none;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s ease, transform .12s ease;}",
    ".tf-send:hover{background:" + PRIMARY_DARK + ";transform:translateY(-1px);}",
    ".tf-send:disabled{opacity:.4;cursor:not-allowed;transform:none;}",
    ".tf-send svg{width:16px;height:16px;}",

    ".tf-footer-note{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 14px 10px;flex-shrink:0;}",
    ".tf-footer-secure{display:flex;align-items:center;gap:4px;font-size:10px;color:#a7abc2;}",
    ".tf-footer-secure svg{width:10px;height:10px;}",
    ".tf-footer-powered{font-size:10px;color:#b3b5c4;}",
    ".tf-footer-powered b{color:" + PRIMARY + ";font-weight:650;}",

    "@media (max-width:480px){.tf-panel{width:calc(100vw - 48px);}}"
  ].join("\n");
  root.appendChild(styleTag);

  // ---- Markup -------------------------------------------------------------
  var wrapper = document.createElement("div");
  wrapper.className = "tf-root";
  wrapper.setAttribute("data-lenis-prevent", "");
  wrapper.innerHTML =
    '<button class="tf-launcher" aria-label="Open chat">' +
      '<span class="tf-pulse-ring"></span>' +
      '<svg viewBox="0 0 24 24" fill="none" class="tf-icon-chat">' +
        '<path d="M12 3C7.03 3 3 6.58 3 11c0 2.39 1.19 4.53 3.08 6.02-.1.98-.5 2.31-1.58 3.48 0 0 2.13-.16 4.03-1.5.75.2 1.56.3 2.47.3 4.97 0 9-3.58 9-8s-4.03-8-9-8z" fill="#F5F5F7"/>' +
      '</svg>' +
      '<svg viewBox="0 0 24 24" fill="none" class="tf-icon-close" style="display:none;">' +
        '<path d="M6 6L18 18M18 6L6 18" stroke="#F5F5F7" stroke-width="1.8" stroke-linecap="round"/>' +
      '</svg>' +
    '</button>' +
    '<div class="tf-panel">' +
      '<div class="tf-header">' +
        '<div class="tf-avatar">' + (LOGO_URL ? '<img src="' + LOGO_URL + '" alt="Techfynite" />' : "TF") + '</div>' +
        '<div class="tf-header-text">' +
          '<p class="tf-header-title">Techfynite</p>' +
          '<div class="tf-status"><span class="tf-dot"></span> Online \u00b7 Avg reply &lt; 10 sec</div>' +
        '</div>' +
        '<div class="tf-header-actions">' +
          '<button class="tf-icon-btn tf-menu-btn" aria-label="More options">' + icon("dots") + '</button>' +
          '<button class="tf-icon-btn tf-close" aria-label="Close chat"><svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
        '</div>' +
        '<div class="tf-menu"><button class="tf-menu-item tf-new-convo">\u21BB Start New Conversation</button></div>' +
      '</div>' +
      '<div class="tf-messages" id="tf-messages" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch></div>' +
      '<div class="tf-inputbar">' +
        '<div class="tf-input-wrap">' +
          '<textarea class="tf-input" id="tf-input" rows="1" placeholder="Describe your project idea..."></textarea>' +
        '</div>' +
        '<button class="tf-send" id="tf-send" aria-label="Send message">' +
          '<svg viewBox="0 0 24 24" fill="none"><path d="M3 11L21 3L14 21L11 13L3 11Z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="tf-footer-note">' +
        '<span class="tf-footer-secure">' + icon("lock") + ' Your information is safe and secure.</span>' +
        '<span class="tf-footer-powered">Powered by <b>Techfynite AI</b></span>' +
      '</div>' +
    '</div>';
  root.appendChild(wrapper);

  // ---- Element references --------------------------------------------------
  var launcher = wrapper.querySelector(".tf-launcher");
  var panel = wrapper.querySelector(".tf-panel");
  var closeBtn = wrapper.querySelector(".tf-close");
  var menuBtn = wrapper.querySelector(".tf-menu-btn");
  var menu = wrapper.querySelector(".tf-menu");
  var newConvoBtn = wrapper.querySelector(".tf-new-convo");
  var messagesEl = wrapper.querySelector("#tf-messages");

  // ---- Scroll-lock: never let scrolling inside the chat bleed into the
  // page behind it. CSS overscroll-behavior handles most modern browsers,
  // but this JS-level guard is the reliable fallback for every browser
  // and for trackpad/touch gestures that don't always respect it.
  (function attachScrollLock(el) {
    function clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }

    el.addEventListener(
      "wheel",
      function (e) {
        var max = el.scrollHeight - el.clientHeight;
        if (max <= 0) {
          e.preventDefault();
          return;
        }
        el.scrollTop = clamp(el.scrollTop + e.deltaY, 0, max);
        e.preventDefault();
      },
      { passive: false }
    );

    var touchStartY = 0;
    el.addEventListener(
      "touchstart",
      function (e) {
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );
    el.addEventListener(
      "touchmove",
      function (e) {
        var currentY = e.touches[0].clientY;
        var deltaY = touchStartY - currentY;
        var atTop = el.scrollTop <= 0;
        var atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        // Only block the page from scrolling when the gesture would push
        // past the top or bottom edge of the chat; otherwise let the chat
        // itself scroll normally.
        if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  })(messagesEl);

  var input = wrapper.querySelector("#tf-input");
  var sendBtn = wrapper.querySelector("#tf-send");
  var iconChat = wrapper.querySelector(".tf-icon-chat");
  var iconClose = wrapper.querySelector(".tf-icon-close");

  // Category cards shown on the welcome screen. Each has a matching
  // scripted opening reply in SCRIPTED_FLOWS below, so clicking a card
  // starts an instant, on-brand conversation instead of waiting on the API.
  var CATEGORY_CARDS = [
    { id: "saas", icon: "rocket", iconBg: "#dce7ff", iconColor: "#2563eb", title: "Build a SaaS", sub: "Launch your SaaS platform faster" },
    { id: "ai", icon: "bot", iconBg: "#ede9fe", iconColor: "#7c3aed", title: "AI Development", sub: "AI solutions tailored to your business" },
    { id: "website", icon: "globe", iconBg: "#dcfce7", iconColor: "#16a34a", title: "Website", sub: "Modern, fast & responsive websites" },
    { id: "mobile", icon: "phone", iconBg: "#ffedd5", iconColor: "#ea580c", title: "Mobile App", sub: "iOS & Android apps that users love" },
    { id: "uiux", icon: "brush", iconBg: "#fce7f3", iconColor: "#db2777", title: "UI/UX Design", sub: "Beautiful & intuitive user experiences" },
    { id: "estimate", icon: "calculator", iconBg: "#ccfbf1", iconColor: "#0d9488", title: "Project Estimate", sub: "Get cost & timeline estimation" },
  ];

  // Scripted first reply + suggestion chips for each category card, written
  // in Maya's voice. These render instantly (no API call) so clicking a card
  // never waits on a network round trip; the real AI takes over from the
  // visitor's next message onward (with this exchange already in context).
  var SCRIPTED_FLOWS = {
    saas: {
      reply: "That's exciting! \uD83D\uDE80\n\nI'd love to help you plan your SaaS.\n\nTo recommend the right architecture, I'd like to understand your idea first. What type of SaaS are you planning to build?",
      suggestions: ["CRM", "Marketplace", "AI SaaS", "Internal Tool", "Other"],
    },
    ai: {
      reply: "Great! \uD83E\uDD16 AI can genuinely transform how your business runs.\n\nWhat would you like AI to help with?",
      suggestions: ["Chatbot", "AI Automation", "AI Agent", "Document AI", "Vision AI"],
    },
    website: {
      reply: "Great choice! \uD83C\uDF10\n\nI'd love to learn more. Is this website for:",
      suggestions: ["Startup", "Company", "Personal Brand", "Portfolio", "Ecommerce"],
    },
    mobile: {
      reply: "Nice! \uD83D\uDCF1 Let's plan the right app for your users.\n\nWho is this app mainly for?",
      suggestions: ["iOS", "Android", "Both iOS & Android", "Not sure yet"],
    },
    uiux: {
      reply: "Love that! \uD83C\uDFA8 Good design makes all the difference.\n\nWhat are you looking to design?",
      suggestions: ["New Product", "Redesign", "Design System", "Landing Page"],
    },
    estimate: {
      reply: "I'd be happy to estimate your project. \uD83D\uDCB0\n\nI'll ask just a few quick questions - it usually takes less than 2 minutes.",
      suggestions: ["Let's start \u2192"],
    },
  };

  var POPULAR_QUESTIONS = [
    "How much does a SaaS app cost?",
    "How long to build an MVP?",
    "Recommend tech stack for my idea",
    "Show me your portfolio",
  ];

  // ---- State: conversation history (persisted per browser tab) -------------
  var history = loadHistory();

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      /* storage unavailable - conversation just won't persist on refresh */
    }
  }

  // ---- Lightweight formatting: escape HTML, then turn **bold** and
  // "- " / "\u2022 " bullet lines into real <strong> and <ul><li> markup so
  // pricing/service lists read like clean cards instead of a wall of text.
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatMessageHtml(text) {
    var escaped = escapeHtml(text);
    var lines = escaped.split("\n");
    var html = "";
    var inList = false;

    lines.forEach(function (line) {
      var bulletMatch = line.match(/^\s*[-\u2022]\s+(.*)$/);
      if (bulletMatch) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += "<li>" + inlineFormat(bulletMatch[1]) + "</li>";
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        if (line.trim() === "") {
          return;
        }
        html += "<p>" + inlineFormat(line) + "</p>";
      }
    });
    if (inList) html += "</ul>";
    return html || escaped;
  }

  function inlineFormat(line) {
    return line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  // ---- Marker extraction (LEAD capture + suggested replies) ----------------
  var URL_REGEX = /https?:\/\/[^\s)]+/g;
  var MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  var EMPTY_MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(\s*\)/g;
  var LEAD_MARKER_REGEX = /\[\[LEAD:name=([^;]+);email=([^\]]+)\]\]/i;
  var SUGGEST_MARKER_REGEX = /\[\[SUGGEST:([^\]]+)\]\]/i;

  // Some replies use markdown link syntax like "[Click here](https://...)"
  // instead of a bare URL. Pull the real URL out of that syntax (so it still
  // becomes a button) and strip the bracket/parenthesis wrapper entirely -
  // including the rare case where the model leaves an empty "[label]()"
  // behind - so no link-syntax artifacts ever reach the visitor.
  function extractMarkdownLinks(text) {
    var extractedUrls = [];
    var cleaned = text.replace(MARKDOWN_LINK_REGEX, function (match, label, url) {
      extractedUrls.push(url);
      return "";
    });
    cleaned = cleaned.replace(EMPTY_MARKDOWN_LINK_REGEX, "$1");
    return { text: cleaned, urls: extractedUrls };
  }
  var LEAD_SENT_KEY = "techfynite_lead_sent_v1";
  var leadAlreadySent = sessionStorage.getItem(LEAD_SENT_KEY) === "1";

  function extractAndSaveLead(text) {
    var match = text.match(LEAD_MARKER_REGEX);
    if (!match) return text;

    var name = match[1].trim();
    var email = match[2].trim();
    var cleaned = text.replace(match[0], "").trim();

    if (!leadAlreadySent && name && email) {
      leadAlreadySent = true;
      try {
        sessionStorage.setItem(LEAD_SENT_KEY, "1");
      } catch (e) {}
      fetch(API_URL.replace(/\/$/, "") + "/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, source: "chatbot" }),
      }).catch(function () {});
    }

    return cleaned;
  }

  function extractSuggestions(text) {
    var match = text.match(SUGGEST_MARKER_REGEX);
    if (!match) return { text: text, suggestions: [] };
    var cleaned = text.replace(match[0], "").trim();
    var suggestions = match[1]
      .split("|")
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .slice(0, 4);
    return { text: cleaned, suggestions: suggestions };
  }

  function labelForUrl(url) {
    var lower = url.toLowerCase();
    if (lower.indexOf("calendly") !== -1 || lower === BOOK_CALL_URL.toLowerCase()) {
      return { text: "\uD83D\uDCC5 Book Discovery Call", variant: "primary" };
    }
    if (lower.indexOf("wa.me") !== -1 || lower.indexOf("whatsapp") !== -1) {
      return { text: "\uD83D\uDFE2 WhatsApp", variant: "secondary" };
    }
    if (lower.indexOf("t.me") !== -1 || lower.indexOf("telegram") !== -1) {
      return { text: "\u2708\uFE0F Telegram", variant: "secondary" };
    }
    if (lower.indexOf("contact") !== -1 || lower === CONTACT_URL.toLowerCase()) {
      return { text: "\uD83D\uDCDD Contact Form", variant: "secondary" };
    }
    if (lower.indexOf("mailto:") === 0) {
      return { text: "\u2709\uFE0F Email Us", variant: "secondary" };
    }
    return { text: "\uD83D\uDD17 Open Link", variant: "secondary" };
  }

  // Strips markdown markers for the typing animation (raw ** and - would
  // look odd mid-type); the final formatted HTML is swapped in once typing
  // completes.
  function stripMarkdownForTyping(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^[ \t]*[-\u2022][ \t]+/gm, "\u2022 ");
  }

  // Reveals `plainText` into `el` character-by-character like real typing.
  // Total duration is bounded (not proportional to length forever) so long
  // replies don't take forever, but short ones still feel deliberate.
  function typewriterReveal(el, plainText, onComplete) {
    var total = plainText.length;
    if (total === 0) {
      onComplete();
      return;
    }
    var STEP_MS = 18;
    var TARGET_DURATION_MS = Math.min(1600, Math.max(500, total * 12));
    var totalSteps = Math.max(1, Math.round(TARGET_DURATION_MS / STEP_MS));
    var charsPerStep = Math.max(1, Math.ceil(total / totalSteps));
    var i = 0;
    el.style.whiteSpace = "pre-wrap";
    el.textContent = "";
    var timer = setInterval(function () {
      i = Math.min(total, i + charsPerStep);
      el.textContent = plainText.slice(0, i);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      if (i >= total) {
        clearInterval(timer);
        onComplete();
      }
    }, STEP_MS);
  }

  // ---- Rendering -------------------------------------------------------
  function renderMessage(role, rawText, onDone) {
    var text = rawText;
    var urls = [];

    if (role === "assistant") {
      // Safety net: swap any em-dash for a comma, in case the model uses
      // one despite the system prompt asking it not to.
      text = text.replace(/\s*\u2014\s*/g, ", ");

      var mdParsed = extractMarkdownLinks(text);
      text = mdParsed.text;
      var bareUrls = text.match(URL_REGEX) || [];
      bareUrls.forEach(function (url) {
        var trimmedUrl = url.replace(/[.,)]+$/, "");
        text = text.split(url).join("").trim();
        bareUrls[bareUrls.indexOf(url)] = trimmedUrl;
      });
      urls = mdParsed.urls.concat(bareUrls);
      if (urls.length > 0) {
        text = text
          .replace(/[ \t]{2,}/g, " ")
          .replace(/[ \t]+([.,!?])/g, "$1")
          .replace(/\n[ \t]+/g, "\n")
          .replace(/[ \t]+\n/g, "\n")
          .trim();
      }
    }

    if (role === "user") {
      var userDiv = document.createElement("div");
      userDiv.className = "tf-msg tf-msg-user tf-fade-in";
      userDiv.textContent = text || rawText;
      messagesEl.appendChild(userDiv);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      if (onDone) onDone();
      return;
    }

    // Assistant messages render as a single left-aligned column:
    // bubble (typed out) -> (optional link buttons) -> small avatar +
    // "Maya · role" attribution underneath. Links, attribution, and any
    // suggestion chips only appear once the typing animation finishes.
    var finalText = text || rawText;
    var block = document.createElement("div");
    block.className = "tf-msg-block tf-fade-in";

    var bubble = document.createElement("div");
    bubble.className = "tf-msg tf-msg-bot";
    block.appendChild(bubble);
    messagesEl.appendChild(block);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    typewriterReveal(bubble, stripMarkdownForTyping(finalText), function () {
      bubble.style.whiteSpace = "";
      bubble.innerHTML = formatMessageHtml(finalText);

      if (urls.length > 0) {
        var linksRow = document.createElement("div");
        linksRow.className = "tf-msg-links";
        var seen = {};
        urls.forEach(function (url) {
          if (seen[url]) return;
          seen[url] = true;
          var meta2 = labelForUrl(url);
          var a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.className = "tf-msg-link-btn" + (meta2.variant === "secondary" ? " tf-msg-link-secondary" : "");
          a.textContent = meta2.text;
          linksRow.appendChild(a);
        });
        block.appendChild(linksRow);
      }

      var attribution = document.createElement("div");
      attribution.className = "tf-msg-attribution";
      var avatarSm = document.createElement("div");
      avatarSm.className = "tf-msg-avatar-sm";
      avatarSm.innerHTML = AVATAR_URL
        ? '<img src="' + AVATAR_URL + '" alt="' + ASSISTANT_NAME + '" />'
        : icon("bot");
      var meta = document.createElement("span");
      meta.className = "tf-msg-meta";
      meta.innerHTML = "<b>" + ASSISTANT_NAME + "</b> \u00b7 " + ASSISTANT_ROLE;
      attribution.appendChild(avatarSm);
      attribution.appendChild(meta);
      block.appendChild(attribution);

      messagesEl.scrollTop = messagesEl.scrollHeight;
      if (onDone) onDone();
    });
  }

  function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) return;
    var row = document.createElement("div");
    row.className = "tf-suggest-row tf-fade-in";
    suggestions.forEach(function (label) {
      var chip = document.createElement("button");
      chip.className = "tf-suggest-chip";
      chip.textContent = label;
      chip.addEventListener("click", function () {
        row.remove();
        sendMessage(label);
      });
      row.appendChild(chip);
    });
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderWelcomeScreen() {
    var wrap = document.createElement("div");
    wrap.className = "tf-welcome";

    var avatarInner = AVATAR_URL
      ? '<img src="' + AVATAR_URL + '" alt="' + ASSISTANT_NAME + '" />'
      : icon("bot");

    wrap.innerHTML =
      '<div class="tf-welcome-hero">' +
        '<div class="tf-welcome-avatar">' + avatarInner + '<span class="tf-spark">' + icon("sparkle") + '</span></div>' +
        '<div>' +
          '<p class="tf-welcome-greet">\uD83D\uDC4B Hi there!</p>' +
          '<p class="tf-welcome-title">I\u2019m <span>' + ASSISTANT_NAME + '</span>.</p>' +
          '<p class="tf-welcome-role">' + ASSISTANT_ROLE + '</p>' +
        '</div>' +
      '</div>' +
      '<p class="tf-welcome-sub">I help founders and businesses turn ideas into successful digital products.</p>' +
      '<div class="tf-tag-row">' +
        '<span class="tf-tag">' + icon("sparkle") + ' Smart Advice</span>' +
        '<span class="tf-tag">' + icon("chart") + ' Accurate Estimates</span>' +
        '<span class="tf-tag">' + icon("users") + ' Expert Guidance</span>' +
      '</div>' +
      '<div class="tf-divider"></div>' +
      '<p class="tf-section-title">How can I help you today?</p>';

    var grid = document.createElement("div");
    grid.className = "tf-card-grid";
    CATEGORY_CARDS.forEach(function (c) {
      var card = document.createElement("button");
      card.className = "tf-card";
      card.innerHTML =
        '<div class="tf-card-icon" style="background:' + c.iconBg + ';color:' + c.iconColor + '">' + icon(c.icon) + '</div>' +
        '<span class="tf-card-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></span>' +
        '<p class="tf-card-title">' + c.title + '</p>' +
        '<p class="tf-card-sub">' + c.sub + '</p>';
      card.addEventListener("click", function () {
        startScriptedFlow(c);
      });
      grid.appendChild(card);
    });
    wrap.appendChild(grid);

    var popular = document.createElement("div");
    popular.className = "tf-popular";
    popular.innerHTML = '<p class="tf-popular-title">' + icon("sparkle") + ' Popular questions</p>';
    var pgrid = document.createElement("div");
    pgrid.className = "tf-popular-grid";
    POPULAR_QUESTIONS.forEach(function (q) {
      var chip = document.createElement("button");
      chip.className = "tf-popular-chip";
      chip.innerHTML = icon("sparkle") + "<span>" + q + "</span>";
      chip.addEventListener("click", function () {
        sendMessage(q);
      });
      pgrid.appendChild(chip);
    });
    popular.appendChild(pgrid);
    wrap.appendChild(popular);

    messagesEl.appendChild(wrap);
  }

  function renderConversation() {
    messagesEl.innerHTML = "";
    if (history.length === 0) {
      renderWelcomeScreen();
      return;
    }
    history.forEach(function (m) {
      renderMessage(m.role, m.content);
    });
  }

  // Runs when a welcome-screen category card is clicked: fades the welcome
  // screen out, drops in the visitor's "choice" as a user bubble, shows a
  // brief typing pause, then reveals Maya's scripted opening reply (with
  // her avatar + name/role caption) and any follow-up suggestion chips.
  // No API call happens here - it's instant and free; the real backend
  // takes over once the visitor responds to a suggestion or types freely.
  function startScriptedFlow(card) {
    var flow = SCRIPTED_FLOWS[card.id];
    if (!flow) return;

    var welcomeEl = messagesEl.querySelector(".tf-welcome");
    if (welcomeEl) {
      welcomeEl.style.transition = "opacity .22s ease";
      welcomeEl.style.opacity = "0";
    }

    setTimeout(function () {
      messagesEl.innerHTML = "";
      renderMessage("user", card.title);
      history.push({ role: "user", content: card.title });
      saveHistory();
      showTyping();

      setTimeout(function () {
        hideTyping();
        history.push({ role: "assistant", content: flow.reply });
        saveHistory();
        renderMessage("assistant", flow.reply, function () {
          if (flow.suggestions && flow.suggestions.length > 0) {
            renderSuggestions(flow.suggestions);
          }
        });
      }, 700);
    }, welcomeEl ? 220 : 0);
  }

  function showTyping() {
    var div = document.createElement("div");
    div.className = "tf-typing";
    div.id = "tf-typing-indicator";
    div.innerHTML =
      '<span class="tf-typing-label">Thinking</span>' +
      '<span class="tf-typing-dots"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    var el = root.getElementById("tf-typing-indicator");
    if (el) el.remove();
  }

  // ---- Networking --------------------------------------------------------
  function sendMessage(text) {
    text = (text || "").trim();
    if (!text) return;

    if (history.length === 0) {
      messagesEl.innerHTML = "";
    }

    renderMessage("user", text);
    history.push({ role: "user", content: text });
    saveHistory();
    input.value = "";
    autoResize();
    sendBtn.disabled = true;
    showTyping();
    var requestStartedAt = Date.now();
    var MIN_THINKING_MS = 650; // keeps the pause feeling deliberate even on fast replies

    fetch(API_URL.replace(/\/$/, "") + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.json();
      })
      .then(function (data) {
        var reply = data.reply || "Sorry, something went wrong. Please try again.";
        reply = extractAndSaveLead(reply);
        var parsed = extractSuggestions(reply);
        var elapsed = Date.now() - requestStartedAt;
        var remaining = Math.max(0, MIN_THINKING_MS - elapsed);

        setTimeout(function () {
          hideTyping();
          history.push({ role: "assistant", content: parsed.text });
          saveHistory();
          renderMessage("assistant", parsed.text, function () {
            renderSuggestions(parsed.suggestions);
          });
        }, remaining);
      })
      .catch(function () {
        hideTyping();
        renderMessage(
          "assistant",
          "Sorry, I'm having trouble connecting right now. Please try again shortly, or email official@techfynite.com."
        );
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
  }

  // ---- UI interactions -----------------------------------------------------
  function openPanel() {
    panel.classList.add("tf-open");
    panel.classList.remove("tf-minimized");
    iconChat.style.display = "none";
    iconClose.style.display = "block";
    input.focus();
  }

  function closePanel() {
    panel.classList.remove("tf-open");
    iconChat.style.display = "block";
    iconClose.style.display = "none";
    menu.classList.remove("tf-menu-open");
  }

  launcher.addEventListener("click", function () {
    if (panel.classList.contains("tf-open")) {
      closePanel();
    } else {
      openPanel();
    }
  });

  closeBtn.addEventListener("click", closePanel);

  menuBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    menu.classList.toggle("tf-menu-open");
  });

  document.addEventListener("click", function () {
    menu.classList.remove("tf-menu-open");
  });

  newConvoBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    history = [];
    saveHistory();
    leadAlreadySent = false;
    try {
      sessionStorage.removeItem(LEAD_SENT_KEY);
    } catch (err) {}
    renderConversation();
    menu.classList.remove("tf-menu-open");
  });

  sendBtn.addEventListener("click", function () {
    sendMessage(input.value);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  function autoResize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 70) + "px";
  }
  input.addEventListener("input", autoResize);

  // ---- Init ----------------------------------------------------------------
  renderConversation();
})();
