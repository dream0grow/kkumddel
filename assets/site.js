/* =========================================================
   공통 헤더/푸터 주입 + 네비게이션 동작
   각 페이지의 <div id="site-header"></div>, <div id="site-footer"></div>
   위치에 자동으로 삽입됩니다. (빌드 도구 불필요)
   ※ 메뉴 이름·푸터 문구는 assets/copy.js (common) 에서 바꿉니다.
   ========================================================= */

(function () {
  // 현재 파일명 (예: index.html, news.html)
  var path = location.pathname.split("/").pop() || "index.html";

  // 문구 가져오기 — assets/copy.js 에 값이 있으면 그것을, 없으면 기본값을 씁니다
  function T(key, fallback) { return window.KKUMDLE_T ? window.KKUMDLE_T(key, fallback) : fallback; }

  var NAV_DEFAULT = [
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
  var NAV = T("common.nav", NAV_DEFAULT);
  if (!Array.isArray(NAV) || !NAV.length) NAV = NAV_DEFAULT;
  var INFO = {
    tel: T("common.info.tel", "010-2344-4373"),
    address: T("common.info.address", "제주특별자치도 제주시 동문로21길 10"),
    bank: T("common.info.bank", "농협"),
    account: T("common.info.account", "301-0207-2141-41"),
    holder: T("common.info.accountHolder", "교육성장네트워크 꿈들")
  };
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
      return '<li><a href="' + n.href + '"' + (active ? ' class="active" aria-current="page"' : "") + ">" + n.label + "</a></li>";
    }).join("");
  }

  var headerHTML =
    '<header class="site-header"><div class="container nav">' +
      '<a class="brand" href="index.html">' +
        '<img class="logo-img" src="assets/img/brand/logo-symbol.png" alt="' + T("common.brand.logoAlt", "교육성장네트워크 꿈들 로고") + '" />' +
        '<span class="brand-name">' + T("common.brand.name", "교육성장네트워크 꿈들") +
          '<small>' + T("common.brand.tagline", "아이와 교사가 함께 자라는 곳 · 2006년부터") + '</small></span>' +
      "</a>" +
      '<button class="nav-toggle" aria-label="' + T("common.navToggleLabel", "메뉴 열기") + '"><span></span><span></span><span></span></button>' +
      '<ul class="nav-links">' + navLinks() +
        '<li><a class="btn btn--primary" href="sponsor.html">' + T("common.navDonate", "후원하기") + '</a></li>' +
      "</ul>" +
    "</div></header>";
  var FOOT_LINKS_DEFAULT = [
    { href: "about.html", label: "단체소개 · 걸어온 길" },
    { href: "programs.html", label: "하는 일" },
    { href: "news.html", label: "소식 · 기부금 사용 결과" },
    { href: "board.html", label: "프로젝트 게시판" },
    { href: "apply.html", label: "강의·프로그램 신청" },
    { href: "bylaws.html", label: "정관 전문 보기" }
  ];
  var footLinks = T("common.footer.links", FOOT_LINKS_DEFAULT);
  if (!Array.isArray(footLinks) || !footLinks.length) footLinks = FOOT_LINKS_DEFAULT;
  var footerHTML =
    '<footer class="site-footer"><div class="container">' +
      '<div class="foot-grid">' +
        "<div>" +
          "<h4>" + T("common.footer.aboutTitle", "교육성장네트워크 꿈들") + "</h4>" +
          '<p class="muted">' + T("common.footer.aboutText",
            "초등교육의 질적 향상과 교육복지 증진을 위해 일하는<br>" +
            "비영리민간단체입니다 (2015년 등록).<br>" +
            "푸른꿈 작은 공부방 · 꿈꾸는 교실 · 감수성 훈련 ·<br>하날오름어린이풍물단을 운영합니다.") + "</p>" +
        "</div>" +
        "<div>" +
          "<h4>" + T("common.footer.linksTitle", "바로가기") + "</h4>" +
          '<p class="muted">' +
            footLinks.map(function (l) { return '<a href="' + l.href + '">' + l.label + "</a>"; }).join("<br>") +
          "</p>" +
        "</div>" +
        "<div>" +
          "<h4>" + T("common.footer.contactTitle", "찾아오기 · 후원") + "</h4>" +
          '<p class="muted">' + T("common.footer.contactText",
            '전화 : <a href="tel:' + INFO.tel + '">' + INFO.tel + '</a><br>' +
            "주소 : " + INFO.address + "<br>" +
            "후원계좌 : " + INFO.bank + " " + INFO.account + "<br>" +
            '<span style="font-size:.86rem">(예금주 : ' + INFO.holder + ')</span>') + "</p>" +
        "</div>" +
      "</div>" +
      '<div class="copy">' + T("common.footer.copyright",
        '© 2026 교육성장네트워크 꿈들 &nbsp;·&nbsp; 이 홈페이지는 꿈들 식구들이 직접 만들고 고쳐 갑니다.') + '</div>' +
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
