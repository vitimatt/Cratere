import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { DesignerProvider } from './contexts/DesignerContext'

export const metadata: Metadata = {
  title: 'Cratere',
  description: 'Studio Cratere is a photography and creative studio. We want to see the world and give it meaning.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://cratere.studio'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: 'Cratere',
    description: 'Studio Cratere is a photography and creative studio. We want to see the world and give it meaning.',
    type: 'website',
    locale: 'en',
    siteName: 'Cratere',
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: 'Cratere',
    description: 'Studio Cratere is a photography and creative studio. We want to see the world and give it meaning.',
  },
  icons: {
    icon: '/favicon/favicon.png',
  },
  category: 'photography',
  keywords: [
    'Studio Cratere',
    'photography studio Milan',
    'photographer Milan',
    'creative studio Milan',
    'contemporary photography',
    'artistic photography',
    'still life photography',
    'fashion photography',
    'design photography',
    'campaign photography',
    'creative practice Milan',
    'commercial photography',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cratere.studio'

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness', 'ProfessionalService'],
    '@id': `${baseUrl}/#organization`,
    name: 'Cratere',
    alternateName: 'Studio Cratere',
    description: 'Studio Cratere is a photography and creative studio based in Milan, Italy. We specialize in artistic, creative, and contemporary photography with a focus on still life. We work with design and fashion brands on campaigns and artistic projects. Creative practice for commercial photography, editorial, and artistic commissions.',
    url: baseUrl,
    logo: `${baseUrl}/favicon/favicon.png`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Viale Abruzzi 32',
      addressLocality: 'Milan',
      addressRegion: 'Lombardy',
      addressCountry: 'IT',
    },
    areaServed: {
      '@type': 'City',
      name: 'Milan',
      containedInPlace: { '@type': 'Country', name: 'Italy' },
    },
    knowsAbout: [
      'photography',
      'still life photography',
      'fashion photography',
      'design photography',
      'campaign photography',
      'artistic photography',
      'contemporary photography',
      'creative studio',
      'commercial photography',
      'editorial photography',
    ],
    serviceType: [
      'Photography studio',
      'Creative studio',
      'Still life photography',
      'Fashion photography',
      'Campaign photography',
      'Artistic photography',
    ],
    slogan: 'We want to see the world and give it meaning.',
  }

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              '@id': `${baseUrl}/#website`,
              name: 'Studio Cratere',
              alternateName: 'Cratere',
              description: 'Photography and creative studio in Milan. Artistic, contemporary still life photography for fashion, design brands, and campaigns.',
              url: baseUrl,
              publisher: { '@id': `${baseUrl}/#organization` },
              inLanguage: 'en',
            }),
          }}
        />
        <DesignerProvider>{children}</DesignerProvider>
        <Script id="remove-editor-overlay" strategy="afterInteractive">
          {`
            (function() {
              function removeEditorOverlay() {
                // Remove any elements containing "Click to open in your editor" text
                const walker = document.createTreeWalker(
                  document.body,
                  NodeFilter.SHOW_TEXT,
                  null
                );
                let node;
                while (node = walker.nextNode()) {
                  if (node.textContent && node.textContent.includes('Click to open in your editor')) {
                    let parent = node.parentElement;
                    while (parent && parent !== document.body) {
                      parent.remove();
                      return;
                    }
                  }
                }
                
                // Also check for common IDE overlay selectors
                const selectors = [
                  '[data-cursor-ide]',
                  '[class*="cursor-ide"]',
                  '[id*="cursor-ide"]',
                  '[class*="vscode"]',
                  '[id*="vscode"]',
                  '[class*="editor-overlay"]',
                  '[id*="editor-overlay"]'
                ];
                selectors.forEach(selector => {
                  try {
                    document.querySelectorAll(selector).forEach(el => {
                      if (el.textContent && el.textContent.includes('open in your editor')) {
                        el.remove();
                      }
                    });
                  } catch(e) {}
                });
              }
              
              // Run immediately and on DOM changes
              removeEditorOverlay();
              const observer = new MutationObserver(removeEditorOverlay);
              observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
              });
              
              // Also run periodically as a fallback
              setInterval(removeEditorOverlay, 500);
            })();
          `}
        </Script>
      </body>
    </html>
  )
}


