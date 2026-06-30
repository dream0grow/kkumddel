/* =========================================================
   게시글 데이터 (소식 · 보도자료 · 프로젝트 · 공지사항)
   ─────────────────────────────────────────────────────────
   ■ 콘텐츠 이관/추가 방법
     아래 POSTS 배열에 항목을 추가하면 소식 페이지와 홈 '최근 소식'에
     자동으로 나타납니다. 빌드 과정이 필요 없습니다.

     {
       category: "소식",            // 소식 | 보도자료 | 프로젝트 | 공지사항
       title: "글 제목",
       date: "2026-06-30",          // YYYY-MM-DD
       body: "본문 내용...",         // 기존 사이트에서 옮겨올 본문 (선택)
       link: "https://..."          // 외부 원문 링크가 있으면 (선택)
     }

   ※ 아래 항목들은 기존 꿈들.com 관리자 화면에서 확인된 실제 게시글
     제목/분류입니다. 본문(body)은 기존 사이트에서 옮겨와 채워주세요.
   ========================================================= */

var POSTS = [
  {
    category: "소식",
    title: "2025년 기부금 사용 결과",
    date: "2026-06-01",
    body: "" // ← 기존 사이트 본문을 이곳에 붙여넣어 주세요.
  },
  {
    category: "소식",
    title: "제14회 교육성장 네트워크 꿈들 정기총회 결과보고",
    date: "2026-05-20",
    body: ""
  },
  {
    category: "프로젝트",
    title: "2026학년도 하늘오름어린이풍물단 5기 단원 모집",
    date: "2026-03-02",
    body: ""
  },
  {
    category: "소식",
    title: "2026년 교육성장네트워크 꿈들 정기총회 알림",
    date: "2026-02-10",
    body: ""
  },
  {
    category: "소식",
    title: "2024년 기부금 사용 결과",
    date: "2025-06-01",
    body: ""
  }
];

/* ---------- 렌더링 헬퍼 (페이지에서 호출) ---------- */
function renderPosts(targetId, opts) {
  opts = opts || {};
  var list = POSTS.slice().sort(function (a, b) {
    return a.date < b.date ? 1 : -1; // 최신순
  });
  if (opts.category && opts.category !== "전체") {
    list = list.filter(function (p) { return p.category === opts.category; });
  }
  if (opts.limit) list = list.slice(0, opts.limit);

  var el = document.getElementById(targetId);
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<li style="padding:24px;color:#5b616e">등록된 글이 없습니다.</li>';
    return;
  }

  el.innerHTML = list.map(function (p) {
    var href = p.link ? p.link : "javascript:void(0)";
    var ext = p.link ? ' target="_blank" rel="noopener"' : "";
    return (
      '<li><a class="post" href="' + href + '"' + ext + ">" +
        '<span class="tag t-' + p.category + '">' + p.category + "</span>" +
        '<span class="title">' + p.title + "</span>" +
        '<span class="date">' + p.date.replace(/-/g, ".") + "</span>" +
      "</a></li>"
    );
  }).join("");
}
