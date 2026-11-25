"""HWPX 문단 단위 편집 도구 (표준 라이브러리만 사용).

템플릿 HWPX의 문단을 '역할'(제목·조문 제목·본문 등)로 찾아 원형(prototype)으로 삼고,
그 서식을 그대로 복제해 새 글을 채운다. 줄 배치(linesegarray)는 만들지 않으며,
한글로 다시 저장(hwp_export.ps1)하면 한글이 다시 계산한다.
"""
import os
import re
import zipfile

SECTION = "Contents/section0.xml"


def read_hwpx(path):
    with zipfile.ZipFile(path) as z:
        return {n: z.read(n) for n in z.namelist()}


def write_hwpx(files, path):
    """mimetype을 맨 앞에 무압축으로 넣어야 한글이 연다."""
    with zipfile.ZipFile(path, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), files["mimetype"], compress_type=zipfile.ZIP_STORED)
        for n, data in files.items():
            if n == "mimetype":
                continue
            z.writestr(n, data, compress_type=zipfile.ZIP_DEFLATED)


def drop_preview(files):
    """미리보기(옛 글·그림)는 지운다. 한글이 다시 저장할 때 새로 만든다."""
    return {n: d for n, d in files.items() if not n.startswith("Preview/")}


def split_section(x):
    """(앞부분, [최상위 문단 XML...], 뒷부분). 표 안의 문단은 바깥 문단에 포함된다."""
    start = x.index(">", x.index("<hs:sec")) + 1
    end = x.rindex("</hs:sec>")
    body = x[start:end]
    paras, depth, s = [], 0, None
    for m in re.finditer(r"<hp:p\b|</hp:p>", body):
        if m.group(0) == "</hp:p>":
            depth -= 1
            if depth == 0:
                paras.append(body[s:m.end()])
        else:
            if depth == 0:
                s = m.start()
            depth += 1
    return x[:start], paras, x[end:]


def text(p):
    t = "".join(re.findall(r"<hp:t>(.*?)</hp:t>", p, re.S))
    return unesc(re.sub(r"<[^>]+>", "", t))


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def unesc(s):
    return s.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")


_next_id = [1500000000]


def make(proto, t):
    """proto 문단의 문단 서식·첫 글자 서식으로 t 한 줄짜리 새 문단을 만든다."""
    head = re.match(r"<hp:p\b[^>]*>", proto).group(0)
    _next_id[0] += 7
    head = re.sub(r' id="\d+"', f' id="{_next_id[0]}"', head, count=1)
    head = re.sub(r' pageBreak="1"', ' pageBreak="0"', head)
    cp = re.findall(r'<hp:run charPrIDRef="(\d+)"', proto)[0]
    tx = f"<hp:t>{esc(t)}</hp:t>" if t else "<hp:t/>"
    return f'{head}<hp:run charPrIDRef="{cp}">{tx}</hp:run></hp:p>'


def replace_texts_in_order(xml, values):
    """xml 안의 <hp:t>…</hp:t>를 순서대로 values로 바꾼다(개수가 같아야 한다)."""
    found = re.findall(r"<hp:t>.*?</hp:t>", xml, re.S)
    if len(found) != len(values):
        raise ValueError(f"글 칸 수가 다릅니다: 템플릿 {len(found)}개, 입력 {len(values)}개")
    it = iter(values)
    return re.sub(r"<hp:t>.*?</hp:t>", lambda m: f"<hp:t>{esc(next(it))}</hp:t>", xml, flags=re.S)


def first(paras, pred, start=0, what=""):
    for i in range(start, len(paras)):
        if pred(paras[i]):
            return i
    raise ValueError(f"템플릿에서 '{what}' 문단을 찾지 못했습니다.")


def set_title(files, title):
    k = "Contents/content.hpf"
    if k in files:
        s = files[k].decode("utf-8")
        s = re.sub(r"<opf:title>.*?</opf:title>", f"<opf:title>{esc(title)}</opf:title>", s, flags=re.S)
        files[k] = s.encode("utf-8")


def skill_dir():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
