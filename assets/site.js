/* =========================================================
   공통 헤더/푸터 주입 + 네비게이션 동작
   각 페이지의 <div id="site-header"></div>, <div id="site-footer"></div>
   위치에 자동으로 삽입됩니다. (빌드 도구 불필요)
   ========================================================= */

(function () {
  // 현재 파일명 (예: index.html, news.html)
  var path = location.pathname.split("/").pop() || "index.html";

  var NAV = [
    { href: "index.html", label: "홈" },
    { label: "단체소개", children: [
      { href: "about.html", label: "인사말·미션" },
      { href: "about.html#history", label: "연혁" },
      { href: "about.html#org", label: "조직·구성" },
      { href: "bylaws.html", label: "정관·투명운영" },
      { href: "contact.html", label: "오시는 길·문의" }
    ]},
    { label: "사업안내", children: [
      { href: "programs.html", label: "사업 한눈에 보기" },
      { href: "programs.html#gongbubang", label: "푸른꿈 작은 공부방" },
      { href: "programs.html#ggumgyosil", label: "꿈꾸는 교실" },
      { href: "programs.html#gamsu", label: "감수성 훈련" },
      { href: "programs.html#pungmul", label: "하날오름어린이풍물단" }
    ]},
    { label: "소식", children: [
      { href: "news.html", label: "소식·보도자료" },
      { href: "gallery.html", label: "활동 갤러리" }
    ]},
    { href: "board.html", label: "프로젝트 게시판" },
    { label: "참여하기", children: [
      { href: "sponsor.html", label: "후원안내" },
      { href: "apply.html", label: "강의·프로그램 신청" },
      { href: "contact.html", label: "자원봉사·문의" }
    ]}
  ];

  // 현재 페이지가 이 메뉴(또는 하위)에 속하는지
  function isActive(n) {
    if (n.href && n.href.split("#")[0] === path) return true;
    if (n.children) return n.children.some(function (c) { return c.href.split("#")[0] === path; });
    return false;
  }

  function navLinks() {
    return NAV.map(function (n) {
      var active = isActive(n) ? " active" : "";
      if (n.children) {
        var sub = n.children.map(function (c) {
          return '<li><a href="' + c.href + '">' + c.label + "</a></li>";
        }).join("");
        return '<li class="has-sub' + active + '">' +
          '<a href="' + (n.children[0].href) + '" class="sub-toggle">' + n.label + ' <i class="caret">▾</i></a>' +
          '<ul class="sub-menu">' + sub + "</ul></li>";
      }
      return '<li><a href="' + n.href + '"' + (active ? ' class="active"' : "") + ">" + n.label + "</a></li>";
    }).join("");
  }

  var headerHTML =
    '<header class="site-header"><div class="container nav">' +
      '<a class="brand" href="index.html">' +
        '<img class="logo-img" src="assets/img/brand/logo-symbol.png" alt="교육성장네트워크 꿈들 로고" />' +
        '<span>교육성장네트워크 꿈들<small>아이의 꿈이 자라는 교육 공동체</small></span>' +
      "</a>" +
      '<button class="nav-toggle" aria-label="메뉴 열기"><span></span><span></span><span></span></button>' +
      '<ul class="nav-links">' + navLinks() +
        '<li><a class="btn btn--primary" href="sponsor.html">후원하기</a></li>' +
      "</ul>" +
    "</div></header>";

  var footerHTML =
    '<footer class="site-footer"><div class="container">' +
      '<div class="foot-grid">' +
        "<div>" +
          "<h4>교육성장네트워크 꿈들</h4>" +
          '<p class="muted">아동·청소년 교육 성장과 지역 문화를 잇는<br>비영리 민간단체입니다.<br>하날오름어린이풍물단을 운영합니다.</p>' +
        "</div>" +
        "<div>" +
          "<h4>바로가기</h4>" +
          '<p class="muted">' +
            '<a href="about.html">단체소개</a><br>' +
            '<a href="programs.html">사업안내</a><br>' +
            '<a href="news.html">소식</a><br>' +
            '<a href="board.html">프로젝트 게시판</a><br>' +
            '<a href="apply.html">강의·프로그램 신청</a><br>' +
            '<a href="bylaws.html">정관·기부금 공개</a>' +
          "</p>" +
        "</div>" +
        "<div>" +
          "<h4>문의 · 후원</h4>" +
          '<p class="muted">전화 : <a href="tel:010-2344-4373">010-2344-4373</a><br>' +
          '이메일 : <a href="mailto:pukum20171028@gmail.com">pukum20171028@gmail.com</a><br>' +
          "주소 : 제주특별자치도 제주시 동문로21길 10<br>" +
          "후원계좌 : 농협 301-0207-2141-41<br>" +
          "<span style=\"font-size:.86rem\">(예금주 : 교육성장네트워크 꿈들)</span></p>" +
        "</div>" +
      "</div>" +
      '<div class="copy">© ' + "2026 교육성장네트워크 꿈들 (꿈들). All rights reserved." +
      " &nbsp;·&nbsp; 본 사이트는 비영리 단체 소개용입니다.</div>" +
    "</div></footer>";

  function inject(id, html) {
    var el = document.getElementById(id);
    if (el) el.outerHTML = html;
  }

  inject("site-header", headerHTML);
  inject("site-footer", footerHTML);

  // 모바일 메뉴 토글
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
  }

  // 모바일: 상위 메뉴 탭 시 하위 메뉴 펼치기(아코디언)
  document.querySelectorAll(".has-sub > .sub-toggle").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (window.matchMedia("(max-width: 860px)").matches) {
        e.preventDefault();
        a.parentNode.classList.toggle("open");
      }
    });
  });
})();
