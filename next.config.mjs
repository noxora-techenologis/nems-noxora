/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide Next.js development badge (N icon) in production
  devIndicators: false,

  /* Allowed origins for local development via mobile/WebView */
  allowedDevOrigins: [
    '192.168.100.110',
    '192.168.56.1',
    '192.168.137.1',
  ],
};

export default nextConfig;
