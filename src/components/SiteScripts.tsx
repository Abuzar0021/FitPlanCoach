import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPublicSiteConfig } from "@/lib/site-config.functions";

// Injects third-party tracking snippets when the admin has set their IDs in the
// CMS. Both GA4 and Clarity load by appending an async script — exactly what
// their official snippets do — so client injection is the real integration, not
// a stub. Nothing loads until an ID is configured.

function injectGA4(id: string) {
  if (document.getElementById("ga4-src")) return;
  const loader = document.createElement("script");
  loader.id = "ga4-src";
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(loader);
  const init = document.createElement("script");
  init.id = "ga4-init";
  init.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
  document.head.appendChild(init);
}

function injectClarity(id: string) {
  if (document.getElementById("clarity-init")) return;
  const s = document.createElement("script");
  s.id = "clarity-init";
  s.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`;
  document.head.appendChild(s);
}

export function SiteScripts() {
  const fetchConfig = useServerFn(getPublicSiteConfig);
  useEffect(() => {
    fetchConfig()
      .then((c) => {
        const ga = c.analytics?.ga4_id?.trim();
        const clarity = c.analytics?.clarity_id?.trim();
        if (ga) injectGA4(ga);
        if (clarity) injectClarity(clarity);
      })
      .catch(() => {});
  }, [fetchConfig]);
  return null;
}
