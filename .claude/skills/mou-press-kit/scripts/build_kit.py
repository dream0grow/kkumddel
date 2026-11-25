"""협약 세트(업무협약서·보도자료)를 spec JSON 하나로 만든다.

사용법:
  python -I build_kit.py <spec.json> [--only mou|press] [--out <폴더>]

결과: <out>/<업무협약서>.hwpx, <out>/<보도자료>.hwpx  (한글 재저장 전 '원본')
그다음 hwp_export.ps1로 한글에서 열어 .hwp/.hwpx/.pdf로 다시 저장해 쪽수를 확인한다.
spec 형식은 reference/spec-format.md 참고.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hwpx_lib as H  # noqa: E402

HOST = {"name": "교육성장네트워크 꿈들", "short": "꿈들", "rep": "이한결", "phone": "010-5124-0101"}
WEEK = "월화수목금토일"


def spaced(name):
    """서명란 표기: 세 글자 이름은 '이 한 결'처럼 띄운다."""
    n = name.replace(" ", "")
    return " ".join(n) if len(n) == 3 else n


def parse_date(s):
    return dt.date.fromisoformat(s) if s else None


def ko_date(d):
    return f"{d.year}년 {d.month}월 {d.day}일" if d else "2026년      월      일"


def press_date(d):
    return f"{d.year}. {d.month}. {d.day}.({WEEK[d.weekday()]})" if d else "2026.   .   .(  )"


def names(spec):
    host = {**HOST, **spec.get("host", {})}
    partner = spec["partner"]
    return host, partner


def out_names(spec):
    host, partner = names(spec)
    p = partner["name"].replace(" ", "")
    topic = spec.get("topic", "업무협약").replace(" ", "")
    return {
        "mou": f"{topic}_업무협약서(MOU)_{host['short']}_{p}",
        "press": f"보도자료_{host['short']}_{p}_업무협약",
    }


# ---------------------------------------------------------------- 업무협약서
def build_mou(spec, out_path):
    host, partner = names(spec)
    m = spec["mou"]
    files = H.drop_preview(H.read_hwpx(os.path.join(H.skill_dir(), "templates", "mou_template.hwpx")))
    x = files[H.SECTION].decode("utf-8")
    pre, ps, post = H.split_section(x)
    T = [H.text(p) for p in ps]

    i_title = H.first(ps, lambda p: H.text(p).strip(), 1, "제목")
    i_sub = H.first(ps, lambda p: H.text(p).strip(), i_title + 1, "부제")
    i_intro = H.first(ps, lambda p: H.text(p).strip(), i_sub + 1, "서문")
    i_blank = H.first(ps, lambda p: not H.text(p).strip() and "<hp:tbl" not in p, i_intro + 1, "빈 줄")
    i_head = H.first(ps, lambda p: re.match(r"제\d+조", H.text(p)), 0, "조문 제목")
    i_lead = i_head + 1
    i_item = H.first(ps, lambda p: re.match(r"  \d+\. ", H.text(p)), 0, "각 호(1. 2. …)")
    i_num = H.first(ps, lambda p: re.match(r" \d+\. ", H.text(p)), 0, "각 항( 1. 2. …)")
    i_date = H.first(ps, lambda p: re.match(r"\s*\d{4}년", H.text(p)), 0, "날짜")
    i_sig = H.first(ps, lambda p: "<hp:tbl" in p, i_date, "서명 표")
    if re.match(r"제\d+조|\s*\d+\.", T[i_lead]):
        raise ValueError("템플릿 제1조 다음 문단이 본문(머리 문장)이 아닙니다.")

    P = {k: ps[i] for k, i in dict(title=i_title, sub=i_sub, intro=i_intro, blank=i_blank,
                                     head=i_head, lead=i_lead, item=i_item, num=i_num, date=i_date).items()}
    doc = []
    add = lambda k, t="": doc.append(H.make(P[k], t))  # noqa: E731

    add("title", m["title"])
    add("sub", f"{host['name']} · {partner['name']}")
    add("blank")
    add("intro", " " + m["intro"].strip())
    add("blank")
    arts = m["articles"]
    for k, a in enumerate(arts):
        add("head", a["head"])
        if a.get("lead"):
            add("lead", " " + a["lead"].strip())
        for j, t in enumerate(a.get("items", []), 1):
            add("item", f"  {j}. {t}")
        for j, t in enumerate(a.get("nums", []), 1):
            add("num", f" {j}. {t}")
        if k < len(arts) - 1:
            add("blank")
    add("date", ko_date(parse_date(spec.get("event", {}).get("date"))))
    sig = H.replace_texts_in_order(ps[i_sig], [
        host["name"], partner["name"],
        f"대표 {spaced(host['rep'])} (인)", f"대표 {spaced(partner.get('rep') or '○○○')} (인)",
    ])
    out = pre + ps[0] + "".join(doc) + sig + "".join(ps[i_sig + 1:]) + post
    files[H.SECTION] = out.encode("utf-8")
    H.set_title(files, m["title"])
    H.write_hwpx(files, out_path)


# ---------------------------------------------------------------- 보도자료
def build_press(spec, out_path):
    host, partner = names(spec)
    pr = spec["press"]
    files = H.drop_preview(H.read_hwpx(os.path.join(H.skill_dir(), "templates", "press_template.hwpx")))
    x = files[H.SECTION].decode("utf-8")
    pre, ps, post = H.split_section(x)

    i_title = H.first(ps, lambda p: H.text(p).strip(), 1, "제목")
    i_sub = H.first(ps, lambda p: H.text(p).strip(), i_title + 1, "부제")
    i_gap = i_title + 1  # 제목과 부제 사이 빈 줄
    i_blank = i_sub + 1
    i_body = H.first(ps, lambda p: H.text(p).startswith(" "), i_sub + 1, "본문")
    i_sec = H.first(ps, lambda p: H.text(p).startswith("■"), 0, "■ 소제목")
    P = dict(title=ps[i_title], gap=ps[i_gap], sub=ps[i_sub], blank=ps[i_blank], body=ps[i_body], sec=ps[i_sec])

    header = ps[0]
    d = parse_date(pr.get("date"))
    header = re.sub(r"<hp:t>\d{4}\.[^<]*\)</hp:t>", f"<hp:t>{H.esc(press_date(d))}</hp:t>", header, count=1)
    header = header.replace("010-5124-0101", host["phone"])

    doc = [header]
    add = lambda k, t="": doc.append(H.make(P[k], t))  # noqa: E731
    add("title", pr["title"])
    add("gap")
    add("sub", pr["subtitle"])
    add("blank")
    add("blank")
    for t in pr["paragraphs"]:
        if not t.strip():
            add("blank")
        elif t.lstrip().startswith("■"):
            add("sec", t.strip())
        elif t.lstrip().startswith("※"):
            add("body", t.strip())
        else:
            add("body", " " + t.strip())
    add("blank")
    files[H.SECTION] = (pre + "".join(doc) + post).encode("utf-8")
    H.set_title(files, pr["title"])
    H.write_hwpx(files, out_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--only", choices=["mou", "press"])
    ap.add_argument("--out", help="결과 폴더 (기본: spec의 output_dir)")
    a = ap.parse_args()
    spec = json.load(open(a.spec, encoding="utf-8"))
    out = a.out or spec.get("output_dir") or os.path.dirname(os.path.abspath(a.spec))
    os.makedirs(out, exist_ok=True)
    nm = out_names(spec)
    made = []
    if a.only in (None, "mou") and "mou" in spec:
        p = os.path.join(out, nm["mou"] + "_raw.hwpx")
        build_mou(spec, p)
        made.append(p)
    if a.only in (None, "press") and "press" in spec:
        p = os.path.join(out, nm["press"] + "_raw.hwpx")
        build_press(spec, p)
        made.append(p)
    out = json.dumps({"made": made, "names": nm}, ensure_ascii=False, indent=1)
    sys.stdout.buffer.write(out.encode("utf-8"))


if __name__ == "__main__":
    main()
