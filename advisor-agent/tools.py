from google.adk.tools import FunctionTool
import PyPDF2
import os
import glob


def process_pdf(pdf_path: str) -> dict:
    """Extracts text from a PDF file.
    
    Args:
        pdf_path (str): Path to the PDF file.
    Returns:
        dict: Contains extracted text and metadata.
    """
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return {
                "filename": os.path.basename(pdf_path),
                "text": text,
                "status": "success"
            }
    except Exception as e:
        return {"filename": pdf_path, "status": "error", "error": str(e)}

pdf_tool = FunctionTool(fn=process_pdf)

def index_pdfs():
    pdf_files = glob.glob("pdfs/*.pdf")
    res_pdfs = []
    for pdf in pdf_files:
        result = process_pdf(pdf)
        if result["status"] == "success":
            res_pdfs.append(result)
    return res_pdfs

def search_pdfs(query: str, res_pdfs: list) -> list:
    """Search PDFs for query-relevant snippets."""
    results = []
    for doc in res_pdfs:
        if query.lower() in doc["text"].lower():
            results.append(doc["text"][:500])  # Limit length
    return results

search_tool = FunctionTool(fn=search_pdfs)