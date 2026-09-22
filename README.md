# 🤖 AI To-Do Agent

A terminal-based **Agentic AI** project that uses **Google Gemini** to understand natural language, choose the correct tool, and manage a PostgreSQL to-do database.

> My first hands-on project for learning Agentic AI with tool calling and LLM workflows.

## ✨ Features

* 💬 Natural language conversation in the terminal
* 🧠 AI reasoning with **PLAN → ACTION → OBSERVATION → OUTPUT**
* 🛠 Tool calling (LLM chooses which function to execute)
* 📝 Create, search, delete, and view todos
* 🗄 PostgreSQL database with Drizzle ORM
* 🔄 Continuous chat session with conversation history

## 🏗 Tech Stack

* **TypeScript**
* **Node.js**
* **Google Gemini SDK**
* **Drizzle ORM**
* **PostgreSQL**
* **Docker**
* **pnpm**
* **readline-sync**
* **dotenv**

## 🧠 Agent Workflow

```text
User
  │
  ▼
Gemini (Reasoning)
  │
  ▼
PLAN
  │
  ▼
ACTION (Tool Selection)
  │
  ▼
TypeScript Function
  │
  ▼
PostgreSQL Database
  │
  ▼
OBSERVATION
  │
  ▼
Final AI Response
```

## 🛠 Available Tools

* `getAllTodos()`
* `createTodo(todo)`
* `searchTodo(search)`
* `deleteTodoById(id)`

These tools are exposed to the LLM, allowing it to perform real actions instead of only generating text.

## 📁 Project Structure

```text
src/
├── index.ts          # Main AI agent
├── db/
│   ├── index.ts      # Database connection
│   └── schema.ts     # Todos schema
```

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ai-to-do
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

Create a `.env` file:

```env
DATABASE_URL=your_postgres_url
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Start PostgreSQL

```bash
docker compose up -d
```

### 5. Run the project

```bash
pnpm dev
```

## 💻 Example

```text
👤 You: Add task Fill Google Form

🤖 AI: Done! I've added "Fill Google Form" to your to-do list.

👤 You: Delete the Google Form task

🤖 AI: Successfully deleted the task.
```

## 🎯 What I Learned

* Building an Agentic AI from scratch
* Tool calling architecture
* LLM conversation state management
* Drizzle ORM with PostgreSQL
* Dockerized local databases
* TypeScript for backend development
* Prompt engineering for structured JSON outputs

## 🚀 Future Improvements

* Task completion status
* Due dates & priorities
* Update/Edit todos
* Bulk task creation
* React web interface
* LangGraph-based workflow

---

**Built with ❤️ while learning Agentic AI**
