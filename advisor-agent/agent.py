from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from .tools import pdf_tool, search_pdfs, index_pdfs

# Load PDF contents at startup
pdf_data = index_pdfs()

print(f"Loaded {len(pdf_data)} PDFs:")
for doc in pdf_data:
    print(f"- {doc['filename']} ({doc['subtopic']})", flush=True)
    if doc["subtopic"] == "4XX":
        print(f"    {doc['text']}")

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
Answer questions about course requirements, prerequisites, electives, and degree planning using the provided PDF data, organized into subtopics: 4XX (400-level courses), Honors (honors program), and STIC (student-taught courses).
- Use the search_pdfs tool to find relevant information, which will prioritize PDFs based on the query (e.g., 400-level questions search 4XX PDFs).
- Be precise and concise.
- If the data is unclear or missing, say so and suggest checking with UMD's advising office.
- Do not invent course details.
Tools:
- process_pdf: Extract text from specific PDFs if needed.
- search_pdfs: Search extracted PDF data for relevant information.
""",
    tools=[pdf_tool, search_tool]
)