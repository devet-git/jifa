"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  ChevronsRight,
  Clock,
  Layers,
  Link,
  Maximize2,
  PieChart,
  Play,
  Puzzle,
  Timer,
} from "lucide-react";

const TOOLS = [
  ["list_projects", "List your projects"],
  ["get_project", "Get project details"],
  ["list_issues", "Search/filter issues"],
  ["get_issue", "Get issue details"],
  ["create_issue", "Create a new issue"],
  ["list_sprints", "List project sprints"],
  ["get_sprint", "Get sprint details"],
  ["list_versions", "List project versions"],
  ["get_version", "Get version details"],
  ["list_wiki_pages", "List wiki pages"],
  ["get_wiki_page", "Get wiki content"],
  ["list_members", "List project members"],
  ["add_comment", "Add issue comment"],
] as const;

function ConfigBlock({
  label,
  icon,
  config,
  fileName,
  copyKey,
  copiedSection,
  onCopy,
  language,
}: {
  label: string;
  icon: React.ReactNode;
  config: string;
  fileName: string;
  copyKey: string;
  copiedSection: string | null;
  onCopy: (key: string, text: string) => void;
  language?: string;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-2/60 border-b border-border">
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted font-mono">{fileName}</span>
          <Button variant="secondary" size="xs" onClick={() => onCopy(copyKey, config)}>
            {copiedSection === copyKey ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <pre className={`text-xs font-mono p-4 overflow-x-auto leading-relaxed ${language === "bash" ? "bg-neutral-900 text-neutral-100" : ""}`}>
        {config}
      </pre>
    </div>
  );
}

export default function IntegrationsPage() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
  const mcpUrl = `${apiUrl}/mcp/sse`;

  async function copyUrl() {
    await navigator.clipboard.writeText(mcpUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function copyConfig(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-surface-2/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Puzzle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">MCP Integration</h2>
            <p className="text-xs text-muted">Connect AI coding assistants to JIFA via the Model Context Protocol</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {/* Server URL */}
        <div className="px-6 py-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Server URL</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-surface-2 border border-border px-3 py-2 rounded-lg select-all break-all">{mcpUrl}</code>
            <Button variant="secondary" size="sm" onClick={copyUrl}>{copiedUrl ? "Copied" : "Copy"}</Button>
          </div>
        </div>

        {/* Authentication */}
        <div className="px-6 py-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Authentication</h3>
          <p className="text-xs text-muted mb-3">
            Create an API token in the <strong>API Tokens</strong> tab, then include it in every MCP request.
          </p>
          <div className="p-3 rounded-lg bg-surface-2 border border-border">
            <code className="text-xs font-mono break-all">Authorization: Bearer &lt;your-token&gt;</code>
          </div>
        </div>

        {/* Client configs */}
        <div className="px-6 py-5 space-y-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Client Configuration</h3>

          <ConfigBlock
            label="Claude Desktop"
            icon={<Layers className="w-4 h-4 text-amber-600" />}
            config={JSON.stringify({ mcpServers: { jifa: { url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } } } }, null, 2)}
            fileName="claude_desktop_config.json"
            copyKey="claude"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="VS Code (Cline)"
            icon={<Maximize2 className="w-4 h-4 text-sky-600" />}
            config={JSON.stringify({ name: "jifa", type: "sse", url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } }, null, 2)}
            fileName="cline_mcp_settings.json"
            copyKey="cline"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Continue (VS Code)"
            icon={<Play className="w-4 h-4 text-purple-600" />}
            config={JSON.stringify({ mcpServers: { jifa: { type: "sse", url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } } } }, null, 2)}
            fileName="config.json"
            copyKey="continue"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Cursor"
            icon={<PieChart className="w-4 h-4 text-zinc-600" />}
            config={JSON.stringify({ mcpServers: { jifa: { url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } } } }, null, 2)}
            fileName=".cursor/mcp.json"
            copyKey="cursor"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Windsurf"
            icon={<Timer className="w-4 h-4 text-teal-600" />}
            config={JSON.stringify({ name: "jifa", type: "sse", transport: { url: mcpUrl, headers: { Authorization: "Bearer <your-token>" } } }, null, 2)}
            fileName=".windsurf/mcp_config.json"
            copyKey="windsurf"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="OpenCode"
            icon={<ChevronsRight className="w-4 h-4 text-sky-600" />}
            config={JSON.stringify({
              mcpServers: {
                jifa: {
                  url: mcpUrl,
                  headers: {
                    Authorization: "Bearer <your-token>",
                  },
                },
              },
            }, null, 2)}
            fileName="opencode.json"
            copyKey="opencode"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Antigravity"
            icon={<Clock className="w-4 h-4 text-orange-600" />}
            config={JSON.stringify({
              name: "jifa",
              transport: "sse",
              serverUrl: mcpUrl,
              headers: {
                Authorization: "Bearer <your-token>",
              },
            }, null, 2)}
            fileName="antigravity.json"
            copyKey="antigravity"
            copiedSection={copiedSection}
            onCopy={copyConfig}
          />

          <ConfigBlock
            label="Test with curl"
            icon={<Link className="w-4 h-4 text-green-600" />}
            config={`# Initialize SSE connection
curl -N "${mcpUrl}" \
  -H "Authorization: Bearer <your-token>"

# In a separate terminal, send a request via POST:
curl -X POST "${apiUrl}/mcp/message" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
            fileName="Terminal"
            copyKey="curl"
            copiedSection={copiedSection}
            onCopy={copyConfig}
            language="bash"
          />
        </div>

        {/* Tools list */}
        <div className="px-6 py-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Available Tools</h3>
          <p className="text-xs text-muted mb-3">The MCP server exposes these 13 tools for AI assistants:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {TOOLS.map(([name, desc]) => (
              <div key={name} className="flex items-center gap-2 py-0.5 text-xs">
                <code className="font-mono text-foreground text-[11px]">{name}</code>
                <span className="text-muted">— {desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
