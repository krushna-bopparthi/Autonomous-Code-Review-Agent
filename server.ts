// server.ts
// Full Deno + Zypher + simple UI server for Autonomous Code Review

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";

// ---------- Helpers ----------

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

// Build the code review task prompt
function buildCodeReviewPrompt(filename: string, code: string): string {
  return `


File: ${filename}
\`\`\`
${code}
\`\`\`
`;
}

// ---------- Zypher Agent Setup (created once, reused) ----------

const zypherContext = await createZypherContext(Deno.cwd());
const provider = new AnthropicModelProvider({
  apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
});
const agent = new ZypherAgent(zypherContext, provider);
// If you later add tools (file system, etc.), you'd register them here
// await agent.init(); // Not strictly necessary unless using MCP servers/tools

// ---------- Simple HTML UI ----------

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Autonomous Code Review Agent</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #050816;
      color: #e5e7eb;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
      .spinner {
        width: 42px;     /* increased from 18px → bigger spinner */
        height: 42px;    /* increased from 18px */
        border: 4px solid rgba(255,255,255,0.25);
        border-top: 4px solid #fff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        display: inline-block;
        margin-left: 8px;
      }

      @keyframes spin {
        100% { transform: rotate(360deg); }
      }
    header {
      padding: 16px 24px;
      border-bottom: 1px solid #1f2933;
      background: radial-gradient(circle at top, #1f2937 0, #050816 60%);
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    header h1 {
      margin: 0;
      font-size: 1.4rem;
      letter-spacing: 0.03em;
    }
    header span {
      font-size: 0.85rem;
      color: #9ca3af;
    }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 12px;
    }
    @media (min-width: 900px) {
      main {
        flex-direction: row;
      }
    }
    .panel {
      background: rgba(15, 23, 42, 0.95);
      border-radius: 16px;
      border: 1px solid #111827;
      padding: 16px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
    }
    .left, .right {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 300px;
    }
    .left { margin-bottom: 10px; }
    @media (min-width: 900px) {
      .left, .right { margin-bottom: 0; }
      .left { margin-right: 8px; }
      .right { margin-left: 8px; }
    }
    label {
      font-size: 0.85rem;
      color: #9ca3af;
      margin-bottom: 6px;
      display: block;
    }
    input[type="text"] {
      width: 100%;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid #374151;
      background: #020617;
      color: #e5e7eb;
      font-size: 0.9rem;
      margin-bottom: 8px;
    }
    textarea {
      width: 100%;
      flex: 1;
      resize: vertical;
      min-height: 220px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #374151;
      background: #020617;
      color: #e5e7eb;
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.85rem;
      line-height: 1.4;
    }
    textarea:focus, input:focus {
      outline: 1px solid #4f46e5;
      border-color: #6366f1;
    }
    .top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .file-label {
      font-size: 0.8rem;
      color: #9ca3af;
    }
    input[type="file"] {
      font-size: 0.8rem;
      color: #d1d5db;
    }
    button {
      padding: 8px 16px;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 10px 30px rgba(88, 80, 236, 0.5);
      transition: transform 0.08s ease, box-shadow 0.08s ease, opacity 0.2s ease;
    }
    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 40px rgba(88, 80, 236, 0.7);
    }
    button:disabled {
      opacity: 0.6;
      cursor: default;
      transform: none;
      box-shadow: none;
    }
    .status {
        font-size: 2rem;         /* default 0.8 → now larger */
        font-weight: 500;
        color: #a5b4fc;          /* lighter purple text */
        display: flex;
        align-items: center;
      }
    .review-output {
      flex: 1;
      overflow: auto;
      padding: 10px 12px;
      border-radius: 10px;
      background: radial-gradient(circle at top left, rgba(37,99,235,0.16), transparent 55%), #020617;
      border: 1px solid #1f2937;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .review-output h1,
    .review-output h2,
    .review-output h3 {
      margin-top: 1em;
      margin-bottom: 0.4em;
      font-weight: 600;
    }
    .review-output h1 { font-size: 1.15rem; }
    .review-output h2 { font-size: 1.02rem; }
    .review-output h3 { font-size: 0.95rem; }
    .review-output code {
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background: rgba(15,23,42,0.9);
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 0.85em;
    }
    .review-output pre {
      background: rgba(15,23,42, 0.9);
      padding: 8px 10px;
      border-radius: 8px;
      overflow: auto;
      font-size: 0.8rem;
      border: 1px solid #111827;
    }
    footer {
      padding: 8px 16px 14px;
      font-size: 0.75rem;
      color: #6b7280;
      text-align: right;
      border-top: 1px solid #111827;
      background: #020617;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Autonomous Code Review Agent</h1>
      <span>Powered by Zypher Agent + Anthropic Claude</span>
    </div>
    <span style="font-size:0.75rem;color:#6b7280;">Built by Krushna • Local demo</span>
  </header>
  <main>
    <section class="left panel">
      <div class="top-row" style="margin-left:20px;">
        <div style="flex:1; min-width: 160px;">
          <label for="filename">Filename (optional, just for context):</label>
          <input id="filename" type="text" placeholder="e.g. workspace/sample.ts" />
        </div>
        <div>
          <label class="file-label" for="fileInput">Or upload a file:</label><br />
          <input id="fileInput" type="file" accept=".ts,.tsx,.js,.jsx,.java,.py,.cs,.go,.kt,.rs,.php,.html,.css,.json,.txt" />
        </div>
      </div>
      <label for="code">Paste your code here:</label>
      <textarea id="code" placeholder="// Paste any code snippet or file contents here..."></textarea>
      <div class="top-row" style="margin-top: 10px;">
        <button id="reviewBtn">
          <span>▶</span>
          <span>Run Code Review</span>
        </button>
        <div class="status">
          <span id="statusText"></span>
          <div id="spinner" class="spinner" style="display:none;"></div>
        </div>
      </div>
    </section>
    <section class="right panel">
      <label>Review Output:</label>
      <div class="review-output" id="reviewOutput">
        Paste some code on the left and click <strong>Run Code Review</strong> to see a detailed review here.
      </div>
    </section>
  </main>
  <footer>
    This is a local demo UI. No code leaves your machine except the snippet sent to your configured Anthropic model via Zypher Agent.
  </footer>

  <script>
    const fileInput = document.getElementById('fileInput');
    const codeTextarea = document.getElementById('code');
    const filenameInput = document.getElementById('filename');
    const reviewBtn = document.getElementById('reviewBtn');
    const statusEl = document.getElementById('status');
    const reviewOutput = document.getElementById('reviewOutput');

    // When user selects a file, read its contents into the textarea
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const text = await file.text();
      codeTextarea.value = text;
      if (!filenameInput.value) {
        filenameInput.value = file.name;
      }
    });

    function setLoading(isLoading) {
      const spinner = document.getElementById("spinner");
      const statusText = document.getElementById("statusText");

      if (isLoading) {
        reviewBtn.disabled = true;
        spinner.style.display = "inline-block";
        statusText.textContent = "Running code review...";
      } else {
        reviewBtn.disabled = false;
        spinner.style.display = "none";
        statusText.textContent = "";
      }
    }


    reviewBtn.addEventListener('click', async () => {
      const code = codeTextarea.value.trim();
      const filename = filenameInput.value.trim() || "snippet.ts";

      if (!code) {
        statusEl.textContent = "Please paste some code or upload a file first.";
        return;
      }

      setLoading(true);
      reviewOutput.textContent = "";

      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, filename }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Request failed");
        }

        const data = await res.json();
        reviewOutput.textContent = data.review || "(No review text returned)";
        statusEl.textContent = "Review complete.";
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error running review. Check console.";
        reviewOutput.textContent = String(err);
      } finally {
        setLoading(false);
      }
    });
  </script>
</body>
</html>
`;

// ---------- HTTP Server ----------

interface ReviewRequestBody {
  code: string;
  filename?: string;
}

async function handleReviewRequest(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as ReviewRequestBody;
    const code = (body.code || "").toString();
    const filename = (body.filename || "snippet.ts").toString();

    if (!code.trim()) {
      return new Response(JSON.stringify({ error: "Code is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const task = buildCodeReviewPrompt(filename, code);
    const event$ = agent.runTask(
      task,
      // use a Claude model you have access to; update if needed:
      "claude-sonnet-4-20250514"
    );

    let reviewMarkdown = "";

    for await (const event of eachValueFrom(event$)) {
      if (event.type === "text") {
        reviewMarkdown += event.content;
      }
    }

    return new Response(JSON.stringify({ review: reviewMarkdown }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in /api/review:", err);
    return new Response(
      JSON.stringify({ error: String((err as Error).message || err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

console.log("🌐 Starting UI server on http://localhost:8000");

await serve(
  async (req) => {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return new Response(HTML_PAGE, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (req.method === "POST" && url.pathname === "/api/review") {
      return await handleReviewRequest(req);
    }

    return new Response("Not found", { status: 404 });
  },
  { port: 8000 }
);
