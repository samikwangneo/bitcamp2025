# NeoVisr 🤖🎓

<p align="center">
  <a href="https://bitcamp.umd.edu" target="_blank">
    <img src="https://img.shields.io/badge/Bitcamp%202025-Hackathon%20Winner-blueviolet?style=for-the-badge&logo=trophy" alt="Bitcamp 2025 Winner"/>
  </a>
</p>

<p align="center">
  An AI-powered academic advisor providing personalized course recommendations and degree planning for University of Maryland students. NeoVisr leverages agentic AI workflows and web automation to deliver a truly intelligent advising experience.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native Badge"/>
  <img src="https://img.shields.io/badge/Google_AI-4285F4?style=for-the-badge&logo=google-ai&logoColor=white" alt="Google AI Badge"/>
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright Badge"/>
  <img src="https://img.shields.io/badge/NLP-Natural_Language_Processing-0088ff.svg?style=for-the-badge" alt="NLP Badge"/>
</p>

## ✨ Key Features

* **Personalized Recommendations:** Get course suggestions tailored to your academic progress and interests.
* **Agentic AI Workflows:** Utilizes **Google's AI Developer Kit (ADK)** to create intelligent agents that can reason, plan, and execute complex advising tasks.
* **Automated Degree Audits:** Employs **Playwright** to securely log in and automatically fetch up-to-date degree audit data on behalf of the user.
* **Natural Language Understanding:** Ask questions in plain English and get accurate answers from a **custom NLP model** trained on official UMD advising PDFs and documents.
* **Mobile First:** A cross-platform application built with **React Native** for a seamless experience on both iOS and Android.

## 🏆 Bitcamp 2025 Hackathon Winner

NeoVisr was developed by a team of passionate students and won the **Moonshot Award** at the 2025 Bitcamp Hackathon at the University of Maryland. The project was recognized for its innovative application of AI, technical complexity, and its potential to solve a real-world problem for students.

## ⚙️ How It Works

NeoVisr is more than just a chatbot. It's a system of intelligent agents that work together to provide holistic academic advice.

1.  **The User Agent (React Native):** The user interacts with the mobile app, asking a question like, "What courses should I take next semester to graduate on time?"
2.  **The Orchestrator Agent (Google ADK):** This central agent receives the user's request. It understands the goal and breaks it down into smaller, manageable tasks.
3.  **The Data Fetching Agent (Playwright):** To get the most current academic data, the Orchestrator delegates a task to this agent. The Playwright agent runs in a secure, headless browser instance, navigates to the university's degree audit portal, handles the login process, and scrapes the necessary data from the student's report.
4.  **The Knowledge Agent (Custom NLP Model):** The Orchestrator passes the user's question and the freshly fetched audit data to our custom NLP model. This model, trained on hundreds of pages of advising documents, cross-references the student's progress with degree requirements to formulate an answer.
5.  **Synthesized Response:** The Orchestrator receives the structured information from the Knowledge Agent and delivers a clear, actionable recommendation to the user through the mobile app.

This **agentic workflow** allows NeoVisr to perform tasks that would normally require a human to log into different systems and cross-reference multiple documents.

## 🛠️ Tech Stack

| Category           | Technology                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Mobile Frontend**| `React Native`, `JavaScript/TypeScript`                                                                       |
| **AI Workflow** | `Google AI Developer Kit (ADK)`                                                                               |
| **Web Automation** | `Playwright`                                                                                                  |
| **AI/ML** | Custom NLP Model (`Python`, `spaCy`/`scikit-learn` assumed)                                                       |
| **Backend/Server** | `Node.js`, `Express.js` (assumed for API)                                                                       |

## 🚀 Getting Started

Follow these instructions to get a local copy of NeoVisr up and running on your machine.

### Prerequisites

* Node.js and npm: [https://nodejs.org/](https://nodejs.org/)
* React Native development environment setup: [https://reactnative.dev/docs/environment-setup](https://reactnative.dev/docs/environment-setup)
* Python and pip for the NLP model.
* An understanding of how to run Playwright scripts.

### Installation & Running

This project is likely structured as a monorepo with a `mobile` app and a backend `server`.

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/](https://github.com/)[your-username]/NeoVisr.git
    cd NeoVisr
    ```

2.  **Set up the Backend (Server with AI/Automation):**
    * Navigate to the server directory:
        ```sh
        cd server
        ```
    * Install backend and Python dependencies:
        ```sh
        # Install Node.js packages
        npm install

        # Set up a Python virtual environment
        python3 -m venv venv
        source venv/bin/activate

        # Install Python packages
        pip install -r requirements.txt # (You may need to create this file)
        ```
    * Install Playwright browsers:
        ```sh
        npx playwright install
        ```
    * Set up environment variables by creating a `.env` file and adding necessary keys (e.g., Google AI API keys).
        ```
        GOOGLE_API_KEY=your_google_api_key
        ```
    * Start the backend server:
        ```sh
        npm run start
        ```

3.  **Set up the Frontend (React Native App):**
    * Open a **new terminal** and navigate to the mobile app directory:
        ```sh
        cd ../mobile
        ```
    * Install npm packages:
        ```sh
        npm install
        ```
    * **For iOS:**
        ```sh
        cd ios && pod install && cd ..
        npm run ios
        ```
    * **For Android:**
        ```sh
        npm run android
        ```

You should now have the NeoVisr application running in your simulator/emulator, connected to your local backend.

## 🔮 Future Development

* [ ] Integrate with the university's course registration system to add classes directly.
* [ ] Expand the knowledge base to include more departments beyond Computer Science.
* [ ] Implement proactive notifications for registration deadlines and important academic dates.
* [ ] Enhance the agentic workflow to handle more complex, multi-step advising scenarios.

---
<p align="center">
Developed with ❤️ by the NeoVisr Team at Bitcamp 2025.
</p>
