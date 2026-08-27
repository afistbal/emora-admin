from __future__ import annotations

import argparse
from pathlib import Path

from docx import Document
from docx.document import Document as DocumentType
from docx.table import Table
from docx.text.paragraph import Paragraph


def iter_blocks(document: DocumentType):
    for child in document.element.body.iterchildren():
        if child.tag.endswith("}p"):
            yield Paragraph(child, document)
        elif child.tag.endswith("}tbl"):
            yield Table(child, document)


def clean(value: str) -> str:
    return " ".join(value.replace("\n", " ").split()).replace("|", "\\|")


def table_markdown(table: Table) -> list[str]:
    rows = [[clean(cell.text) for cell in row.cells] for row in table.rows]
    if not rows:
        return []
    width = max(len(row) for row in rows)
    rows = [row + [""] * (width - len(row)) for row in rows]
    header = rows[0]
    lines = [
        "| " + " | ".join(header) + " |",
        "|" + "|".join("---" for _ in range(width)) + "|",
    ]
    lines.extend("| " + " | ".join(row) + " |" for row in rows[1:])
    return lines


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()

    document = Document(args.source)
    lines = [
        "# Emora 后台需求文档（Word 原文抽取）",
        "",
        f"> 来源：`{args.source}`  ",
        "> 本文件按 Word 正文中的段落和表格顺序机械抽取，用于核对原始需求；开发口径与接口缺口见知识库覆盖矩阵。",
        "",
    ]

    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            text = clean(block.text)
            if not text:
                continue
            style_name = block.style.name if block.style else ""
            if style_name.startswith("Heading"):
                try:
                    level = min(6, max(2, int(style_name.split()[-1]) + 1))
                except ValueError:
                    level = 2
                lines.extend(["#" * level + " " + text, ""])
            else:
                lines.extend([text, ""])
        else:
            table_lines = table_markdown(block)
            if table_lines:
                lines.extend(table_lines + [""])

    args.destination.parent.mkdir(parents=True, exist_ok=True)
    args.destination.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
