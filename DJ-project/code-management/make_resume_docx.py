#!/usr/bin/env python3
import html
import sys
import zipfile
from pathlib import Path


def xml_escape(text):
    return html.escape(text, quote=False)


def paragraph(text, style="Normal", bold=False, center=False, spacing_after="80", indent=False):
    jc = '<w:jc w:val="center"/>' if center else ""
    ind = '<w:ind w:left="360" w:hanging="0"/>' if indent else ""
    p_style = f'<w:pStyle w:val="{style}"/>' if style else ""
    b = "<w:b/>" if bold else ""
    return (
        "<w:p>"
        f"<w:pPr>{p_style}{jc}{ind}<w:spacing w:after=\"{spacing_after}\"/></w:pPr>"
        "<w:r>"
        f"<w:rPr>{b}</w:rPr>"
        f"<w:t>{xml_escape(text)}</w:t>"
        "</w:r>"
        "</w:p>"
    )


def parse_markdown(path):
    body = []
    for raw_line in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("# "):
            body.append(paragraph(line[2:], style="Title", bold=True, center=True, spacing_after="40"))
        elif line.startswith("## "):
            body.append(paragraph(line[3:], style="Heading2", bold=True, spacing_after="80"))
        elif line.startswith("### "):
            body.append(paragraph(line[4:], style="Heading3", bold=True, spacing_after="60"))
        elif line.startswith("- "):
            body.append(paragraph("- " + line[2:], style="Normal", spacing_after="40", indent=True))
        else:
            body.append(paragraph(line, style="Normal", spacing_after="80"))
    return "".join(body)


def document_xml(body):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
'''


CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
'''


RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'''


DOC_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
'''


STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="80"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="160" w:after="60"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="Heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr>
  </w:style>
</w:styles>
'''


def write_docx(markdown_path, docx_path):
    body = parse_markdown(markdown_path)
    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", CONTENT_TYPES)
        docx.writestr("_rels/.rels", RELS)
        docx.writestr("word/_rels/document.xml.rels", DOC_RELS)
        docx.writestr("word/styles.xml", STYLES)
        docx.writestr("word/document.xml", document_xml(body))


def main():
    if len(sys.argv) != 3:
        print("Usage: make_resume_docx.py input.md output.docx", file=sys.stderr)
        return 2
    write_docx(sys.argv[1], sys.argv[2])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
