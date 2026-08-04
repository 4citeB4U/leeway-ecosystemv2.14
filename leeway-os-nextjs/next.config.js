/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  redirects: async () => [
    { source: "/welcome", destination: "/s/welcome_to_leeway", permanent: false },
    { source: "/sign-in", destination: "/s/sign_in_or_create_id", permanent: false },
    { source: "/home", destination: "/s/leeway_home_1", permanent: false },
    { source: "/os", destination: "/s/leeway_os_desktop_1", permanent: false },
    { source: "/mobile", destination: "/s/leeway_os_mobile_desktop", permanent: false },
    { source: "/shell", destination: "/s/leeway_os_unified_shell", permanent: false },
    { source: "/workspaces", destination: "/s/workspaces", permanent: false },
    { source: "/evidence", destination: "/s/evidence_center", permanent: false },
    { source: "/agent", destination: "/s/agent_lee_interaction", permanent: false },
    { source: "/runtime", destination: "/s/control_center", permanent: false },
    { source: "/security", destination: "/s/security_setup", permanent: false },
    { source: "/apps", destination: "/s/app_launcher_1", permanent: false },
    { source: "/marketplace", destination: "/s/leeway_marketplace_1", permanent: false },
    { source: "/settings", destination: "/s/appearance_settings", permanent: false },
    { source: "/profile", destination: "/s/your_profile", permanent: false }
  ]
};

module.exports = nextConfig;
