from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from .tools import pdf_tool, search_pdfs, index_pdfs

# Load PDF contents at startup
pdf_data = index_pdfs()

print(f"Loaded {len(pdf_data)} PDFs:")
# Write PDF contents to a file instead of printing to console
with open('advisor-agent/pdf_contents.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total PDFs loaded: {len(pdf_data)}\n\n")
    for doc in pdf_data:
        print(f"- {doc['filename']} ({doc['subtopic']})", flush=True)
        # Write to file instead of console
        f.write(f"{'='*80}\n")
        f.write(f"Filename: {doc['filename']} (Subtopic: {doc['subtopic']})\n")
        f.write(f"{'='*80}\n\n")
        f.write(doc['text'])
        f.write("\n\n")

print(f"PDF contents written to 'advisor-agent/pdf_contents.txt'")

# Create a wrapper function that includes pdf_data
def search_wrapper(query: str) -> list:
    """Search PDF data for relevant information."""
    return search_pdfs(query, pdf_data)

# Create the function tool
search_tool = FunctionTool(search_wrapper)

root_agent = LlmAgent(
    name="cs_advisor",
    model="gemini-2.0-flash-exp",
    description="An AI advisor for UMD CS major requirements.",
    instruction="""
You are an expert academic advisor for the University of Maryland's Computer Science major.
Answer questions about course requirements, prerequisites, electives, and degree planning using the provided PDF data from various categories like 400-level courses, honors programs, student-taught courses, research, independent study, and transfer information.

IMPORTANT SEARCH INFORMATION:
- Always use the search_pdfs tool first before answering any CS requirement questions.
- The search results will include document filenames and categories in [brackets] followed by relevant content.
- The search will automatically scan ALL available PDF documents regardless of category.
- Analyze the content from multiple documents if available to provide comprehensive answers.
- When information appears conflicting, prioritize the most specific and recent document.

RESPONSE GUIDELINES:
- Be precise and concise in your answers.
- Always cite which specific document(s) your information comes from.
- If the data is unclear or missing, say so explicitly and suggest checking with UMD's advising office.
- Do not invent course requirements or prerequisites not found in the documents.
- Format course numbers consistently (e.g., CMSC 400 or CMSC400).

Tools:
- process_pdf: Extract text from specific PDFs if needed.
- search_pdfs: Search ALL extracted PDF data for relevant information. Use this FIRST.
""",
    tools=[pdf_tool, search_tool]
)