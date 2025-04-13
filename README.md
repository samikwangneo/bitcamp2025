# AdvisorAI

AdvisorAI is a mobile app and AI-powered backend designed to assist University of Maryland (UMD) Computer Science students with academic advising. The React Native app offers a chat interface for querying course details, while the backend processes PDF data and automates degree audits via UMD's uAchieve system.

Created by Samik Wangneo, Rivan Parikh, Eswar Karavadi, and Aymaan Hussain

## Table of Contents
- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features
- **Mobile App**:
  - Chat with an AI advisor about courses, minors, and deadlines.
  - Light/dark mode with system theme detection.
  - Persistent chat history and user profiles.
- **Backend**:
  - Searches UMD CS PDF documents for accurate answers.
  - Automates degree audits with 2FA support.
  - Suggests advisor contact when information is missing.

## Technologies
- **Frontend**: React Native, TypeScript, AsyncStorage
- **Backend**: Python, Google ADK Agents, Playwright, pdfplumber
- **Dependencies**: See `package.json` (mobile) and `requirements.txt` (backend)
