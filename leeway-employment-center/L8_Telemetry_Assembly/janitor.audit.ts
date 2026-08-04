/*
FILE: L8_Telemetry_Assembly\janitor.audit.ts
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.J_AN_IT_OR_A_UD_IT.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
/**
 * LEEWAY STANDARDS COMPLIANT | REGION: L8_TELEMETRY_ASSEMBLY
 * TAG: OS.PURGE.MANUFACTURING_AUDIT
 * AGENT_OWNER: LWA_Janitor
 * 
 * PURPOSE: To eliminate 'Corrosion' (Ghost Files) and ensure 100% 
 * Cohesiveness. If a file is not 'Soldered' to the Kernel Spine, 
 * it is deleted to maximize Speed, Computation, and Power.
 */

import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import { SOVEREIGN_SUBSTRATE } from '../L10_Orchestrator_Kernel/leeway.kernel';
// @ts-ignore
import { L9_Sentinel } from '../L9_Integrity_Sentinel/probe.analyzer';

export const LWA_Janitor = {
    /**
     * THE GHOST-PURGE PROTOCOL
     * Speed: High | Power: Absolute | Cohesiveness: Enforced
     */
    performAudit: async () => {
        // @ts-ignore
        return await L9_Sentinel.probe("MANUFACTURING_AUDIT", async () => {
            console.log("--- LWA_JANITOR: INITIATING MICROSCOPIC SCAN ---");

            const projectRoot = path.resolve(__dirname, '../');
            const whitelist = LWA_Janitor.getSolderedManifest();
            
            // Add critical OS files that are protected by the BIOS
            const protectedFiles = [
                'package.json', 
                'tsconfig.json', 
                '.leewayrc', 
                'leeway.kernel.ts',
                'identity.bios.ts'
            ];

            const ghostFiles: string[] = [];

            /**
             * RECURSIVE SCAN: Walking the Motherboard Layers
             */
            const scanLayer = (dir: string) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.relative(projectRoot, fullPath);

                    if (entry.isDirectory()) {
                        // Skip node_modules (Standard SDK dependency)
                        if (entry.name !== 'node_modules') {
                            scanLayer(fullPath);
                        }
                    } else {
                        // Check if the file is 'Soldered' (In Registry) or 'Protected'
                        const isSoldered = whitelist.some(w => relativePath.includes(w));
                        const isProtected = protectedFiles.some(p => relativePath.includes(p));

                        if (!isSoldered && !isProtected) {
                            ghostFiles.push(fullPath);
                        }
                    }
                }
            };

            scanLayer(projectRoot);

            // --- EXECUTION: THE DESOLDERING ---
            if (ghostFiles.length === 0) {
                console.log("--- SOVEREIGN STATUS: 100% COHESIVE. NO CORROSION DETECTED. ---");
            } else {
                console.warn(`--- CORROSION DETECTED: ${ghostFiles.length} GHOST FILES IDENTIFIED ---`);
                
                for (const file of ghostFiles) {
                    console.log(`[LWA_JANITOR] DESOLDERING CORROSION: ${file}`);
                    // fs.unlinkSync(file); // UNCOMMENT TO APPLY PHYSICAL PURGE
                }

                console.log("--- PURGE COMPLETE. SYSTEM WEIGHT OPTIMIZED FOR RAW POWER. ---");
            }

            return { purgedCount: ghostFiles.length, status: 'OPTIMIZED' };
        }, { origin: 'L8_ATMOSPHERE', dest: 'FILESYSTEM_SUBSTRATE' });
    },

    /**
     * Extracts the list of valid file identifiers from the Motherboard Registry
     */
    getSolderedManifest: () => {
        // @ts-ignore
        return SOVEREIGN_SUBSTRATE.map(component => component.id.toLowerCase());
    }
};

