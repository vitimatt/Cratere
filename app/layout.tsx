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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cratere',
    description: 'Studio Cratere is a photography and creative studio. We want to see the world and give it meaning.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://cratere.studio',
  }

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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


