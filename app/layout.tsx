import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { DesignerProvider } from './contexts/DesignerContext'

export const metadata: Metadata = {
  title: 'Cratere - Next.js + Sanity CMS',
  description: 'A Next.js application with embedded Sanity CMS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
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


