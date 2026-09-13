/* =========================================================
   문구 적용 엔진 — assets/copy.js 의 문구를 화면에 꽂아 줍니다.
   ─────────────────────────────────────────────────────────
   ※ 이 파일은 고칠 필요가 없습니다. 문구는 assets/copy.js 에서 바꾸세요.

   동작 방식
   - HTML 요소에 data-copy="index.hero.title" 처럼 키를 적어 두면
     copy.js 의 해당 문구로 내용(innerHTML)을 바꿉니다.
   - data-copy-attr="placeholder:apply.form.namePlaceholder; alt:..." 는
     속성(placeholder, alt, aria-label 등)을 바꿉니다.
   - <title>, <meta name="description">, og:title, og:description 은
     각 페이지의 meta 항목으로 바꿉니다.
   - 문구 속 {{common.info.tel}} 같은 자리는 copy.js 의 값으로 채웁니다.
   - 스크립트에서는 KKUMDLE_T("키", "기본값") 으로 문구를 가져옵니다.
   - copy.js 에 문법 오류가 있으면 아무것도 바꾸지 않고(HTML 원문 유지)
     콘솔에 안내만 남깁니다.
   ========================================================= */
(function () {
  function root() { return window.KKUMDLE_COPY || null; }

  function get(path) {
    var o = root();
    if (!o || !path) return undefined;
    var parts = String(path).split(".");
    for (var i = 0; i < parts.length; i++) {
      if (o == null || typeof o !== "object") return undefined;
      o = o[parts[i]];
    }
    return o;
  }

  function expand(s, depth) {
    depth = depth || 0;
    if (typeof s !== "string" || depth > 5) return s;
    return s.replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, function (m, key) {
      var v = get(key);
      return (v == null || typeof v === "object") ? m : expand(String(v), depth + 1);
    });
  }

  /* 전역 헬퍼: KKUMDLE_T("index.hero.title", "기본 문구") */
  window.KKUMDLE_T = function (path, fallback) {
    var v = get(path);
    if (v == null) return fallback;
    return typeof v === "string" ? expand(v) : v;
  };

  /* 현재 페이지 키: <body data-page="..."> 가 있으면 우선, 없으면 파일명 */
  function pageKey() {
    var b = document.body && document.body.getAttribute("data-page");
    if (b) return b;
    var file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    var key = file.replace(/\.html?$/, "") || "index";
    if (key === "404") key = "notfound";
    return key;
  }

  function setMeta(attr, name, value) {
    var el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (el && value) el.setAttribute("content", value);
  }

  function apply() {
    if (!root()) {
      if (window.console) console.warn("[꿈들] assets/copy.js 를 읽지 못해 HTML 원문 문구를 그대로 표시합니다.");
      return;
    }
    var page = pageKey();
    var meta = get(page + ".meta");
    if (meta) {
      if (meta.title) { document.title = expand(meta.title); setMeta("property", "og:title", expand(meta.title)); }
      if (meta.description) { setMeta("name", "description", expand(meta.description)); setMeta("property", "og:description", expand(meta.description)); }
    }
    var els = document.querySelectorAll("[data-copy]");
    for (var i = 0; i < els.length; i++) {
      var v = window.KKUMDLE_T(els[i].getAttribute("data-copy"));
      if (typeof v === "string") els[i].innerHTML = v;
    }
    var attrs = document.querySelectorAll("[data-copy-attr]");
    for (var j = 0; j < attrs.length; j++) {
      var pairs = attrs[j].getAttribute("data-copy-attr").split(";");
      for (var k = 0; k < pairs.length; k++) {
        var p = pairs[k], c = p.indexOf(":");
        if (c < 0) continue;
        var attr = p.slice(0, c).trim(), key = p.slice(c + 1).trim();
        var av = window.KKUMDLE_T(key);
        if (typeof av === "string") attrs[j].setAttribute(attr, av);
      }
    }
  }

  window.KKUMDLE_APPLY_COPY = apply;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
})();
