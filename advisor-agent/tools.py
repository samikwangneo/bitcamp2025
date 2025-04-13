import glob
import re
import os
import pdfplumber
import urllib.parse
import signal
from google.adk.tools import FunctionTool
from playwright.async_api import async_playwright
import asyncio
from .config import ADVISOR_CONTACT

# Add global references that can be cleaned up
_browser = None
_browser_context = None

# Store the last state to prevent repeating credential requests
_last_audit_status = None

# Add signal handler to properly clean up resources
def signal_handler(sig, frame):
    print("\nCtrl+C detected, cleaning up resources...")
    import asyncio
    
    # Create a new event loop for cleanup
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    async def close_resources():
        global _browser, _browser_context
        try:
            if _browser_context:
                await _browser_context.close()
                print("Browser context closed.")
            if _browser:
                await _browser.close()
                print("Browser closed.")
        except Exception as e:
            print(f"Error closing browser resources: {e}")
    
    loop.run_until_complete(close_resources())
    loop.close()
    print("Exiting gracefully.")
    import sys
    sys.exit(0)

# Register the signal handler
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

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

    course_code = None
    for keyword in query_keywords:
        if keyword.startswith('cmsc') and len(keyword) >= 6:
            course_code = keyword
            break

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
        return results[:10]  # Return top results (increased from 5 to 10 to provide more comprehensive information)
    else:
        # No results found - provide email advisor option
        clean_query = query.strip().replace('\n', ' ')
        subject = f"Academic Inquiry: {clean_query[:50]}"
        
        # Detect different types of queries to customize the email
        if "prerequisite" in clean_query.lower() or "prereq" in clean_query.lower():
            course = clean_query.split('for')[-1].strip() if 'for' in clean_query else clean_query
            body_query = f"I hope this email finds you well. I'm currently planning my academic schedule and would like to inquire about the prerequisites for {course}."
            query_type = "prerequisites"
        elif any(word in clean_query.lower() for word in ["transfer", "credit", "credits"]):
            body_query = f"I hope this email finds you well. I'm looking for information regarding transfer credits and would appreciate your guidance on {clean_query}."
            query_type = "transfer credits"
        elif any(word in clean_query.lower() for word in ["graduate", "graduation", "requirements"]):
            body_query = f"I hope this email finds you well. I'm planning my path to graduation and need clarification on the requirements related to {clean_query}."
            query_type = "graduation requirements"
        elif any(word in clean_query.lower() for word in ["elective", "electives"]):
            body_query = f"I hope this email finds you well. I'm seeking information about elective options related to {clean_query} and would appreciate your recommendations."
            query_type = "electives"
        else:
            body_query = f"I hope this email finds you well. I'm currently researching information about {clean_query} and would appreciate your guidance."
            query_type = "general"
        
        body = (f"Dear {ADVISOR_CONTACT['name']},\n\n"
                f"{body_query}\n\n"
                f"Could you please provide me with the relevant information or direct me to appropriate resources? I've already consulted the available CS department materials but couldn't find specific answers to my question.\n\n"
                f"Thank you for your time and assistance.\n\n"
                f"Best regards,\n"
                f"[Your Name]")
        
        # Create Gmail compose URL
        gmail_url = f"https://mail.google.com/mail/?view=cm&fs=1&to={urllib.parse.quote(ADVISOR_CONTACT['email'])}&su={urllib.parse.quote(subject)}&body={urllib.parse.quote(body)}"
        
        # Enhanced email prompt with more contextual information
        email_prompt = (
            f"I apologize, but I couldn't find specific information about '{clean_query}' in our available resources.\n\n"
            f"For detailed guidance on {query_type}, I recommend reaching out directly to {ADVISOR_CONTACT['name']} at {ADVISOR_CONTACT['email']}.\n\n"
            f"<p><strong>Click the button below to open a pre-formatted email to your academic advisor:</strong></p>"
            f"<div style='margin: 20px 0;'>"
            f"<a href=\"{gmail_url}\" target=\"_blank\" style=\"display: inline-block; background-color: #4285F4; color: white; text-decoration: none; font-weight: bold; padding: 10px 20px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); font-family: Arial, sans-serif;\">Contact Academic Advisor</a>"
            f"</div>"
            f"<br>"
            f"<div style='margin: 20px 0;'>"
            f"<a href=\"https://terpengage.umd.edu/\" target=\"_blank\" style=\"display: inline-block; background-color: #E21833; color: white; text-decoration: none; font-weight: bold; padding: 10px 20px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); font-family: Arial, sans-serif;\">Book Meeting via TerpEngage</a>"
            f"</div>"
            f"<br>"
            f"<div style='font-size: 0.9em; color: #666;'>"
            f"Tip: The advisor can provide personalized guidance on course selection, degree requirements, and academic planning."
            f"</div>"
        )
        
        with open('advisor-agent/email_log.txt', 'a', encoding='utf-8') as f:
            f.write(f"[{subject}] Email prompted for query type: {query_type} - \"{clean_query}\"\n")
        
        return ["no_results", email_prompt]

# Keep search_tool definition out for now, will be created in agent.py
# search_tool = FunctionTool(search_pdfs)

async def _run_degree_audit(credentials):
    """Internal async function to run the degree audit using Playwright."""
    global _browser, _browser_context
    print("DEBUG: Starting _run_degree_audit")
    try:
        # Create playwright instance WITHOUT context manager to prevent auto-closing
        print("DEBUG: Initializing Playwright")
        playwright = await async_playwright().start()
        print("DEBUG: Playwright initialized without context manager")
        
        # Create a non-persistent browser instance and context (no storage between sessions)
        # Set viewport size and additional parameters for headless mode
        _browser = await playwright.chromium.launch(
            headless=True,  # Run in headless mode
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']  # Common headless fixes
        )
        _browser_context = await _browser.new_context(
            viewport={'width': 1280, 'height': 800},  # Explicit viewport size helps in headless mode
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',  # Realistic user-agent
            ignore_https_errors=True  # Sometimes needed for campus sites
        )
        print("DEBUG: Created browser with non-persistent context (no data stored between sessions)")
        
        # Use a new page from the browser context
        page = await _browser_context.new_page()
        print("DEBUG: New page created")

        # Navigate to uAchieve
        await page.goto("https://uachieve.umd.edu/", timeout=60000)  # Increase timeout for headless mode
        print("DEBUG: Navigated to uAchieve.umd.edu")
        
        # Take debug screenshot in headless mode
        await page.screenshot(path="initial_page.png")
        print("DEBUG: Screenshot saved to initial_page.png")
        
        # Click the "Enter" button - use a more robust approach
        try:
            # Try various selectors
            await page.wait_for_selector('text=Enter', state='visible', timeout=10000)
            await page.click('text=Enter')
            print("DEBUG: Clicked Enter button using text selector")
        except Exception as e:
            print(f"DEBUG: Failed to click Enter with text selector: {str(e)}")
            try:
                # Try with JavaScript approach
                await page.evaluate('''() => {
                    const enterLinks = Array.from(document.querySelectorAll('a, button')).filter(el => 
                        el.textContent.trim().toLowerCase() === 'enter');
                    if (enterLinks.length > 0) enterLinks[0].click();
                }''')
                print("DEBUG: Attempted JavaScript click on Enter button")
            except Exception as js_e:
                print(f"DEBUG: JavaScript approach also failed: {str(js_e)}")
                # Take a screenshot to see what's happening
                await page.screenshot(path="enter_button_error.png")
                raise Exception("Could not find or click Enter button")

        # Wait for navigation to login page and print current URL
        await page.wait_for_load_state('networkidle', timeout=30000)  # Increase timeout for headless mode
        print(f"DEBUG: Current URL after clicking Enter: {page.url}")
        await page.screenshot(path="after_enter.png")  # Debug screenshot
        
        # Check for different possible CAS login page URLs
        if "cas.umd.edu" in page.url or "shib.idm.umd.edu" in page.url:
            print(f"DEBUG: On login page, URL: {page.url}")
            
            # Take a screenshot of the login page for debugging
            await page.screenshot(path="login_page.png")
            print("DEBUG: Screenshot saved to login_page.png")
            
            # Print all input fields to debug
            form_inputs = await page.query_selector_all('input')
            print(f"DEBUG: Found {len(form_inputs)} input fields")
            for i, input_field in enumerate(form_inputs):
                input_type = await input_field.get_attribute('type') or 'unknown'
                input_id = await input_field.get_attribute('id') or 'no-id'
                input_name = await input_field.get_attribute('name') or 'no-name'
                print(f"DEBUG: Input {i}: type={input_type}, id={input_id}, name={input_name}")
            
            # Try different selectors for the login form
            try:
                # Wait for the username field to be visible
                await page.wait_for_selector('#username', state='visible', timeout=5000)
                
                # First try by ID
                await page.fill('#username', credentials['username'])
                await page.fill('#password', credentials['password'])
                print("DEBUG: Filled login form using ID selectors")
                
                # Take a screenshot after filling
                await page.screenshot(path="after_filling_login.png")
                print("DEBUG: Screenshot saved after filling login form")
                
            except Exception as e1:
                print(f"DEBUG: Failed filling with ID selectors: {str(e1)}")
                try:
                    # Then try by name
                    await page.fill('input[name="username"]', credentials['username'])
                    await page.fill('input[name="password"]', credentials['password'])
                    print("DEBUG: Filled login form using name selectors")
                except Exception as e2:
                    print(f"DEBUG: Failed filling with name selectors: {str(e2)}")
                    try:
                        # Last resort: try by type
                        inputs = await page.query_selector_all('input[type="text"]')
                        if len(inputs) > 0:
                            await inputs[0].fill(credentials['username'])
                        
                        pwd_inputs = await page.query_selector_all('input[type="password"]')
                        if len(pwd_inputs) > 0:
                            await pwd_inputs[0].fill(credentials['password'])
                        print("DEBUG: Filled login form using type selectors")
                    except Exception as e3:
                        print(f"DEBUG: Failed filling with type selectors: {str(e3)}")
                        
                        # Take a screenshot to see the state of the page
                        await page.screenshot(path="login_form_error.png")
                        print("DEBUG: Screenshot saved to login_form_error.png")
                        
                        raise Exception("Could not fill login form with any method")
            
            # Take screenshot before clicking submit
            await page.screenshot(path="before_submit.png")
            print("DEBUG: Screenshot saved before clicking submit")
            
            # Try to find and click submit button
            try:
                # Try to explicitly wait for the button
                await page.wait_for_selector('button[name="_eventId_proceed"]', state='visible', timeout=5000)
                
                # Try the exact button from page source
                await page.click('button[name="_eventId_proceed"]')
                print("DEBUG: Clicked button with name='_eventId_proceed'")
            except Exception as sub_e1:
                print(f"DEBUG: Failed clicking by name attribute: {str(sub_e1)}")
                try:
                    # Try by text content
                    await page.click('button:has-text("Log in")')
                    print("DEBUG: Clicked button with 'Log in' text")
                except Exception as sub_e2:
                    print(f"DEBUG: Failed clicking by text content: {str(sub_e2)}")
                    try:
                        # Try by class and type
                        await page.click('button.form-button[type="submit"]')
                        print("DEBUG: Clicked button by class and type")
                    except Exception as sub_e3:
                        print(f"DEBUG: Failed clicking by class and type: {str(sub_e3)}")
                        try:
                            # Try with JavaScript (more reliable in some cases)
                            await page.evaluate('''() => {
                                const loginButton = document.querySelector('button[name="_eventId_proceed"]');
                                if (loginButton) {
                                    console.log("Found button by name, clicking...");
                                    loginButton.click();
                                    return;
                                }
                                
                                // Try to find any submit button
                                const submitButtons = Array.from(document.querySelectorAll('button[type="submit"]'));
                                if (submitButtons.length > 0) {
                                    console.log("Found submit button, clicking...");
                                    submitButtons[0].click();
                                    return;
                                }
                                
                                // Try to find any button with login text
                                const loginButtons = Array.from(document.querySelectorAll('button')).filter(b => 
                                    b.textContent.toLowerCase().includes('log in') || 
                                    b.textContent.toLowerCase().includes('login') ||
                                    b.textContent.toLowerCase().includes('submit') ||
                                    b.textContent.toLowerCase().includes('continue'));
                                
                                if (loginButtons.length > 0) {
                                    console.log("Found login button by text, clicking...");
                                    loginButtons[0].click();
                                    return;
                                }
                                
                                // As a last resort, try to submit the form directly
                                const forms = document.querySelectorAll('form');
                                if (forms.length > 0) {
                                    console.log("Submitting form directly...");
                                    forms[0].submit();
                                    return;
                                }
                                
                                console.log("Could not find any login button or form");
                            }''')
                            print("DEBUG: Attempted JavaScript click on login button")
                        except Exception as sub_e4:
                            print(f"DEBUG: JavaScript click failed: {str(sub_e4)}")
                            # Last resort: press Enter key to submit form
                            await page.keyboard.press('Enter')
                            print("DEBUG: Pressed Enter key to submit form")

            # Wait for Duo 2FA page
            print("DEBUG: Clicked login button, now waiting for Duo authentication screen")
            await page.screenshot(path="after_login_click.png")
            print("DEBUG: Screenshot saved to after_login_click.png")
            
            # Check if we're on the Duo page
            try:
                # Wait for Duo iframe to appear (may take a moment)
                await page.wait_for_selector('iframe[id="duo_iframe"]', timeout=10000)
                print("DEBUG: Duo iframe detected")
                
                # Take screenshot of Duo page
                await page.screenshot(path="duo_auth_page.png")
                print("DEBUG: Screenshot saved to duo_auth_page.png")
                
                # In headless mode, we need to handle Duo differently
                print("DEBUG: Checking if browser is in headless mode for special Duo handling")
                
                # Analyze the page to see if we can extract any Duo-related info
                duo_info = await page.evaluate('''() => {
                    // Try to get any text that might indicate what's happening with Duo
                    const duoText = document.body.innerText;
                    // Check if there's a Duo iframe
                    const duoIframe = document.querySelector('#duo_iframe');
                    return {
                        hasIframe: !!duoIframe,
                        bodyText: duoText,
                        url: window.location.href
                    };
                }''')
                print(f"DEBUG: Duo page info: {duo_info}")
                
                print("DEBUG: Waiting for user to complete Duo authentication...")
                print("DEBUG: Please check your mobile device for a Duo push notification and approve it")
                print("DEBUG: Note: In headless mode, Duo authentication might be challenging")
                
                # Now we need to wait for navigation AFTER Duo is approved
                # This could take time as the user needs to approve on their phone
                try:
                    # Instead of just waiting for navigation, actively check for changes
                    # that indicate Duo authentication completed
                    current_url = page.url
                    
                    # More efficient approach - wait for URL to change or for specific elements
                    # This uses a shorter timeout with repeated checks
                    duo_completed = False
                    max_checks = 60  # Check for up to 60 seconds
                    for i in range(max_checks):
                        # Take periodic screenshots to monitor what's happening
                        if i % 10 == 0:  # Every 10 seconds
                            await page.screenshot(path=f"duo_waiting_{i}.png")
                            print(f"DEBUG: Screenshot saved to duo_waiting_{i}.png")
                            
                        # Check if URL changed (which would indicate navigation)
                        if page.url != current_url:
                            print(f"DEBUG: URL changed from {current_url} to {page.url}")
                            duo_completed = True
                            break
                            
                        # Check if "Is this your device?" text appeared
                        page_content = await page.content()
                        if "Is this your device?" in page_content:
                            print("DEBUG: 'Is this your device?' prompt detected")
                            duo_completed = True
                            break
                            
                        # Check if we're directly on uAchieve page
                        if "uachieve.umd.edu" in page.url:
                            print("DEBUG: Redirected directly to uAchieve")
                            duo_completed = True
                            break
                            
                        # Short wait between checks
                        await page.wait_for_timeout(1000)  # 1 second between checks
                        if (i % 5) == 0:  # Print status every 5 seconds
                            print(f"DEBUG: Still waiting for Duo authentication... ({i+1}s)")
                    
                    if duo_completed:
                        print("DEBUG: Duo authentication appears to be complete")
                        await page.screenshot(path="after_duo_auth.png")
                        print("DEBUG: Screenshot saved to after_duo_auth.png")
                    else:
                        print("DEBUG: Duo authentication timeout, but continuing to check for device prompt anyway")
                        # Take a final screenshot
                        await page.screenshot(path="duo_timeout.png")
                except Exception as duo_nav_e:
                    print(f"DEBUG: Error while waiting for Duo completion: {str(duo_nav_e)}")
                    await page.screenshot(path="duo_timeout.png")
                    print("DEBUG: Screenshot saved to duo_timeout.png")
                    
                    # Even if there's an error, try to continue anyway
                    print("DEBUG: Attempting to continue despite Duo navigation error")
            except Exception as duo_e:
                print(f"DEBUG: Failed to detect Duo iframe: {str(duo_e)}")
                await page.screenshot(path="duo_error.png")
                print("DEBUG: Screenshot saved to duo_error.png")
                
                # If we didn't detect Duo, it might be because we've already authenticated
                # or because the site is using a different authentication flow
                print("DEBUG: Continuing without Duo authentication detection")

            # After Duo authentication, check for "Is this your device?" prompt
            print("DEBUG: Checking for 'Is this your device?' prompt")
            await page.screenshot(path="checking_device_prompt.png")
            print("DEBUG: Screenshot saved to checking_device_prompt.png")
            
            # No need to wait again, we already check for the device prompt in the Duo loop
            try:
                # Check for the "Is this your device?" text on the page
                page_content = await page.content()
                if "Is this your device?" in page_content:
                    print("DEBUG: Found 'Is this your device?' prompt")
                    
                    # Try to click the "No, other people use this device" button by ID
                    try:
                        # Wait for button to be clickable with a shorter timeout
                        await page.wait_for_selector('#dont-trust-browser-button', timeout=3000)
                        await page.click('#dont-trust-browser-button')
                        print("DEBUG: Clicked 'No, other people use this device' button by ID")
                    except Exception as no_btn_e:
                        print(f"DEBUG: Failed to click No button by ID: {str(no_btn_e)}")
                        
                        # Retry with JavaScript immediately
                        try:
                            await page.evaluate('''() => {
                                const noButton = document.querySelector('#dont-trust-browser-button');
                                if (noButton) {
                                    console.log("Found button, clicking...");
                                    noButton.click();
                                } else {
                                    console.log("Button not found");
                                    // Try alternate methods
                                    const links = Array.from(document.querySelectorAll('a, button'));
                                    const noLink = links.find(el => el.textContent.includes("No, other people use this device"));
                                    if (noLink) noLink.click();
                                }
                            }''')
                            print("DEBUG: Attempted JavaScript click on 'No' button")
                        except Exception as js_e:
                            print(f"DEBUG: JavaScript click failed: {str(js_e)}")
            except Exception as device_e:
                print(f"DEBUG: Error checking for device prompt: {str(device_e)}")

            # Final wait for redirect to uAchieve - use more efficient polling approach
            try:
                print("DEBUG: Waiting for final redirect to uAchieve...")
                
                # More efficient polling approach
                redirect_success = False
                max_redirect_checks = 20  # Check for up to 20 seconds
                for i in range(max_redirect_checks):
                    if "uachieve.umd.edu" in page.url:
                        print(f"DEBUG: Successfully redirected to uAchieve at {page.url}")
                        redirect_success = True
                        break
                    
                    # Short wait between checks
                    await page.wait_for_timeout(1000)
                    if (i % 5) == 0:  # Status update every 5 seconds
                        print(f"DEBUG: Waiting for redirect... Current URL: {page.url} ({i+1}s)")
                
                # Take a final screenshot
                await page.screenshot(path="success_redirect.png")
                print("DEBUG: Screenshot saved to success_redirect.png")
                
                if redirect_success:
                    # First, check for and click the Continue button
                    print("DEBUG: Looking for Continue button on uAchieve page...")
                    try:
                        # Wait briefly for page to fully load
                        print("DEBUG: Waiting for page to be stable before looking for Continue button...")
                        await page.wait_for_load_state('networkidle', timeout=10000)
                        
                        # Click the Continue button using exact selector
                        try:
                            # Use the exact HTML provided by the user
                            await page.click('input.btn.btn-primary[type="submit"][value="Continue"]')
                            print("DEBUG: Clicked Continue button using exact selector")
                        except Exception as cont_e:
                            print(f"DEBUG: Failed to click Continue button: {str(cont_e)}")
                            try:
                                # JavaScript fallback
                                await page.evaluate('''() => {
                                    const continueBtn = document.querySelector('input.btn.btn-primary[type="submit"][value="Continue"]');
                                    if (continueBtn) {
                                        continueBtn.click();
                                        return true;
                                    }
                                    return false;
                                }''')
                                print("DEBUG: Attempted to click Continue button via JavaScript")
                            except Exception as js_e:
                                print(f"DEBUG: All attempts to click Continue button failed: {str(js_e)}")
                        
                        # IMPORTANT: Take a screenshot and stop here - don't do anything else that could
                        # cause navigation away from the table of audits
                        await page.screenshot(path="after_continue_click.png")
                        print("DEBUG: Clicked Continue and took screenshot.")
                        
                        # Navigate directly to the audit list URL
                        print("DEBUG: Redirecting to the audit list page...")
                        await page.goto("https://uachieve.umd.edu/selfservice/audit/list.html")
                        print(f"DEBUG: Navigated to audit list page. Current URL: {page.url}")
                        
                        # Wait for the table to load
                        print("DEBUG: Waiting for the audit list table to load...")
                        await page.wait_for_load_state('networkidle', timeout=10000)
                        await page.wait_for_timeout(3000)  # Additional wait to ensure table is fully loaded
                        
                        # Take a screenshot of the audit list page
                        await page.screenshot(path="audit_list_page.png")
                        print("DEBUG: Screenshot saved of audit list page")
                        
                        # Find and click the View Audit link for Computer Science
                        print("DEBUG: Looking for Computer Science in the audit list...")
                        try:
                            # Using the exact table structure from the provided HTML
                            cs_audit_clicked = await page.evaluate('''() => {
                                // Find the table with the list of audits
                                const table = document.querySelector('table.table-striped.table-bordered.table-hover.resultList, table.resultList');
                                if (!table) {
                                    console.log('Audit table not found');
                                    return { success: false, reason: 'table_not_found' };
                                }
                                
                                // Find all rows in the table (skip the header row)
                                const rows = Array.from(table.querySelectorAll('tr')).slice(1);
                                console.log(`Found ${rows.length} audit rows`);
                                
                                // Log all rows for debugging
                                const rowContents = rows.map((row, index) => {
                                    const cells = Array.from(row.querySelectorAll('td'));
                                    if (cells.length >= 3) {
                                        return {
                                            index: index,
                                            id: cells[0].textContent.trim(),
                                            program: cells[1].textContent.trim(),
                                            title: cells[2].textContent.trim()
                                        };
                                    }
                                    return { index: index, text: row.textContent.trim() };
                                });
                                console.log('Audit rows:', JSON.stringify(rowContents));
                                
                                // Look for Computer Science in the third column (index 2)
                                for (const row of rows) {
                                    const cells = Array.from(row.querySelectorAll('td'));
                                    if (cells.length < 9) continue; // Need at least 9 cells based on the HTML
                                    
                                    const titleCell = cells[2];
                                    const titleText = titleCell.textContent.trim();
                                    
                                    if (titleText === 'Computer Science') {
                                        console.log(`Found Computer Science row: ${titleText}`);
                                        
                                        // Find the View Audit link in the last column (index 8)
                                        const viewAuditLink = cells[8].querySelector('a');
                                        if (viewAuditLink) {
                                            console.log(`Found View Audit link: ${viewAuditLink.href}`);
                                            
                                            // Click the View Audit link
                                            viewAuditLink.click();
                                            
                                            return { 
                                                success: true, 
                                                id: cells[0].textContent.trim(),
                                                program: cells[1].textContent.trim(),
                                                title: titleText,
                                                url: viewAuditLink.href
                                            };
                                        } else {
                                            return { success: false, reason: 'link_not_found', row: titleText };
                                        }
                                    }
                                }
                                
                                return { success: false, reason: 'cs_not_found', availableRows: rowContents };
                            }''')
                            
                            if cs_audit_clicked and cs_audit_clicked.get("success") == True:
                                print(f"DEBUG: Successfully clicked View Audit for Computer Science")
                                print(f"DEBUG: Audit ID: {cs_audit_clicked.get('id', 'unknown')}, Program: {cs_audit_clicked.get('program', 'unknown')}")
                                
                                # Wait for navigation to the audit page
                                try:
                                    await page.wait_for_navigation(timeout=10000)
                                    print(f"DEBUG: Navigated to Computer Science audit page. URL: {page.url}")
                                except Exception as nav_e:
                                    print(f"DEBUG: Navigation may not have occurred: {str(nav_e)}")
                                
                                # Take screenshot of the audit page
                                await page.wait_for_timeout(2000)  # Brief wait for rendering
                                await page.screenshot(path="computer_science_audit.png")
                                print("DEBUG: Screenshot saved of Computer Science audit")
                                
                                # Click the Printer Friendly button
                                print("DEBUG: Looking for the Printer Friendly button...")
                                try:
                                    # Try to click the printer friendly button using the provided HTML selector
                                    await page.wait_for_selector('#printerFriendly', timeout=5000)
                                    await page.click('#printerFriendly')
                                    print("DEBUG: Clicked Printer Friendly button by ID")
                                    
                                    # Wait for the new tab/window to open with the printer-friendly version
                                    await page.wait_for_timeout(3000)  # Give it some time to open new tab
                                    
                                    # Check if a new page was opened
                                    pages = _browser_context.pages
                                    if len(pages) > 1:
                                        # Switch to the newest page (likely the printer-friendly version)
                                        printer_page = pages[-1]
                                        print(f"DEBUG: Switched to printer-friendly page. URL: {printer_page.url}")
                                        
                                        # Wait for this page to be fully loaded
                                        await printer_page.wait_for_load_state('networkidle', timeout=10000)
                                        
                                        # Take screenshot of the printer-friendly version
                                        await printer_page.screenshot(path="printer_friendly_audit.png")
                                        print("DEBUG: Screenshot saved of printer-friendly audit")
                                        
                                        # Download the printer-friendly page content
                                        try:
                                            print("DEBUG: Downloading printer-friendly page content...")
                                            page_content = await printer_page.content()
                                            
                                            # Save the HTML content to a file
                                            with open("printer_friendly_audit.html", "w", encoding="utf-8") as f:
                                                f.write(page_content)
                                            print("DEBUG: Successfully saved printer-friendly audit to printer_friendly_audit.html")
                                            
                                            # Extract the text content for easier reading
                                            audit_text = await printer_page.evaluate('''() => {
                                                // Find the main content element
                                                const mainContent = document.querySelector('body');
                                                return mainContent ? mainContent.innerText : document.body.innerText;
                                            }''')
                                            
                                            # Save the text content to a file
                                            with open("printer_friendly_audit.txt", "w", encoding="utf-8") as f:
                                                f.write(audit_text)
                                            print("DEBUG: Successfully saved printer-friendly audit text to printer_friendly_audit.txt")
                                            
                                            # Use browser's print functionality to save as PDF
                                            try:
                                                print("DEBUG: Using browser's print functionality to save as PDF...")
                                                pdf_path = "degree_audit.pdf"
                                                
                                                # Set media to "screen" to ensure proper rendering
                                                await printer_page.emulate_media(media="screen")
                                                
                                                # Save as PDF using Playwright's built-in functionality (simulates Ctrl+P)
                                                await printer_page.pdf(path=pdf_path, format="Letter", print_background=True)
                                                print(f"DEBUG: Successfully downloaded PDF: {pdf_path}")
                                                
                                                return {
                                                    "status": "printer_friendly_downloaded",
                                                    "message": "Successfully downloaded printer-friendly version of Computer Science audit",
                                                    "current_url": printer_page.url,
                                                    "html_path": "printer_friendly_audit.html",
                                                    "text_path": "printer_friendly_audit.txt",
                                                    "pdf_path": pdf_path
                                                }
                                            except Exception as pdf_e:
                                                print(f"DEBUG: Failed to save as PDF: {str(pdf_e)}")
                                                # Still return success with HTML and text files
                                                return {
                                                    "status": "printer_friendly_downloaded",
                                                    "message": "Successfully downloaded printer-friendly version of Computer Science audit (PDF download failed)",
                                                    "current_url": printer_page.url,
                                                    "html_path": "printer_friendly_audit.html",
                                                    "text_path": "printer_friendly_audit.txt"
                                                }
                                        except Exception as download_e:
                                            print(f"DEBUG: Failed to download printer-friendly audit: {str(download_e)}")
                                            
                                            return {
                                                "status": "printer_friendly_opened",
                                                "message": "Successfully opened printer-friendly version of Computer Science audit but failed to download",
                                                "current_url": printer_page.url
                                            }
                                except Exception as print_e:
                                    print(f"DEBUG: Failed to click Printer Friendly button: {str(print_e)}")
                                    
                                    # Try alternative approach using JavaScript
                                    try:
                                        await page.evaluate('''() => {
                                            // Try direct ID selector
                                            const printBtn = document.querySelector('#printerFriendly');
                                            if (printBtn) {
                                                console.log("Found printer button by ID, clicking...");
                                                printBtn.click();
                                                return true;
                                            }
                                            
                                            // Try looking for any print icon
                                            const printIcon = document.querySelector('a i.fa-print, i.fa.fa-print');
                                            if (printIcon && printIcon.parentElement) {
                                                console.log("Found printer icon, clicking parent element...");
                                                printIcon.parentElement.click();
                                                return true;
                                            }
                                            
                                            // Try looking for any link containing "printer"
                                            const printLinks = Array.from(document.querySelectorAll('a')).filter(a => 
                                                a.textContent.toLowerCase().includes('print') || 
                                                a.href.includes('printerFriendly=true')
                                            );
                                            
                                            if (printLinks.length > 0) {
                                                console.log("Found printer link by text/href, clicking...");
                                                printLinks[0].click();
                                                return true;
                                            }
                                            
                                            return false;
                                        }''')
                                        print("DEBUG: Attempted to click Printer Friendly button via JavaScript")
                                        
                                        # Wait to see if a new tab opened
                                        await page.wait_for_timeout(3000)
                                        
                                        # Check again for new pages
                                        pages = _browser_context.pages
                                        if len(pages) > 1:
                                            printer_page = pages[-1]
                                            print(f"DEBUG: Switched to printer-friendly page after JavaScript click. URL: {printer_page.url}")
                                            
                                            # Take screenshot
                                            await printer_page.screenshot(path="printer_friendly_js_click.png")
                                            print("DEBUG: Screenshot saved of printer-friendly page after JavaScript click")
                                            
                                            # Download the printer-friendly page content
                                            try:
                                                print("DEBUG: Downloading printer-friendly page content via JavaScript method...")
                                                page_content = await printer_page.content()
                                                
                                                # Save the HTML content to a file
                                                with open("printer_friendly_audit.html", "w", encoding="utf-8") as f:
                                                    f.write(page_content)
                                                print("DEBUG: Successfully saved printer-friendly audit to printer_friendly_audit.html")
                                                
                                                # Extract the text content for easier reading
                                                audit_text = await printer_page.evaluate('''() => {
                                                    // Find the main content element
                                                    const mainContent = document.querySelector('body');
                                                    return mainContent ? mainContent.innerText : document.body.innerText;
                                                }''')
                                                
                                                # Save the text content to a file
                                                with open("printer_friendly_audit.txt", "w", encoding="utf-8") as f:
                                                    f.write(audit_text)
                                                print("DEBUG: Successfully saved printer-friendly audit text to printer_friendly_audit.txt")
                                                
                                                # Use browser's print functionality to save as PDF
                                                try:
                                                    print("DEBUG: Using browser's print functionality to save as PDF...")
                                                    pdf_path = "degree_audit.pdf"
                                                    
                                                    # Set media to "screen" to ensure proper rendering
                                                    await printer_page.emulate_media(media="screen")
                                                    
                                                    # Save as PDF using Playwright's built-in functionality (simulates Ctrl+P)
                                                    await printer_page.pdf(path=pdf_path, format="Letter", print_background=True)
                                                    print(f"DEBUG: Successfully downloaded PDF: {pdf_path}")
                                                    
                                                    return {
                                                        "status": "printer_friendly_downloaded",
                                                        "message": "Successfully downloaded printer-friendly version of Computer Science audit via JavaScript",
                                                        "current_url": printer_page.url,
                                                        "html_path": "printer_friendly_audit.html",
                                                        "text_path": "printer_friendly_audit.txt",
                                                        "pdf_path": pdf_path
                                                    }
                                                except Exception as pdf_e:
                                                    print(f"DEBUG: Failed to save as PDF: {str(pdf_e)}")
                                                    # Still return success with HTML and text files
                                                    return {
                                                        "status": "printer_friendly_downloaded",
                                                        "message": "Successfully downloaded printer-friendly version of Computer Science audit via JavaScript (PDF download failed)",
                                                        "current_url": printer_page.url,
                                                        "html_path": "printer_friendly_audit.html",
                                                        "text_path": "printer_friendly_audit.txt"
                                                    }
                                            except Exception as download_js_e:
                                                print(f"DEBUG: Failed to download printer-friendly audit via JavaScript: {str(download_js_e)}")
                                                
                                                return {
                                                    "status": "printer_friendly_opened",
                                                    "message": "Successfully opened printer-friendly version of Computer Science audit via JavaScript but failed to download",
                                                    "current_url": printer_page.url
                                                }
                                    except Exception as js_e:
                                        print(f"DEBUG: JavaScript approach also failed: {str(js_e)}")
                                
                                # Return success with just the CS audit opened (printer-friendly failed)
                                return {
                                    "status": "cs_audit_opened",
                                    "message": "Successfully opened Computer Science audit",
                                    "current_url": page.url
                                }
                        except Exception as e:
                            print(f"DEBUG: Error while trying to find Computer Science audit: {str(e)}")
                            
                            # Still return with audit list shown
                            return {
                                "status": "audit_list_error",
                                "message": f"Error finding Computer Science audit: {str(e)}",
                                "current_url": page.url
                            }
                    except Exception as req_outer_e:
                        print(f"DEBUG: Error while handling navigation sequence: {str(req_outer_e)}")
                        # Return with continue clicked status
                        return {
                            "status": "error_in_navigation",
                            "message": "Encountered an issue during the navigation sequence.",
                            "current_url": page.url
                        }
            except Exception as redirect_e:
                print(f"DEBUG: Error during final redirect: {str(redirect_e)}")
                current_url = page.url
                
                # Take a screenshot
                await page.screenshot(path="final_state.png")
                print("DEBUG: Screenshot saved to final_state.png")
                
                # Return with best effort status
                return {
                    "status": "partial_success",
                    "message": f"Authentication successful, but could not fully confirm degree audit access. Last URL: {current_url}"
                }
        else:
            print(f"DEBUG: Not on expected login page, URL: {page.url}")
            await page.screenshot(path="unexpected_page.png")
            print("DEBUG: Screenshot saved to unexpected_page.png")
            
            # Return with error but DO NOT close browser
            return {
                "status": "error",
                "message": f"Failed to reach login page. Current URL: {page.url}"
            }
    except Exception as e:
        print(f"DEBUG: Unhandled exception in _run_degree_audit: {str(e)}")
        
        # DO NOT close browser on exception
        return {
            "status": "error",
            "message": f"Error accessing degree audit: {str(e)}"
        }

def access_degree_audit(credentials: dict = {}) -> dict:
    """
    Access the UMD uAchieve degree audit system using provided credentials.
    Args:
        credentials: Dict with 'username' and 'password' keys (optional).
        Can also be a string in format "username:password".
    Returns:
        Dict with status and message (or audit data if successful).
    """
    global _last_audit_status
    
    try:
        # If we previously had a successful login and now get an empty credentials request,
        # return the last status instead of asking for credentials again
        if (not credentials or credentials == {}) and _last_audit_status and _last_audit_status.get("status") in [
            "continue_clicked", "continue_clicked_no_nav", 
            "request_audit_clicked", "request_audit_clicked_no_nav",
            "run_declared_clicked", "run_declared_clicked_no_nav"
        ]:
            print("DEBUG: Returning previous successful status instead of requesting credentials again")
            return _last_audit_status
        
        # Convert string credentials to dict if provided in that format
        if isinstance(credentials, str) and ":" in credentials:
            username, password = credentials.split(":", 1)
            credentials = {"username": username, "password": password}
            print("DEBUG: Converted plain text credentials to dictionary format")
        
        # Ensure credentials is not None before proceeding
        if credentials is None:
            credentials = {}
            
        print("DEBUG: access_degree_audit called with credentials:", 
              f"username: {'PROVIDED' if credentials and 'username' in credentials else 'MISSING'}, " 
              f"password: {'PROVIDED' if credentials and 'password' in credentials else 'MISSING'}")
        
        # Check if credentials are empty or missing required fields
        if not credentials or 'username' not in credentials or not credentials.get('username') or 'password' not in credentials or not credentials.get('password'):
            print("DEBUG: Credentials missing or incomplete")
            return {
                "status": "input_required",
                "message": "Please provide your CAS username and password as username:password"
            }

        print("DEBUG: Credentials provided, proceeding with audit")
        
        # Using nest_asyncio to patch the event loop issue
        import nest_asyncio
        try:
            print("DEBUG: Trying to patch event loop with nest_asyncio")
            nest_asyncio.apply()
            print("DEBUG: nest_asyncio applied successfully")
        except ImportError:
            print("DEBUG: nest_asyncio not available, attempting alternative approach")
            # If nest_asyncio isn't available, we'll use a different approach
            pass
            
        # Simple approach: just run the coroutine directly
        print("DEBUG: Running the coroutine")
        import asyncio
        
        # We should handle both in the same loop and nest_asyncio cases
        try:
            # This will work if we've patched the loop with nest_asyncio
            loop = asyncio.get_event_loop()
            print("DEBUG: Got existing event loop")
            future = _run_degree_audit(credentials)
            print("DEBUG: Created future, about to run")
            # Don't use asyncio.run as it tries to create a new event loop
            result = loop.run_until_complete(future)
            print("DEBUG: Successfully ran coroutine")
            
            # Check if result is None and handle it safely
            if result is None:
                print("DEBUG: Result is None, returning error")
                return {
                    "status": "error",
                    "message": "Error accessing degree audit: Received None result"
                }
                
            # Store the result for future reference
            if result.get("status") in [
                "continue_clicked", "continue_clicked_no_nav", 
                "request_audit_clicked", "request_audit_clicked_no_nav",
                "run_declared_clicked", "run_declared_clicked_no_nav"
            ]:
                _last_audit_status = result
                print("DEBUG: Stored successful status for future reference")
                
                # Take a final screenshot to verify the page - BUT SKIP FOR continue_clicked
                # as we want to stay on the audit table page without any further actions
                if result.get("status") != "continue_clicked":
                    try:
                        async def take_final_screenshot():
                            # Safely check if _browser_context exists and has pages
                            if _browser_context and hasattr(_browser_context, 'pages') and len(_browser_context.pages) > 0:
                                # Get the current active page
                                page = _browser_context.pages[0]
                                
                                # Wait for page to be fully loaded
                                print(f"DEBUG: Ensuring page is fully loaded before taking screenshot. Current URL: {page.url}")
                                await page.wait_for_load_state('networkidle', timeout=10000)
                                await page.wait_for_load_state('domcontentloaded', timeout=5000)
                                
                                # Additional wait for any dynamic content
                                await page.wait_for_timeout(2000)
                                
                                # Check if there are any loading indicators and wait for them to disappear
                                try:
                                    loading_exists = await page.evaluate('''() => {
                                        const loadingElements = document.querySelectorAll('.loading, .spinner, [aria-busy="true"], .progress');
                                        return loadingElements.length > 0;
                                    }''')
                                    
                                    if loading_exists:
                                        print("DEBUG: Waiting for loading indicators to disappear before screenshot...")
                                        await page.wait_for_selector('.loading, .spinner, [aria-busy="true"], .progress', 
                                                                    state='hidden', timeout=10000)
                                except Exception as e:
                                    print(f"DEBUG: No loading indicators found or timeout waiting: {str(e)}")
                                
                                # Take the screenshot after ensuring page is loaded
                                await page.screenshot(path="final_destination_page.png", full_page=True)
                                print(f"DEBUG: Final screenshot saved to final_destination_page.png, URL: {page.url}")
                                
                                # Also dump page content to help debug if screenshot is still blank
                                page_content = await page.content()
                                with open("final_page_html.txt", "w") as f:
                                    f.write(page_content[:10000])  # Save first 10K characters to avoid massive files
                                print("DEBUG: Saved first 10K characters of page HTML to final_page_html.txt")
                            else:
                                print("DEBUG: Browser context or pages not available for screenshot")
                        
                        loop = asyncio.get_event_loop()
                        loop.run_until_complete(take_final_screenshot())
                    except Exception as screenshot_e:
                        print(f"DEBUG: Error taking final screenshot: {str(screenshot_e)}")
                else:
                    print("DEBUG: Skipping final screenshot for continue_clicked status to avoid navigation")
            
            # Check if we have a 'printer_friendly_downloaded' status, and if so, read the file contents
            if result.get("status") == "printer_friendly_downloaded":
                # Add PDF file info if available
                pdf_path = result.get("pdf_path")
                if pdf_path and os.path.exists(pdf_path):
                    # Get file size
                    pdf_size = os.path.getsize(pdf_path)
                    pdf_size_kb = pdf_size / 1024
                    result["pdf_size"] = pdf_size
                    result["pdf_size_formatted"] = f"{pdf_size_kb:.1f} KB"
                    print(f"DEBUG: Found PDF file {pdf_path} ({pdf_size_kb:.1f} KB)")
                    
                    # Include file metadata
                    result["pdf_filename"] = os.path.basename(pdf_path)
                    result["pdf_path"] = os.path.abspath(pdf_path)
                    result["pdf_created"] = True
                    
                    # Optionally add base64 encoded PDF for direct download
                    # Only do this for small files (<1MB) to avoid performance issues
                    if pdf_size < 1000000:  # less than 1MB
                        try:
                            import base64
                            with open(pdf_path, "rb") as pdf_file:
                                pdf_data = pdf_file.read()
                                # Convert binary data to base64 string
                                pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
                                result["pdf_data"] = pdf_base64
                                print(f"DEBUG: Successfully encoded PDF as base64 ({len(pdf_base64)} chars)")
                        except Exception as pdf_e:
                            print(f"DEBUG: Failed to encode PDF as base64: {str(pdf_e)}")
                else:
                    result["pdf_created"] = False
                    print("DEBUG: PDF file not found or not created")
                
                # Add text content if available
                text_path = result.get("text_path")
                if text_path and os.path.exists(text_path):
                    try:
                        with open(text_path, "r", encoding="utf-8") as f:
                            audit_content = f.read()
                            # Include the content in the result
                            result["audit_content"] = audit_content
                            print(f"DEBUG: Successfully read audit content from {text_path} ({len(audit_content)} characters)")
                    except Exception as file_e:
                        print(f"DEBUG: Error reading audit file: {str(file_e)}")
            
            # Just return the result directly
            return result
        except RuntimeError as e:
            print(f"DEBUG: RuntimeError: {str(e)}")
            # If we get here, it means we couldn't get or run in the current loop
            # Try a last-resort approach
            return {
                "status": "error",
                "message": "Error accessing degree audit: Event loop issue. Please try the offline degree audit process."
            }
    except Exception as e:
        print(f"DEBUG: Exception in access_degree_audit: {str(e)}")
        return {
            "status": "error",
            "message": f"Error accessing degree audit: {str(e)}"
        }

degree_audit_tool = FunctionTool(access_degree_audit)