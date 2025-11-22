// main.ts

import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";

// Helper to safely read required env vars
function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

// Read the contents of all files we want to review
async function readFiles(
  paths: string[]
): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
  for (const path of paths) {
    const content = await Deno.readTextFile(path);
    results.push({ path, content });
  }
  return results;
}

// Build the code review prompt given file contents
function buildCodeReviewPrompt(files: { path: string; content: string }[]) {
  const filesSection = files
    .map((f) => `File: ${f.path}\n\`\`\`ts\n${f.content}\n\`\`\`\n`)
    .join("\n");

  return `



${filesSection}
`;
}

async function main() {
  // 1. Decide which files to review:
  // - If user passes paths via CLI, use those
  // - Otherwise default to workspace/sample.ts
  const fileArgs = Deno.args.length > 0 ? Deno.args : ["workspace/sample.ts"];

  console.log("📂 Files to review:");
  for (const f of fileArgs) console.log(" -", f);
  console.log("");

  // 2. Read file contents
  const files = await readFiles(fileArgs);

  // 3. Create Zypher context (project workspace)
  const zypherContext = await createZypherContext(Deno.cwd());

  // 4. Create agent with Anthropic Claude provider
  const agent = new ZypherAgent(
    zypherContext,
    new AnthropicModelProvider({
      apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
    })
  );

  // 5. Build the task prompt
  const task = buildCodeReviewPrompt(files);

  console.log("🚀 Starting autonomous code review...\n");

  // 6. Run the task (same pattern as Quick Start, but with our custom prompt)
  const event$ = agent.runTask(
    task,
    "claude-sonnet-4-20250514" // adjust if needed based on your Anthropic account
  );

  let reviewMarkdown = "";

  for await (const event of eachValueFrom(event$)) {
    if (event.type === "text") {
      reviewMarkdown += event.content;
    }
  }

  console.log("\n\n================ FINAL CODE REVIEW ================\n");
  console.log(reviewMarkdown);
  console.log("\n===================================================\n");
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("❌ Error:", err);
    Deno.exit(1);
  });
}
