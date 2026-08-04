import { Tool } from "opencode";
import * as fs from "fs/promises";
import * as path from "path";

export interface GenerateEvidenceIndexParams {
  evidenceRoot?: string;
  format?: "json" | "markdown";
}

export interface GenerateEvidenceIndexResult {
  indexPath: string;
  totalMigrations: number;
  passCount: number;
  failCount: number;
  evidenceSessions: number;
}

export const generateEvidenceIndex: Tool<GenerateEvidenceIndexParams, GenerateEvidenceIndexResult> = {
  name: "generate-evidence-index",
  description: "Generate an index of all migration evidence sessions",
  parameters: {
    type: "object",
    properties: {
      evidenceRoot: { type: "string", description: "Evidence root directory (default: ./evidence)" },
      format: { type: "string", enum: ["json", "markdown"], description: "Output format" },
    },
  },
  async execute({ evidenceRoot = "./evidence", format = "markdown" }) {
    try {
      const migrations = await fs.readdir(evidenceRoot);
      let totalSessions = 0;
      let passCount = 0;
      let failCount = 0;
      const migrationSummaries: any[] = [];

      for (const m of migrations.sort()) {
        const mPath = path.join(evidenceRoot, m);
        if (!(await fs.stat(mPath)).isDirectory()) continue;

        const sessions = (await fs.readdir(mPath)).filter(s => {
          const stats = fs.statSync(path.join(mPath, s));
          return stats.isDirectory();
        });

        let lastReceipt: any = null;
        let lastStatus = "NOT_STARTED";

        for (const s of sessions.sort().reverse()) {
          const receiptPath = path.join(mPath, s, "receipt.json");
          try {
            const content = await fs.readFile(receiptPath, "utf-8");
            lastReceipt = JSON.parse(content);
            lastStatus = lastReceipt.Status || "UNKNOWN";
            break;
          } catch {}
        }

        if (lastStatus === "PASS") passCount++;
        else if (lastStatus === "FAIL") failCount++;
        
        totalSessions += sessions.length;

        migrationSummaries.push({
          migration: m,
          status: lastStatus,
          sessions: sessions.length,
          latestReceipt: lastReceipt?.Timestamp || null,
          evidencePath: sessions.length > 0 ? path.join(mPath, sessions.sort().reverse()[0]) : null,
        });
      }

      const output = {
        generatedAt: new Date().toISOString(),
        evidenceRoot,
        summary: {
          totalMigrations: migrations.length,
          totalSessions,
          passCount,
          failCount,
        },
        migrations: migrationSummaries,
      };

      const indexPath = path.join(evidenceRoot, `evidence-index.${format === "json" ? "json" : "md"}`);
      
      if (format === "json") {
        await fs.writeFile(indexPath, JSON.stringify(output, null, 2));
      } else {
        let md = `# Evidence Index\n\nGenerated: ${output.generatedAt}\n\n`;
        md += `## Summary\n\n`;
        md += `- Total Migrations: ${output.summary.totalMigrations}\n`;
        md += `- Total Evidence Sessions: ${output.summary.totalSessions}\n`;
        md += `- PASS: ${output.summary.passCount}\n`;
        md += `- FAIL: ${output.summary.failCount}\n\n`;
        
        md += `## Migrations\n\n`;
        md += `| Migration | Status | Sessions | Latest | Evidence |\n`;
        md += `|-----------|--------|----------|--------|----------|\n`;
        
        for (const m of migrationSummaries) {
          md += `| ${m.migration} | ${m.status} | ${m.sessions} | ${m.latestReceipt || "N/A"} | ${m.evidencePath || "N/A"} |\n`;
        }
        
        await fs.writeFile(indexPath, md);
      }

      return {
        indexPath,
        totalMigrations: migrations.length,
        passCount,
        failCount,
        evidenceSessions: totalSessions,
      };
    } catch (e) {
      throw new Error(`Failed to generate evidence index: ${e}`);
    }
  },
};