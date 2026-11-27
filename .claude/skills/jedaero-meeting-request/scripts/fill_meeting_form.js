// 제대로 산학1번지 — 회의비 사용신청 양식 채우기 (Aside REPL용)
//
// 쓰는 법: 아래 REQ 값만 바꿔서 이 파일 전체를 mcp__aside__repl 의 code 로 넘긴다.
// 이 스크립트는 양식을 "채우고 검증값을 출력"하는 데까지만 한다. 제출은 SKILL.md 4단계에서 따로 한다.
// 같은 REPL 세션에서 두 번 돌리면 const 가 겹치므로, 다시 돌릴 때는 변수 이름 뒤 숫자(_1)를 바꾼다.

const REQ_1 = {
  date: "2026-12-05",          // YYYY-MM-DD
  startHour: 14, startMin: 0,  // 시 9~22, 분은 10분 단위
  endHour: 18, endMin: 0,      // 시 9~21
  place: "장소",
  purpose: "목적 한 줄",
  content: "내용 (여러 줄)",
  amount: 900000,              // 숫자만
  people: [
    // ["소속", "직급", "성명"] — 첫 줄은 꿈들 대표
  ],
};

// 0) 금지 글자 검사 — 이 사이트는 ' " < > & 를 &apos; 같은 글자로 바꿔 저장해 화면에 그대로 드러난다
const badFields_1 = [
  ["장소", REQ_1.place], ["목적", REQ_1.purpose], ["내용", REQ_1.content],
  ...REQ_1.people.map((p, i) => [`참석자 ${i + 1}`, p.join(" ")]),
].filter(([, v]) => /['"<>&‘’“”]/.test(v)).map(([k]) => k);
if (badFields_1.length) throw new Error("따옴표·꺾쇠·& 가 들어 있음 → 빼고 다시: " + badFields_1.join(", "));

// 1) 프로그램 운영정보(main.do) 탭 찾기 — 없으면 마이페이지에서 프로그램을 눌러 연다
const findMain_1 = async () =>
  (await listBrowserTabs()).find((t) => /\/Platform\/prj\/(main|budget)\.do/.test(t.url));
let mainTab_1 = await findMain_1();
if (!mainTab_1) {
  const listPage_1 = await openTab("https://jedaero.jejunu.ac.kr/My/program/active.do");
  if (/login/i.test(listPage_1.url())) throw new Error("로그인이 풀려 있음 — 선생님께 로그인 요청");
  // 이 브라우저는 :has-text / :text-is 가 잘 안 먹는다 — DOM 에서 찾아 표시를 붙인 뒤 누른다
  await listPage_1.evaluate(() => {
    const tr = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes("우리회사 리빙랩"));
    if (tr) tr.setAttribute("data-prj-row", "1");
  });
  await listPage_1.locator('tr[data-prj-row="1"]').click(); // 새 탭(main.do)이 열린다
  await sleep(2500);
  mainTab_1 = await findMain_1();
  await closeTab(listPage_1);
}
if (!mainTab_1) throw new Error("프로그램 운영정보 탭을 찾지 못함");
const pm_1 = await attachBrowserTab(mainTab_1.targetId);

// 2) 예산사용관리 → 회의비 줄의 "사용신청"
await pm_1.locator('a:has-text("예산사용관리")').first().click();
await sleep(1500);
const budgetRow_1 = await pm_1.evaluate(() => {
  const isApply = (a) => a.innerText.trim() === "사용신청";
  const tr = [...document.querySelectorAll("tr")].find(
    (r) => r.cells[0] && r.cells[0].innerText.trim() === "회의비" && [...r.querySelectorAll("a")].some(isApply),
  );
  if (!tr) return null;
  [...tr.querySelectorAll("a")].find(isApply).setAttribute("data-meeting-apply", "1");
  return [...tr.cells].map((c) => c.innerText.trim()).join(" | ");
});
if (!budgetRow_1) throw new Error("예산현황에서 회의비 줄을 찾지 못함");
console.log("회의비 예산 줄(구분|확정|집행|잔액|집행률):", budgetRow_1);
await pm_1.locator('a[data-meeting-apply="1"]').click();
await sleep(2500);
const form_1 = pm_1.frames().find((f) => /budgetUseView/.test(f.url()));
if (!form_1) throw new Error("회의비 사용신청 양식(budgetUseView.do)이 열리지 않음");

// 3) 참석자 줄 늘리기 (+추가는 한 번에 한 줄)
const addBtn_1 = form_1.locator('input[type=button][value="+추가"]');
for (let i = 1; i < REQ_1.people.length; i++) await addBtn_1.click();

// 4) 값 채우기
await form_1.locator("#startHour").selectOption(String(REQ_1.startHour));
await form_1.locator("#startMin").selectOption(String(REQ_1.startMin));
await form_1.locator("#endHour").selectOption(String(REQ_1.endHour));
await form_1.locator("#endMin").selectOption(String(REQ_1.endMin));
await form_1.locator('input[name="location"]').fill(REQ_1.place);
await form_1.locator('input[name="usePur"]').fill(REQ_1.purpose);
await form_1.locator('textarea[name="useSummery"]').fill(REQ_1.content);
await form_1.locator('input[name="useAppVal"]').fill(String(REQ_1.amount));

// 날짜 칸은 읽기 전용 달력이라 DOM 으로 직접 넣는다. 실제로 전송되는 값은 숨은 칸 useBngDe / useEndDe.
// (evaluate 안에서는 document.budgetForm 이나 페이지 함수가 안 보인다 — querySelector 만 쓴다)
const check_1 = await form_1.evaluate((r) => {
  const q = (s) => document.querySelector(s);
  const p2 = (n) => String(n).padStart(2, "0");
  const mins = r.endHour * 60 + r.endMin - (r.startHour * 60 + r.startMin);
  q("#bgnDe").value = r.date;
  q('input[name="useBngDe"]').value = `${r.date} ${p2(r.startHour)}:${p2(r.startMin)}`;
  q('input[name="useEndDe"]').value = `${r.date} ${p2(r.endHour)}:${p2(r.endMin)}`;
  q("#diffTime").innerText = `[ 총 ${p2(Math.floor(mins / 60))}시간 ${p2(mins % 60)}분 ]`;
  const rows = [...document.querySelectorAll("#coTbb tr")].filter((tr) => tr.querySelector("input[type=text]"));
  rows.forEach((tr, i) => {
    const t = tr.querySelectorAll("input[type=text]");
    if (r.people[i]) [t[0].value, t[1].value, t[2].value] = r.people[i];
  });
  return {
    참석자수: rows.length,
    참석자: rows.map((tr) => [...tr.querySelectorAll("input[type=text]")].map((x) => x.value).join(" / ")),
    시작: q('input[name="useBngDe"]').value,
    종료: q('input[name="useEndDe"]').value,
    장소: q('input[name="location"]').value,
    목적: q('input[name="usePur"]').value,
    소요예산: q('input[name="useAppVal"]').value,
    내용글자수: q('textarea[name="useSummery"]').value.length,
  };
}, REQ_1);
console.log(JSON.stringify(check_1, null, 1));
if (check_1.참석자수 !== REQ_1.people.length) throw new Error("참석자 줄 수가 맞지 않음 — 제출하지 말 것");
