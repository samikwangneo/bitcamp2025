import glob
import re
import os
import pdfplumber
from google.adk.tools import FunctionTool

def process_pdf(pdf_path: str) -> dict:
    """Extracts text from a PDF file."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""
            return {
                "filename": os.path.basename(pdf_path),
                "text": text,
                "status": "success",
                "subtopic": os.path.basename(os.path.dirname(pdf_path))  # e.g., '4XX', 'Honors', 'STIC'
            }
    except Exception as e:
        return {"filename": pdf_path, "status": "error", "error": str(e)}

pdf_tool = FunctionTool(process_pdf)

def index_pdfs():
    """Indexes all PDFs in pdfs/ subfolders (4XX, Honors, STIC)."""
    pdf_data = []
    subfolders = ["4XX", "Honors", "STIC"]
    script_dir = os.path.dirname(__file__)
    for subfolder in subfolders:
        search_pattern = os.path.join(script_dir, "pdfs", subfolder, "*.pdf")
        pdf_paths = glob.glob(search_pattern)
        for pdf_path in pdf_paths:
            result = process_pdf(pdf_path)
            if result["status"] == "success":
                pdf_data.append(result)
            else:
                print(f"Failed to process {pdf_path}: {result['error']}")
    return pdf_data

def determine_subtopics(query: str) -> list:
    """Determines which subfolders to search based on query keywords."""
    query = query.lower()
    subtopics = []
    
    # Keywords for each subtopic
    if re.search(r'\b(400-level|senior|cmsc4[0-9]{2})\b', query):
        subtopics.append("4XX")
    if re.search(r'\b(honors|distinguished|cmsc499)\b', query):
        subtopics.append("Honors")
    if re.search(r'\b(stic|student-taught|special topics|cmsc198)\b', query):
        subtopics.append("STIC")
    
    # If no specific subtopics matched, search all
    if not subtopics:
        subtopics = ["4XX", "Honors", "STIC"]
    
    return subtopics

def search_pdfs(query: str, pdf_data: list) -> list:
    """Searches PDF data for query-relevant information, filtering by subtopic."""
    subtopics = determine_subtopics(query)
    results = []
    query_lower = query.lower()
    query_keywords = set(query_lower.split())
    
    for doc in pdf_data:
        if doc["subtopic"] in subtopics:
            # Simple search - look for query keywords in the document text
            doc_text = doc["text"].lower()
            # If the full query is in the text or any keyword longer than 2 chars
            if query_lower in doc_text or any(keyword in doc_text for keyword in query_keywords if len(keyword) > 2):
                # Add relevant context with the filename
                context = f"[{doc['filename']}] Found relevant information: " + doc["text"][:500]
                if len(doc["text"]) > 500:
                    context += "... (additional content available)"
                results.append(context)
    
    # Limit total results
    return results  # Return top 5 most relevant pieces of information

# Keep search_tool definition out for now, will be created in agent.py
# search_tool = FunctionTool(search_pdfs)