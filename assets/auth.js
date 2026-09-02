/* =========================================================
   꿈들 — 회원 인증 · 게시판 · 신청 (Supabase)
   config.js 의 KKUMDLE_CONFIG 값이 채워지면 활성화됩니다.
   window.KKUMDLE_MEMBER : 로그인 상태/권한 API
   window.KKUMDLE_DB     : 게시판/회원/신청 데이터 API
   ========================================================= */
(function () {
  var cfg = window.KKUMDLE_CONFIG || {};
  var ready = !!window.KKUMDLE_READY;
  var client = null;
  if (ready && window.supabase) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  var state = { user: null, profile: null };

  // ---------- 오류 메시지 한국어 변환 ----------
  // "Failed to fetch"(서버 연결 실패)를 포함해 자주 나오는 오류를 사람이 읽을 수 있게 바꿉니다.
  function friendlyError(err) {
    var m = (err && err.message) || String(err || "");
    if (/Failed to fetch|NetworkError|Load failed|ERR_NAME_NOT_RESOLVED/i.test(m))
      return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.\n" +
             "(계속 실패하면 관리자에게 알려주세요 — 무료 Supabase 프로젝트가 일시중지(Paused)되었을 수 있습니다. " +
             "supabase.com 대시보드에서 Restore 버튼을 누르면 다시 살아납니다.)";
    if (/User already registered|already been registered/i.test(m))
      return "이미 가입된 이메일입니다. 로그인해 주세요.";
    if (/Invalid login credentials/i.test(m))
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    if (/Email not confirmed/i.test(m))
      return "이메일 인증이 아직 완료되지 않았습니다. 메일함(스팸함 포함)의 인증 링크를 눌러주세요.";
    if (/Password should be at least/i.test(m))
      return "비밀번호가 너무 짧습니다. 8자 이상으로 정해주세요.";
    if (/is invalid|invalid format/i.test(m) && /email/i.test(m))
      return "이메일 주소 형식이 올바르지 않습니다.";
    if (/rate limit|only request this after|too many requests/i.test(m))
      return "요청이 너무 잦습니다. 잠시(약 1분) 후 다시 시도해 주세요.";
    if (/signup.*disabled|Signups not allowed/i.test(m))
      return "현재 회원가입이 일시적으로 닫혀 있습니다. 관리자에게 문의해 주세요.";
    return m || "알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.";
  }

  function isLoggedIn() { return !!state.user; }
  function isAdmin() { return !!(state.profile && state.profile.role === "admin"); }
  function canWrite() { return isLoggedIn(); }

  async function refresh() {
    if (!client) return;
    var s = await client.auth.getSession();
    state.user = s.data.session ? s.data.session.user : null;
    state.profile = null;
    if (state.user) {
      var r = await client.from("profiles").select("*").eq("id", state.user.id).single();
      state.profile = r.data || { id: state.user.id, role: "member", name: state.user.email };
    }
    paintHeader();
  }

  // ---------- 인증 ----------
  async function signUp(email, password, name, phone) {
    if (!client) throw new Error("not-ready");
    // 클라이언트 1차 검증(서버 정책과 별개로 즉시 안내)
    if (!password || password.length < 8) throw new Error("Password should be at least 8 characters");
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      throw new Error("비밀번호는 영문과 숫자를 함께 사용해 주세요. (8자 이상)");
    // 이름/연락처를 auth 메타데이터로 전달 → DB 트리거(handle_new_user)가 프로필 자동 생성
    var r = await client.auth.signUp({
      email: email, password: password,
      options: { data: { name: name || email, phone: phone || "" } }
    });
    if (r.error) throw r.error;
    var uid = r.data.user && r.data.user.id;
    // 로그인 세션이 있으면(이메일 인증 꺼진 경우) 프로필 보강 시도(트리거가 이미 만들었으면 갱신)
    if (uid && r.data.session) {
      try {
        await client.from("profiles").upsert({ id: uid, email: email, name: name || email, phone: phone || "", role: "member" });
      } catch (e) {}
    }
    return r.data;
  }
  async function signIn(email, password) {
    if (!client) throw new Error("not-ready");
    var r = await client.auth.signInWithPassword({ email: email, password: password });
    if (r.error) throw r.error;
    await refresh();
    return r.data;
  }
  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    state.user = null; state.profile = null;
    paintHeader();
    location.href = "index.html";
  }

  // ---------- 게시판 ----------
  async function listProjectPosts() {
    if (!client) return [];
    var r = await client.from("project_posts").select("*").order("created_at", { ascending: false });
    return r.data || [];
  }
  async function createProjectPost(title, body) {
    if (!client) throw new Error("not-ready");
    if (!state.user) throw new Error("login-required");
    var r = await client.from("project_posts").insert({
      author_id: state.user.id,
      author_name: (state.profile && state.profile.name) || state.user.email,
      title: title, body: body
    });
    if (r.error) throw r.error;
    return r.data;
  }
  async function deleteProjectPost(id) {
    if (!client) throw new Error("not-ready");
    var r = await client.from("project_posts").delete().eq("id", id);
    if (r.error) throw r.error;
  }

  // ---------- 신청 ----------
  async function submitApplication(payload) {
    if (!client) throw new Error("not-ready");
    var r = await client.from("applications").insert(payload);
    if (r.error) throw r.error;
  }

  // ---------- 관리자 ----------
  async function listMembers() {
    if (!client) return [];
    var r = await client.from("profiles").select("*").order("created_at", { ascending: false });
    return r.data || [];
  }
  async function listApplications() {
    if (!client) return [];
    // 관리자: 원본 테이블(연락처 포함) / 일반 회원: 개인정보가 가려진 뷰(applications_board)
    // (supabase/security_patch.sql 적용 후 일반 회원은 원본 테이블을 읽을 수 없습니다)
    if (isAdmin()) {
      var r = await client.from("applications").select("*").order("created_at", { ascending: false });
      return r.data || [];
    }
    var v = await client.from("applications_board").select("*").order("created_at", { ascending: false });
    if (!v.error) return v.data || [];
    // 보안 패치(SQL) 적용 전 호환: 뷰가 없으면 기존 테이블에서 최소 컬럼만 읽기
    var legacy = await client.from("applications").select("id,program,name,created_at").order("created_at", { ascending: false });
    return legacy.data || [];
  }
  async function setMemberRole(id, role) {
    if (!client) throw new Error("not-ready");
    var r = await client.from("profiles").update({ role: role }).eq("id", id);
    if (r.error) throw r.error;
  }

  // ---------- 헤더 로그인 상태 표시 ----------
  function paintHeader() {
    var ul = document.querySelector(".nav-links");
    if (!ul) return;
    var old = document.getElementById("auth-nav");
    if (old) old.remove();
    var li = document.createElement("li");
    li.id = "auth-nav";
    if (isLoggedIn()) {
      var nm = (state.profile && state.profile.name) || "회원";
      var adm = isAdmin() ? ' · <a href="admin.html" style="color:var(--brand)">관리</a>' : "";
      li.innerHTML = '<span style="font-size:.92rem;color:var(--ink-soft)">' +
        nm + "님" + adm + ' · <a href="#" id="logout-lnk" style="color:var(--accent-dark)">로그아웃</a></span>';
    } else {
      li.innerHTML = '<a href="login.html" style="font-weight:700;color:var(--brand)">로그인</a>';
    }
    ul.appendChild(li);
    var lo = document.getElementById("logout-lnk");
    if (lo) lo.addEventListener("click", function (e) { e.preventDefault(); signOut(); });
  }

  window.KKUMDLE_MEMBER = {
    ready: ready, get user() { return state.user; }, get profile() { return state.profile; },
    isLoggedIn: isLoggedIn, isAdmin: isAdmin, canWrite: canWrite,
    signUp: signUp, signIn: signIn, signOut: signOut, refresh: refresh,
    friendlyError: friendlyError
  };
  window.KKUMDLE_DB = {
    listProjectPosts: listProjectPosts, createProjectPost: createProjectPost, deleteProjectPost: deleteProjectPost,
    submitApplication: submitApplication, listMembers: listMembers, listApplications: listApplications, setMemberRole: setMemberRole
  };

  // 헤더가 site.js로 주입된 뒤 상태 표시
  function boot() { paintHeader(); if (client) refresh(); }
  if (document.readyState !== "loading") setTimeout(boot, 0);
  else document.addEventListener("DOMContentLoaded", boot);
})();
