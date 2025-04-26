# NeoVisr

NeoVisr is a mobile app and AI-powered backend designed to assist University of Maryland (UMD) Computer Science students with computer science academic advising. The React Native app offers a chat interface for querying course details and computer science information, while the backend processes PDF data, automates degree audits via UMD's uAchieve system, and schedules advising appointments through TerpEngage.

Created by Samik Wangneo, Rivan Parikh, Eswar Karavadi, and Aymaan Hussain

## Table of Contents
- [Features](#features)
- [Technologies](#technologies)
- [Project Structure](#project-structure)
- [License](#license)

## Features
- **Mobile App**:
  - Chat with an AI advisor about cs degree requirements, scheduling appointments, and degree audits.
  - Light/dark mode with system theme detection.
  - Persistent chat history and user profiles.
- **Backend**:
  - Searches UMD CS PDF documents for accurate answers.
  - Automates degree audits with 2FA DUO authentication support.
  - Automates advisor appointment scheduling on TerpEngage.
  - Suggests advisor contact when information is missing.

## Technologies
- **Frontend**: React Native, TypeScript, AsyncStorage
- **Backend**: Python, Google ADK Agents, Playwright, pdfplumber
- **Dependencies**: See `package.json` (mobile) and `requirements.txt` (backend)

## Project Structure
- cs_advisor folder
    - pdfs folder
        - this contains all the pdfs found on the umd cs website that we used to train the model
    - agent.py
        - Defines the CS Academic Advisor Agent using Google's ADK:
            - Loads and indexes all advising PDFs at startup.
            - Sets up search functionality to answer academic questions.
            - Handles degree audits, advisor appointments, and advisor emails using external tools.
            - Defines detailed agent behavior for handling login flows, errors, and PDF search responses.
            - Supports clean shutdown on exit signals.
    - tools.py
        - Provides the tools used by the agent:
            - pdf_tool: Extracts text from specific PDFs.
            - search_pdfs: Searches across all advising PDFs.
            - index_pdfs: Loads and parses PDFs at startup.
            - degree_audit_tool: Automates login and runs UMD uAchieve degree audits.
            - terpengage_tool: Automates appointment booking via TerpEngage.
            - advisor_email_tool: Generates advisor email templates based on user queries.
- frontend folder -> app folder -> (tabs) folder
    - index.tsx
        - Runs the AdvisorAI frontend app built in React Native:
            - Provides a chat interface for students to interact with the CS Advisor agent.
            - Manages chat sessions, user profiles, and theme preferences using AsyncStorage.
            - Sends and receives messages to the backend ADK server.
            - Supports features like chat history, profile editing, sidebar navigation, and category-based prompts.
            - Integrates dynamic theming (light/dark/auto) across the UI.
