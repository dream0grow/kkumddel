/* =========================================================
   꿈들 홈페이지 — 환경설정 (Supabase 연동)
   ─────────────────────────────────────────────────────────
   ▶ 사용 방법
     1) https://supabase.com 에서 무료 프로젝트를 만듭니다.
     2) 프로젝트 → Settings → API 에서
        - Project URL      → SUPABASE_URL 에 붙여넣기
        - anon public key  → SUPABASE_ANON_KEY 에 붙여넣기
        (anon 키는 공개돼도 안전합니다. 보안은 DB의 RLS 정책으로 지킵니다.)
     3) SUPABASE_SETUP.md 의 SQL을 Supabase SQL editor에 실행합니다.
     4) 관리자로 쓸 이메일로 회원가입한 뒤, SQL editor에서
        update profiles set role='admin' where email='관리자이메일';
   ========================================================= */
window.KKUMDLE_CONFIG = {
  SUPABASE_URL: "https://gywbsiatubvvtnblvwdz.supabase.co",       // 예: "https://abcxyz.supabase.co"
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5d2JzaWF0dWJ2dnRuYmx2d2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDgxMjAsImV4cCI6MjA5ODQ4NDEyMH0.5nInQ2etrZzCIbzF8LEzAGZhXPIshRFsw6aW-t5cpJ0",  // 예: "eyJhbGciOiJI..."

  // 강의·프로그램 신청을 Supabase(applications 테이블)에 저장할지 여부
  APPLY_TO_SUPABASE: true
};

// Supabase 설정이 채워졌는지 여부 (미설정 시 회원기능은 '준비 중' 안내)
window.KKUMDLE_READY = !!(window.KKUMDLE_CONFIG.SUPABASE_URL &&
                          window.KKUMDLE_CONFIG.SUPABASE_ANON_KEY);
