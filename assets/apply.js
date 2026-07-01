/* =========================================================
   강의·프로그램 신청 폼 처리
   ─────────────────────────────────────────────────────────
   백엔드(폼 서비스/DB) 연결 전에도 동작하도록 구성했습니다.
   ■ 연동 방법 (택1)
     1) 구글폼/Formspree 등 외부 폼 엔드포인트가 있으면
        아래 KKUMDLE_APPLY_ENDPOINT 에 URL을 넣으면 POST 전송합니다.
     2) 엔드포인트가 없으면, 신청 내용을 문자(SMS)로 보내거나
        클립보드에 복사해 전화/카카오톡으로 전달하도록 안내합니다.
   ========================================================= */
window.KKUMDLE_APPLY_ENDPOINT = window.KKUMDLE_APPLY_ENDPOINT || ""; // 예: "https://formspree.io/f/xxxx"
var KKUMDLE_TEL = "010-2344-4373";

(function () {
  var form = document.getElementById("apply-form");
  if (!form) return;
  var note = document.getElementById("apply-note");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var program = val("af-program"), name = val("af-name"),
        phone = val("af-phone"), msg = val("af-msg");
    if (!program || !name || !phone) { setNote("필수 항목(프로그램·이름·연락처)을 입력해 주세요.", true); return; }

    var summary =
      "[꿈들 강의·프로그램 신청]\n" +
      "· 프로그램: " + program + "\n" +
      "· 이름: " + name + "\n" +
      "· 연락처: " + phone + "\n" +
      (msg ? "· 내용: " + msg + "\n" : "");

    var cfg = window.KKUMDLE_CONFIG || {};
    // 1) Supabase(applications 테이블)에 저장
    if (window.KKUMDLE_READY && cfg.APPLY_TO_SUPABASE && window.KKUMDLE_DB) {
      window.KKUMDLE_DB.submitApplication({ program: program, name: name, phone: phone, message: msg })
        .then(function () { form.reset(); setNote("✅ 신청이 접수되었습니다. 담당자가 연락드리겠습니다.", false); })
        .catch(function () { fallback(summary); });
    }
    // 2) 외부 폼 엔드포인트(Formspree 등)
    else if (window.KKUMDLE_APPLY_ENDPOINT) {
      fetch(window.KKUMDLE_APPLY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ program: program, name: name, phone: phone, message: msg })
      }).then(function (r) {
        if (r.ok) { form.reset(); setNote("✅ 신청이 접수되었습니다. 담당자가 연락드리겠습니다.", false); }
        else throw new Error("bad");
      }).catch(function () { fallback(summary); });
    }
    // 3) 백엔드 미연결 시: 문자/복사 폴백
    else { fallback(summary); }
  });

  function fallback(summary) {
    // 모바일: SMS 앱으로 신청 내용 전달
    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    copy(summary);
    if (isMobile) {
      var digits = KKUMDLE_TEL.replace(/[^0-9]/g, "");
      location.href = "sms:" + digits + (/(iPhone|iPad|iPod)/i.test(navigator.userAgent) ? "&" : "?") +
        "body=" + encodeURIComponent(summary);
      setNote("문자 앱으로 신청 내용을 전송해 주세요. (내용이 클립보드에도 복사되었습니다)", false);
    } else {
      setNote("신청 내용이 클립보드에 복사되었습니다. 전화 " + KKUMDLE_TEL +
              " 또는 카카오톡으로 붙여넣어 보내주세요.", false);
    }
  }

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function setNote(t, warn) { if (note) { note.innerHTML = t; note.style.color = warn ? "#c0392b" : ""; } }
  function copy(t) {
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(t);
      else { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    } catch (e) {}
  }
})();
