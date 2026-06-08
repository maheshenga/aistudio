import { useEffect } from 'react';

// This hook audits the DOM for elements that use hardcoded margins or paddings
// and warns the developer to use CSS variables (e.g., var(--spacing-md)) instead.
export function useLayoutAuditor(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || process.env.NODE_ENV === 'production') return;

    const checkLayout = () => {
      // Find all elements in the body
      const elements = document.querySelectorAll('body *');
      
      const hardcodedRegex = /\b(m|p|mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py)-[0-9]+\b/;
      const arbitraryRegex = /\b(m|p|mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py)-\[[0-9]+(px|rem|em)\]\b/;

      elements.forEach((el) => {
        // Skip svgs and scripts
        if (el.tagName.toLowerCase() === 'svg' || el.tagName.toLowerCase() === 'path' || el.tagName.toLowerCase() === 'script') {
          return;
        }

        const classList = Array.from(el.classList);
        const hasHardcodedClass = classList.some(
          (cls) => hardcodedRegex.test(cls) || arbitraryRegex.test(cls)
        );

        const inlineStyle = el.getAttribute('style') || '';
        const hasInlineSpacing = /(margin|padding).*?:.*?(px|rem|em)/i.test(inlineStyle);

        if (hasHardcodedClass || hasInlineSpacing) {
          console.warn(
            `[Layout Auditor] Found hardcoded spacing on element:`,
            el,
            `Classes: ${classList.join(' ')}`,
            hasInlineSpacing ? `Style: ${inlineStyle}` : '',
            `RECOMMENDATION: Use CSS spacing variables like var(--spacing-md)`
          );
        }
      });
    };

    // Run initially
    const timer = setTimeout(checkLayout, 2000);

    // Optional: Setup a MutationObserver to catch dynamically added elements
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach(m => {
        if (m.addedNodes.length > 0 || m.type === 'attributes') {
          shouldCheck = true;
        }
      });
      if (shouldCheck) {
        // Debounce check
        checkLayout();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [enabled]);
}
