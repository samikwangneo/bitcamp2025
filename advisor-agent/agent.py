from google.adk.agents import LlmAgent
from tools import pdf_tool, search_tool, index_pdfs
import json

# Mock corpus (replace with real PDF data later)
pdfs = index_pdfs()

root_agent = LlmAgent(
    name="cs_advisor",
    model="gemini-2.0-flash-exp",  # Fast model for prototyping
    description="An AI advisor for UMD CS major requirements.",
    instruction="""
You are an expert academic advisor for the University of Maryland's Computer Science major. 
Use the provided PDF data to answer questions about course requirements, prerequisites, electives, and degree planning.
- Be precise and concise.
- If the data is unclear or missing, say so and suggest the student check with UMD's advising office.
- Do not invent course details.
Tools:
- process_pdf: Use to extract text from specific PDFs if needed.
- search_pdfs: Use to search for relevant snippets in the PDF list.
""",
    tools=[pdf_tool, search_tool]
)