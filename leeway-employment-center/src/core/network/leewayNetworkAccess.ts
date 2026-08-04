/**
 * LEEWAY NETWORK ACCESS DETECTION
 * Detects local and LAN URLs for multi-device access on home network
 */

export interface NetworkAccessInfo {
  localIP: string;
  hostname: string;
  localURLs: {
    publicCenter: string;
    adminCenter: string;
    motherboard: string;
  };
  lanURLs: {
    publicCenter: string;
    adminCenter: string;
    motherboard: string;
  };
  firewall: {
    warning: string;
    adminSecurityNote: string;
  };
}

/**
 * Detect local machine IP address
 */
export function detectLocalIP(): string {
  try {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Try to detect actual local IP from WebRTC
      return detectIPFromWebRTC();
    }
    return hostname;
  } catch (error) {
    console.error('[Network] Failed to detect local IP:', error);
    return 'localhost';
  }
}

/**
 * Detect local IP using WebRTC (works in all modern browsers)
 */
function detectIPFromWebRTC(): Promise<string> {
  return new Promise((resolve) => {
    const pc = new (window as any).RTCPeerConnection({ iceServers: [] });
    const ips: Set<string> = new Set();

    pc.createDataChannel('');
    pc.createOffer().then((offer) => pc.setLocalDescription(offer));

    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate) {
        resolve([...ips][0] || 'localhost');
        return;
      }

      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const match = ice.candidate.candidate.match(ipRegex);
      if (match) {
        ips.add(match[1]);
      }
    };

    // Timeout after 1 second
    setTimeout(() => {
      pc.close();
      resolve([...ips][0] || 'localhost');
    }, 1000);
  });
}

/**
 * Get network access information
 */
export async function getNetworkAccessInfo(): Promise<NetworkAccessInfo> {
  try {
    const localIP = await detectIPFromWebRTC().catch(() => 'localhost');
    const hostname = window.location.hostname || 'localhost';

    const info: NetworkAccessInfo = {
      localIP,
      hostname,
      localURLs: {
        publicCenter: 'http://localhost:3000',
        adminCenter: 'http://localhost:3000/admin',
        motherboard: 'http://localhost:5173'
      },
      lanURLs: {
        publicCenter: `http://${localIP}:3000`,
        adminCenter: `http://${localIP}:3000/admin`,
        motherboard: `http://${localIP}:5173`
      },
      firewall: {
        warning: `⚠️  FIREWALL: Admin routes exposed on LAN (${localIP}). Restrict access via firewall rules if needed.`,
        adminSecurityNote: `🔒 SECURITY: Admin Command Center requires authentication token. Do not share admin URLs publicly.`
      }
    };

    return info;
  } catch (error) {
    console.error('[Network] Failed to get network info:', error);
    return {
      localIP: 'localhost',
      hostname: 'localhost',
      localURLs: {
        publicCenter: 'http://localhost:3000',
        adminCenter: 'http://localhost:3000/admin',
        motherboard: 'http://localhost:5173'
      },
      lanURLs: {
        publicCenter: 'http://localhost:3000',
        adminCenter: 'http://localhost:3000/admin',
        motherboard: 'http://localhost:5173'
      },
      firewall: {
        warning: 'Unable to detect local IP. Using localhost only.',
        adminSecurityNote: 'Admin routes should not be exposed outside of secure networks.'
      }
    };
  }
}

/**
 * Display network access information to user
 */
export async function displayNetworkAccessReport(): Promise<void> {
  const info = await getNetworkAccessInfo();

  console.log('%c═══ LEEWAY NETWORK ACCESS REPORT ═══', 'color: cyan; font-weight: bold; font-size: 14px');
  console.log('%cHost Information:', 'color: yellow; font-weight: bold');
  console.log(`  Hostname: ${info.hostname}`);
  console.log(`  Local IP: ${info.localIP}`);

  console.log('%cLocal URLs (this machine):', 'color: green; font-weight: bold');
  console.log(`  Public: ${info.localURLs.publicCenter}`);
  console.log(`  Admin:  ${info.localURLs.adminCenter}`);
  console.log(`  3D:     ${info.localURLs.motherboard}`);

  if (info.localIP !== 'localhost') {
    console.log('%cLAN URLs (from other devices):', 'color: cyan; font-weight: bold');
    console.log(`  Public: ${info.lanURLs.publicCenter}`);
    console.log(`  Admin:  ${info.lanURLs.adminCenter}`);
    console.log(`  3D:     ${info.lanURLs.motherboard}`);
  }

  console.log('%cSecurity Notes:', 'color: orange; font-weight: bold');
  console.log(`  ${info.firewall.warning}`);
  console.log(`  ${info.firewall.adminSecurityNote}`);

  console.log('%c═══════════════════════════════════════', 'color: cyan; font-weight: bold');
}

/**
 * Get shareable network URLs for QR code or link sharing
 */
export async function getShareableNetworkURLs(): Promise<{
  publicCenter: string;
  activationToken: string;
}> {
  const info = await getNetworkAccessInfo();

  return {
    publicCenter: info.lanURLs.publicCenter,
    activationToken: '' // Will be filled when generating QR code
  };
}

/**
 * Generate network access report as markdown
 */
export async function generateNetworkAccessReportMarkdown(): Promise<string> {
  const info = await getNetworkAccessInfo();

  const report = `# LeeWay Network Access Report

Generated: ${new Date().toISOString()}

## Host Information

- **Hostname**: ${info.hostname}
- **Local IP**: ${info.localIP}
- **Platform**: ${navigator.platform}
- **Browser**: ${navigator.userAgent.split(' ').slice(-1)[0]}

## Local URLs (This Machine)

These URLs work on the machine running LeeWay:

\`\`\`
Public Employment Center:
  ${info.localURLs.publicCenter}

Admin Command Center:
  ${info.localURLs.adminCenter}

Agent Lee Motherboard (3D):
  ${info.localURLs.motherboard}
\`\`\`

## LAN URLs (Other Devices on Home Network)

If your machine's local IP is \`${info.localIP}\`, use these URLs from other devices on your home network:

\`\`\`
Public Employment Center:
  ${info.lanURLs.publicCenter}

Admin Command Center:
  ${info.lanURLs.adminCenter}

Agent Lee Motherboard (3D):
  ${info.lanURLs.motherboard}
\`\`\`

## Security Warnings

⚠️  **FIREWALL**: Admin routes are exposed on your local network (\`${info.localIP}\`). 

If you do not want other devices on your home network accessing admin endpoints, configure your firewall to:
- Allow port 3000 and 5173 locally only
- Block port 3000/admin and 5173 from external access

🔒 **SECURITY**: The Admin Command Center should be protected by governance rules and potentially firewall restrictions.

✅ **PUBLIC**: The Public Employment Center (port 3000) is intentionally public-facing.

## Mobile/Device Access

### From Smartphones on the Same Network

1. On your phone, open Safari or Chrome
2. Navigate to: \`${info.lanURLs.publicCenter}\`
3. You should see the Public Employment Center landing page
4. Tap on a job opportunity to submit an application

### Troubleshooting

If you cannot access from another device:
- **Check Network**: Both devices must be on the same WiFi network
- **Check Firewall**: Your firewall may be blocking port 3000
- **Check Host**: Verify the IP address is correct (\`${info.localIP}\`)
- **Check Ports**: Ensure ports 3000, 5173, 7640, 7630, 7650, 7651 are open locally

## Service Status

- **Employment Center**: Port 3000
- **Agent Lee Motherboard**: Port 5173
- **RTC**: Port 7640
- **GPU**: Port 7630
- **Device**: Port 7650
- **IOT**: Port 7651

All services bind to \`0.0.0.0\` for local network access.
`;

  return report;
}
