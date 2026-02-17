/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['next-sanity'],
  async redirects() {
    return [
      {
        source: '/Media/Portfolio_Cratere_2025.pdf',
        destination: '/portfolio',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig




