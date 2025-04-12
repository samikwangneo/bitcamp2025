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
                "subtopic": os.path.basename(os.path.dirname(pdf_path))  # Keep for organizational info only
            }
    except Exception as e:
        return {"filename": pdf_path, "status": "error", "error": str(e)}

pdf_tool = FunctionTool(process_pdf)

def index_pdfs():
    """Indexes all PDFs in all pdfs/ subfolders."""
    pdf_data = []
    script_dir = os.path.dirname(__file__)
    pdfs_dir = os.path.join(script_dir, "pdfs")
    
    # Get all subdirectories in the pdfs directory
    try:
        # List all items in the pdfs directory
        subfolders = [f for f in os.listdir(pdfs_dir) 
                     if os.path.isdir(os.path.join(pdfs_dir, f))]
        
        if not subfolders:
            print(f"Warning: No subdirectories found in {pdfs_dir}")
            
        # Process each subfolder
        for subfolder in subfolders:
            print(f"Scanning subfolder: {subfolder}")
            search_pattern = os.path.join(pdfs_dir, subfolder, "*.pdf")
            pdf_paths = glob.glob(search_pattern)
            
            if not pdf_paths:
                print(f"No PDFs found in {subfolder}")
                continue
                
            print(f"Found {len(pdf_paths)} PDFs in {subfolder}")
            for pdf_path in pdf_paths:
                result = process_pdf(pdf_path)
                if result["status"] == "success":
                    pdf_data.append(result)
                else:
                    print(f"Failed to process {pdf_path}: {result['error']}")
    except Exception as e:
        print(f"Error accessing pdfs directory: {e}")
        
    return pdf_data

def search_pdfs(query: str, pdf_data: list) -> list:
    """Searches all PDF data for query-relevant information, regardless of subfolder."""
    results = []
    query_lower = query.lower()
    query_keywords = set(query_lower.split())
    # Remove very common words and short words
    query_keywords = {k for k in query_keywords if len(k) > 2 and k not in {'the', 'and', 'for', 'are', 'you', 'not', 'but', 'with', 'can'}}
    
    # Search through all PDFs regardless of subtopic
    for doc in pdf_data:
        doc_text = doc["text"].lower()
        
        # Check if the query or keywords appear in the document at all
        if query_lower in doc_text or any(keyword in doc_text for keyword in query_keywords):
            # Split document into paragraphs (better context than arbitrary character cuts)
            paragraphs = [p.strip() for p in doc["text"].split('\n\n') if p.strip()]
            
            # Find paragraphs containing query terms
            relevant_paragraphs = []
            for paragraph in paragraphs:
                paragraph_lower = paragraph.lower()
                # Check for full query or multiple keywords
                if query_lower in paragraph_lower or sum(1 for k in query_keywords if k in paragraph_lower) >= 1:
                    relevant_paragraphs.append(paragraph)
            
            # If we found relevant paragraphs, use those
            if relevant_paragraphs:
                # Join up to 3 most relevant paragraphs with context indicators
                # Include subtopic in the result for informational purposes
                context = f"[{doc['filename']} ({doc['subtopic']})] " + " [...] ".join(relevant_paragraphs[:3])
                results.append(context)
            else:
                # Fallback to the beginning of the document if no specific paragraphs match
                context = f"[{doc['filename']} ({doc['subtopic']})] Document contains relevant information: " + doc["text"][:800]
                if len(doc["text"]) > 800:
                    context += "... (continued)"
                results.append(context)
    
    # If no results found, try a more lenient search
    if not results and query_keywords:
        print("No exact matches found, trying lenient search...")
        for doc in pdf_data:
            doc_text = doc["text"].lower()
            # Check if ANY keyword appears
            if any(keyword in doc_text for keyword in query_keywords):
                context = f"[{doc['filename']} ({doc['subtopic']})] May contain related information: " + doc["text"][:500]
                if len(doc["text"]) > 500:
                    context += "... (continued)"
                results.append(context)
    
    # Include search metadata
    if results:
        results.insert(0, f"Found {len(results)} relevant documents")
    else:
        results = ["No information found matching your query in any PDF documents."]
        
    # Return top results (increased from 5 to 10 to provide more comprehensive information)
    return results[:10]

# Keep search_tool definition out for now, will be created in agent.py
# search_tool = FunctionTool(search_pdfs)