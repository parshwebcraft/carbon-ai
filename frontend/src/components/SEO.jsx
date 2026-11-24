import { useEffect } from "react";

export default function SEO({
  title = "AI CRM & Sales Automation Platform for Indian Businesses | ParshAgent",
  description = "ParshAgent is an AI-powered CRM and sales automation platform for Indian businesses. Automate outbound AI voice calls, WhatsApp campaigns, lead pipelines, and customer follow-ups from one platform.",
  canonical = "https://parshagent.com/",
  ogImage = "https://parshagent.com/images/social-preview.png",
}) {
  useEffect(() => {
    // Update Document Title
    document.title = title;

    // Helper to update or create meta tag
    const setMeta = (nameAttr, nameVal, content) => {
      let element = document.querySelector(`meta[${nameAttr}="${nameVal}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(nameAttr, nameVal);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Update Meta Description
    setMeta("name", "description", description);

    // Update Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", ogImage);

    // Update Twitter Cards
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);

    // Update Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", canonical);
  }, [title, description, canonical, ogImage]);

  return null;
}
