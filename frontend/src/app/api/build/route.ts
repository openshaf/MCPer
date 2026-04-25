import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const execAsync = promisify(exec);

interface ApiInput {
  mode: "api" | "url" | "file";
  value: string;   // URL string OR file content
  name?: string;
}

interface RequestBody {
  apis: ApiInput[];
}

/**
 * POST /api/build
 *
 * Accepts a list of API inputs and runs the MCPer CLI (main.py) for each one.
 * Currently processes APIs sequentially — multi-API composition into a single
 * server will be added once the Python backend supports it.
 */
export async function POST(req: NextRequest) {
  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const { apis } = body;

  if (!apis || !Array.isArray(apis) || apis.length === 0) {
    return NextResponse.json({ detail: "No APIs provided." }, { status: 400 });
  }

  // Resolve the MCPer project root (two levels up from frontend/src/app/api/build/)
  const mcperRoot = path.resolve(process.cwd(), "..");
  const generatedDir = path.join(mcperRoot, "generated");

  const results: {
    apiName: string;
    serverPath: string;
    endpointCount: number;
  }[] = [];

  for (const api of apis) {
    const { mode, value, name } = api;

    if (!value || !value.trim()) {
      return NextResponse.json(
        { detail: `API "${name ?? "unnamed"}" has no value.` },
        { status: 400 }
      );
    }

    let flag: string;
    let arg: string;
    let tmpFile: string | null = null;

    if (mode === "api") {
      flag = "--api";
      arg = value.trim();
    } else if (mode === "url") {
      flag = "--url";
      arg = value.trim();
    } else {
      // file mode — value is the raw file content; write to a temp file
      tmpFile = path.join(os.tmpdir(), `mcper-upload-${Date.now()}.json`);
      await fs.writeFile(tmpFile, value, "utf-8");
      flag = "--file";
      arg = tmpFile;
    }

    try {
      const cmd = `uv run main.py ${flag} "${arg}" --out "${generatedDir}"`;
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: mcperRoot,
        timeout: 60_000,
      });

      // Parse server path from stdout
      const pathMatch = stdout.match(/Server written to (.+)/);
      const serverPath = pathMatch ? pathMatch[1].trim() : generatedDir;

      // Parse endpoint count from stdout (look for "Found N endpoint")
      const countMatch = stdout.match(/Found (\d+) endpoint/);
      const endpointCount = countMatch ? parseInt(countMatch[1], 10) : 0;

      results.push({
        apiName: name ?? path.basename(arg, ".json"),
        serverPath,
        endpointCount,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "stderr" in err
          ? String((err as { stderr: string }).stderr)
          : "Unknown error";

      return NextResponse.json({ detail: `Failed to build "${name}": ${msg}` }, { status: 500 });
    } finally {
      if (tmpFile) {
        await fs.unlink(tmpFile).catch(() => null);
      }
    }
  }

  const totalEndpoints = results.reduce((s, r) => s + r.endpointCount, 0);
  const firstServer = results[0];
  const apiNames = results.map((r) => r.apiName);

  // Build the run command and Claude Desktop config snippet
  const runCommand = `uv run -q --directory "${path.dirname(firstServer.serverPath)}" "${firstServer.serverPath}"`;

  const configSnippet = JSON.stringify(
    {
      mcpServers: Object.fromEntries(
        results.map((r) => [
          r.apiName.toLowerCase().replace(/\s+/g, "_"),
          {
            command: "uv",
            args: [
              "run",
              "-q",
              "--directory",
              path.dirname(r.serverPath),
              r.serverPath,
            ],
          },
        ])
      ),
    },
    null,
    2
  );

  return NextResponse.json({
    serverPath: firstServer.serverPath,
    apiNames,
    totalEndpoints,
    configSnippet,
    runCommand,
  });
}
