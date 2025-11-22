# Autonomous-Code-Review-Agent

### Powered by **Zypher Agent + Anthropic Claude**

This project is a fully functional **AI-powered autonomous code review system** built using the **Zypher Agent framework**.  
It includes:

- A backend that runs AI-powered code reviews
- A professional UI where users can paste/upload code
- Streaming responses from the AI
- A clean workflow similar to senior engineer reviews

It demonstrates familiarity with:

✔️ Agentic development  
✔️ Zypher context + tools  
✔️ Deno runtime  
✔️ Streaming LLM execution  
✔️ Frontend + backend integration  


---

## 🛠️ Prerequisites

---

# 1. Install Deno

### **Windows (PowerShell)**

```powershell
irm https://deno.land/install.ps1 | iex
```
### Verify
```powershell
deno --version
```
### Environment Variables
Create a .env file in the project root:
```
ANTHROPIC_API_KEY=your_api_key_here

```
### Run the Web UI (Recommended)
Starts local server at http://localhost:8000
```
deno task dev
```
Then open:

👉 http://localhost:8000

### Run via CLI
Runs review on a default sample file:
```
deno task review
```

### How it Works
## 1. UI or CLI sends code
User pastes code or uploads a file

## 2. Server builds a structured prompt
Includes instructions, severity rules, test recommendations, etc.

## 3. Zypher agent runs
Creates an Anthropic Claude task
Streams review output in real-time

## 4. User sees a detailed review
Markdown output with analysis and suggested code fixes

## ✨ Features

### ✅ **1. Paste or Upload Any Code File**
Supports:
- `.ts`, `.js`, `.tsx`, `.jsx`
- `.py`, `.java`, `.go`, `.cs`, `.php`
- `.json`, `.html`, `.css`, `.txt`

### ✅ **2. Runs a Complete Senior-Level Code Review**
Agent analyzes:
- Bugs & risky logic  
- Performance issues  
- Validation gaps  
- Naming problems  
- Missing tests  
- Optional rewritten code  

### ✅ **3. Beautiful Real-Time UI**
- Dark theme  
- Responsive split layout  
- Large scrolling output panel  
- Pretty code textarea  
- File upload  
- Status text + spinner  
- Clear “Run Code Review” button  

### ✅ **4. Uses Zypher Agent Framework**
- `runTask()` agent execution  
- Anthropic Claude provider  
- Streaming events via `eachValueFrom`  


