import io
import re
from typing import Any


class DocumentParserService:
    """
    Multi-format document extractor and semantic chunking service.
    Supports PDF, DOCX, PPTX, and TXT files.
    Preserves page boundaries, slide numbers, and section headings.
    """

    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt"}

    def parse_document(self, file_bytes: bytes, filename: str) -> dict[str, Any]:
        ext = self._get_extension(filename)
        if ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported format '{ext}'. Supported formats: PDF, DOCX, PPTX, TXT."
            )

        if ext == ".pdf":
            return self._parse_pdf(file_bytes, filename)
        elif ext == ".docx":
            return self._parse_docx(file_bytes, filename)
        elif ext == ".pptx":
            return self._parse_pptx(file_bytes, filename)
        elif ext == ".txt":
            return self._parse_txt(file_bytes, filename)
        else:
            raise ValueError(f"Unknown extension: {ext}")

    def _get_extension(self, filename: str) -> str:
        parts = filename.rsplit(".", 1)
        if len(parts) < 2:
            return ""
        return f".{parts[1].lower()}"

    def _clean_text(self, text: str) -> str:
        """Normalizes unicode, whitespace, and strips zero-width/control artifacts."""
        if not text:
            return ""
        # Remove null bytes and non-printable control characters (except newlines/tabs)
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)
        # Collapse multiple empty lines
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Normalize continuous whitespace
        text = re.sub(r"[ \t]+", " ", text)
        return text.strip()

    def _parse_pdf(self, file_bytes: bytes, filename: str) -> dict[str, Any]:
        import pypdf

        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages_data = []
        full_text_parts = []

        total_pages = len(reader.pages)
        for idx, page in enumerate(reader.pages, start=1):
            raw_text = page.extract_text() or ""
            cleaned = self._clean_text(raw_text)
            if cleaned:
                # Infer heading from the first non-empty line
                first_line = cleaned.split("\n")[0][:120].strip()
                pages_data.append({
                    "page_number": idx,
                    "heading": first_line if len(first_line) > 3 else f"Page {idx}",
                    "text": cleaned,
                })
                full_text_parts.append(cleaned)

        return {
            "filename": filename,
            "file_type": "pdf",
            "page_count": total_pages,
            "pages": pages_data,
            "full_text": "\n\n".join(full_text_parts),
        }

    def _parse_docx(self, file_bytes: bytes, filename: str) -> dict[str, Any]:
        import docx

        doc = docx.Document(io.BytesIO(file_bytes))
        pages_data = []
        current_heading = "Introduction"
        current_text_blocks = []
        virtual_page = 1
        word_count = 0

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            if para.style and para.style.name and "Heading" in para.style.name:
                current_heading = text[:120]

            cleaned = self._clean_text(text)
            current_text_blocks.append(cleaned)
            word_count += len(cleaned.split())

            # Approximate virtual page every ~450 words
            if word_count >= 450:
                pages_data.append({
                    "page_number": virtual_page,
                    "heading": current_heading,
                    "text": "\n".join(current_text_blocks),
                })
                virtual_page += 1
                current_text_blocks = []
                word_count = 0

        # Remaining paragraphs
        if current_text_blocks:
            pages_data.append({
                "page_number": virtual_page,
                "heading": current_heading,
                "text": "\n".join(current_text_blocks),
            })

        all_text = "\n\n".join(p["text"] for p in pages_data)
        return {
            "filename": filename,
            "file_type": "docx",
            "page_count": max(1, len(pages_data)),
            "pages": pages_data,
            "full_text": all_text,
        }

    def _parse_pptx(self, file_bytes: bytes, filename: str) -> dict[str, Any]:
        import pptx

        prs = pptx.Presentation(io.BytesIO(file_bytes))
        pages_data = []
        full_text_parts = []

        for idx, slide in enumerate(prs.slides, start=1):
            slide_texts = []
            slide_heading = f"Slide {idx}"

            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        txt = paragraph.text.strip()
                        if txt:
                            slide_texts.append(txt)

            if slide_texts:
                slide_heading = slide_texts[0][:120]
                slide_body = "\n".join(slide_texts)
                cleaned = self._clean_text(slide_body)
                pages_data.append({
                    "page_number": idx,
                    "heading": slide_heading,
                    "text": cleaned,
                })
                full_text_parts.append(cleaned)

        return {
            "filename": filename,
            "file_type": "pptx",
            "page_count": max(1, len(prs.slides)),
            "pages": pages_data,
            "full_text": "\n\n".join(full_text_parts),
        }

    def _parse_txt(self, file_bytes: bytes, filename: str) -> dict[str, Any]:
        try:
            raw_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raw_text = file_bytes.decode("latin-1", errors="ignore")

        cleaned = self._clean_text(raw_text)
        paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]

        pages_data = []
        current_block = []
        current_words = 0
        page_num = 1
        heading = "Document Content"

        for p in paragraphs:
            current_block.append(p)
            current_words += len(p.split())
            if current_words >= 500:
                pages_data.append({
                    "page_number": page_num,
                    "heading": heading,
                    "text": "\n\n".join(current_block),
                })
                page_num += 1
                current_block = []
                current_words = 0

        if current_block:
            pages_data.append({
                "page_number": page_num,
                "heading": heading,
                "text": "\n\n".join(current_block),
            })

        return {
            "filename": filename,
            "file_type": "txt",
            "page_count": max(1, len(pages_data)),
            "pages": pages_data,
            "full_text": cleaned,
        }

    def chunk_document(
        self,
        parsed_doc: dict[str, Any],
        chunk_size: int = 700,
        chunk_overlap: int = 100,
    ) -> list[dict[str, Any]]:
        """
        Splits pages into semantic chunks while retaining page_number,
        heading context, and chunk indexing.
        """
        chunks = []
        global_chunk_idx = 0

        for page in parsed_doc.get("pages", []):
            page_num = page.get("page_number", 1)
            heading = page.get("heading", f"Page {page_num}")
            text = page.get("text", "")

            if not text:
                continue

            # Split by paragraph or sentence boundaries
            paragraphs = text.split("\n")
            current_chunk = ""

            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue

                if len(current_chunk) + len(para) + 1 <= chunk_size:
                    current_chunk = f"{current_chunk}\n{para}".strip()
                else:
                    if current_chunk:
                        chunks.append({
                            "chunk_index": global_chunk_idx,
                            "page_number": page_num,
                            "heading": heading,
                            "content": current_chunk,
                            "metadata": {
                                "filename": parsed_doc.get("filename"),
                                "page": page_num,
                                "heading": heading,
                            },
                        })
                        global_chunk_idx += 1
                        # Retain overlap from end of current_chunk
                        overlap_start = max(0, len(current_chunk) - chunk_overlap)
                        current_chunk = f"{current_chunk[overlap_start:]}\n{para}".strip()
                    else:
                        # Para itself is longer than chunk_size, split by characters
                        for i in range(0, len(para), chunk_size - chunk_overlap):
                            slice_txt = para[i : i + chunk_size]
                            chunks.append({
                                "chunk_index": global_chunk_idx,
                                "page_number": page_num,
                                "heading": heading,
                                "content": slice_txt,
                                "metadata": {
                                    "filename": parsed_doc.get("filename"),
                                    "page": page_num,
                                    "heading": heading,
                                },
                            })
                            global_chunk_idx += 1
                        current_chunk = ""

            if current_chunk:
                chunks.append({
                    "chunk_index": global_chunk_idx,
                    "page_number": page_num,
                    "heading": heading,
                    "content": current_chunk,
                    "metadata": {
                        "filename": parsed_doc.get("filename"),
                        "page": page_num,
                        "heading": heading,
                    },
                })
                global_chunk_idx += 1

        return chunks


document_parser = DocumentParserService()
