"""보도자료 메일 준비 도구.

  # 1) 출입 언론사 명단(xlsx)을 개인 폴더의 CSV로 가져오기 (저장소에는 절대 넣지 않는다)
  python -I mail_kit.py import-contacts <명단.xlsx> [--csv <경로>]

  # 2) 메일 한 통 준비: 제목·본문·받는 사람(숨은참조)·첨부 목록을 JSON으로 출력
  python -I mail_kit.py prepare <spec.json> --press <보도자료.hwpx> [--photo <사진> ...] [--csv <경로>] [--eml <저장할.eml>]

prepare 결과 JSON을 그대로 Gmail 초안 만들기(create_draft)에 넘긴다.
  - bcc: 언론사 주소 전부 (서로의 주소가 보이지 않게 숨은참조)
  - attachments: filename + "sha256:<해시>:<절대경로>" 파일 참조
--eml을 주면 메일 프로그램(아웃룩 등)에서 열어 바로 보낼 수 있는 .eml 파일도 만든다.
메일은 절대 자동 발송하지 않는다. 초안을 만든 뒤 선생님이 확인하고 직접 보낸다.
"""
import argparse
import csv
import hashlib
import json
import mimetypes
import os
import re
import sys
from email.message import EmailMessage

DEFAULT_CSV = os.path.join(os.path.expanduser("~"), ".claude", "press-kit", "press_contacts_jeju.csv")
LIMIT = 25 * 1024 * 1024
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
# 명단에서 오타가 의심되는 도메인 → 사람이 확인할 것 (자동으로 고치지 않는다)
SUSPECT = {"new1.kr": "news1.kr?", "segve.com": "segye.com?", "hanmil.net": "hanmail.net?", "hnai.co.kr": "hani.co.kr?"}

HOST_NAME = "교육성장네트워크 꿈들"
SIGN = "교육성장네트워크 꿈들 대표 이한결 올림"
CLOSING = "지역 교육 발전을 위한 이번 협약 소식이 널리 알려질 수 있도록 보도 검토를 부탁드립니다."


def import_contacts(xlsx, out_csv):
    import openpyxl  # 필요할 때만

    wb = openpyxl.load_workbook(xlsx, data_only=True)
    rows, seen, warn = [], set(), []
    for ws in wb:
        for r in ws.iter_rows(values_only=True):
            cells = [str(c).strip() for c in r if c is not None and str(c).strip()]
            mail = next((c for c in cells if "@" in c), None)
            if not mail:
                continue
            outlet = next((c for c in cells if c != mail), "")
            key = mail.lower()
            if key in seen:
                continue
            seen.add(key)
            if not EMAIL_RE.match(mail):
                warn.append(f"형식 오류: {outlet} {mail}")
            dom = mail.split("@")[-1].lower()
            if dom in SUSPECT:
                warn.append(f"도메인 확인 필요: {outlet} {mail} → {SUSPECT[dom]}")
            rows.append({"언론사": outlet, "이메일": mail})
    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    with open(out_csv, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["언론사", "이메일"])
        w.writeheader()
        w.writerows(rows)
    out = json.dumps({"csv": out_csv, "count": len(rows), "warnings": warn}, ensure_ascii=False, indent=1)
    sys.stdout.buffer.write(out.encode("utf-8"))


def load_contacts(path):
    if not os.path.exists(path):
        sys.exit(f"언론사 명단이 없습니다: {path}\n먼저 import-contacts로 가져오세요.")
    with open(path, encoding="utf-8-sig") as f:
        out = []
        for r in csv.DictReader(f):
            m = (r.get("이메일") or "").strip()
            if EMAIL_RE.match(m) and m.lower() not in {x.lower() for x in out}:
                out.append(m)
    return out


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def compose(spec, press_path, photos):
    mail = spec.get("mail", {})
    partner = mail.get("partner_name") or spec["partner"]["name"]
    press_name = os.path.basename(press_path)
    photo_part = "과 업무협약식 사진" if photos else ""
    subject = mail.get("subject") or f"[보도자료] {spec['press']['title']}"
    body = "\n".join([
        "안녕하세요.",
        f"{HOST_NAME}입니다.",
        "",
        f"{HOST_NAME}과 {partner}의 업무협약 체결과 관련하여 보도자료를 전달해 드립니다.",
        "",
        f"자세한 내용은 첨부해 드린 보도자료 파일({press_name}){photo_part}을 참고해 주시면 감사하겠습니다.",
        "",
        mail.get("closing") or CLOSING,
        "",
        "감사합니다.",
        "",
        SIGN,
    ])
    return subject, body


def prepare(a):
    spec = json.load(open(a.spec, encoding="utf-8"))
    files = [os.path.abspath(a.press)] + [os.path.abspath(p) for p in (a.photo or [])]
    for p in files:
        if not os.path.exists(p):
            sys.exit(f"첨부 파일이 없습니다: {p}")
    total = sum(os.path.getsize(p) for p in files)
    subject, body = compose(spec, a.press, a.photo)
    bcc = load_contacts(a.csv)
    att = [{"filename": os.path.basename(p),
            "content": f"sha256:{sha256(p)}:{p.replace(os.sep, '/')}",
            "mimeType": mimetypes.guess_type(p)[0] or "application/octet-stream"} for p in files]
    res = {"subject": subject, "body": body, "bcc": bcc, "bcc_count": len(bcc),
           "attachments": att, "total_mb": round(total / 1048576, 2),
           "over_limit": total > LIMIT}
    if a.eml:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["Bcc"] = ", ".join(bcc)
        msg["X-Unsent"] = "1"  # 아웃룩에서 '보내기 전 초안'으로 열림
        msg.set_content(body)
        for p in files:
            mt = (mimetypes.guess_type(p)[0] or "application/octet-stream").split("/")
            with open(p, "rb") as f:
                msg.add_attachment(f.read(), maintype=mt[0], subtype=mt[1], filename=os.path.basename(p))
        with open(a.eml, "wb") as f:
            f.write(bytes(msg))
        res["eml"] = os.path.abspath(a.eml)
    out = json.dumps(res, ensure_ascii=False, indent=1)
    sys.stdout.buffer.write(out.encode("utf-8"))


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    i = sub.add_parser("import-contacts")
    i.add_argument("xlsx")
    i.add_argument("--csv", default=DEFAULT_CSV)
    p = sub.add_parser("prepare")
    p.add_argument("spec")
    p.add_argument("--press", required=True)
    p.add_argument("--photo", action="append")
    p.add_argument("--csv", default=DEFAULT_CSV)
    p.add_argument("--eml")
    a = ap.parse_args()
    if a.cmd == "import-contacts":
        import_contacts(a.xlsx, a.csv)
    else:
        prepare(a)


if __name__ == "__main__":
    main()
