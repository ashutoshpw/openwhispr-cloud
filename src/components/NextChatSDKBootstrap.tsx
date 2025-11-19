import { baseURL } from "@/../baseUrl";

export function NextChatSDKBootstrap({ baseUrl }: { baseUrl: string }) {
  return (
    <>
      <base href={baseUrl} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.innerBaseUrl = "${baseUrl}";`,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  const appOrigin = new URL("${baseUrl}").origin;
  const isInIframe = window.self !== window.top;
  
  // Protect HTML element from modifications
  const htmlElement = document.documentElement;
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.target === htmlElement) {
        const attrName = mutation.attributeName;
        if (attrName && attrName !== 'suppresshydrationwarning') {
          htmlElement.removeAttribute(attrName);
        }
      }
    });
  });
  observer.observe(htmlElement, { attributes: true });

  // Patch history API
  const originalReplaceState = history.replaceState;
  history.replaceState = function(state, unused, url) {
    const u = new URL(url ?? "", window.location.href);
    const href = u.pathname + u.search + u.hash;
    return originalReplaceState.call(this, state, unused, href);
  };

  const originalPushState = history.pushState;
  history.pushState = function(state, unused, url) {
    const u = new URL(url ?? "", window.location.href);
    const href = u.pathname + u.search + u.hash;
    return originalPushState.call(this, state, unused, href);
  };

  // Handle external links
  window.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || !a.href) return;

    try {
      const url = new URL(a.href, window.location.href);
      const isExternal = url.origin !== window.location.origin && url.origin !== appOrigin;
      
      if (isExternal) {
        if (window.openai) {
          window.openai?.openExternal({ href: a.href });
          e.preventDefault();
        }
      }
    } catch {
      console.warn('openExternal failed, likely not in OpenAI client');
    }
  }, true);

  // Patch fetch API for cross-origin requests
  if (isInIframe && window.location.origin !== appOrigin) {
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      let url;
      try {
        url = typeof input === 'string' ? new URL(input, window.location.href) : new URL(input.url, window.location.href);
      } catch {
        return originalFetch.call(window, input, init);
      }

      if (url.origin === appOrigin) {
        const newInit = { ...init, mode: 'cors' };
        return originalFetch.call(window, input, newInit);
      }

      if (url.origin === window.location.origin) {
        const newUrl = new URL("${baseUrl}");
        newUrl.pathname = url.pathname;
        newUrl.search = url.search;
        newUrl.hash = url.hash;
        
        const newRequest = new Request(newUrl.toString(), init);
        const newInit = { ...init, mode: 'cors' };
        return originalFetch.call(window, newRequest, newInit);
      }

      return originalFetch.call(window, input, init);
    };
  }
})();
          `,
        }}
      />
    </>
  );
}
