
/** @type {import('next').NextConfig} */
const nextConfig = {
  // تم ضبط الإعدادات لضمان عمل وضع التطوير (Dev Mode) وفتح الـ Web Preview بنجاح
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
};

export default nextConfig;
