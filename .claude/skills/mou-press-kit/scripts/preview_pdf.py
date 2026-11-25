"""PDF 쪽수를 확인하고 각 쪽을 PNG로 저장한다(눈으로 배치 확인용). PyMuPDF 필요.

사용법: python -I preview_pdf.py <파일.pdf> [<출력 폴더>]
"""
import os
import sys
import warnings

warnings.filterwarnings("ignore")
import fitz  # noqa: E402

pdf = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(pdf))
os.makedirs(out, exist_ok=True)
d = fitz.open(pdf)
base = os.path.splitext(os.path.basename(pdf))[0]
paths = []
for i, p in enumerate(d):
    path = os.path.join(out, f"{base}_p{i + 1}.png")
    p.get_pixmap(dpi=60).save(path)
    paths.append(path)
sys.stdout.buffer.write(("pages=%d\n" % len(d) + "\n".join(paths) + "\n").encode("utf-8"))
