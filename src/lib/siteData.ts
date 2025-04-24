import ogImageSrc from "@/images/placeholder.png";

export const siteMeta = {
  title: "Airwar Trail",
  tagline: "Airwar Trail bringing stories of the past",
  description: "Airwar Trail bringing stories of the past",
  description_short: "Airwar Trail video interviews",
  url: "https://airwartrail.cobaltdev.workers.dev/",
  author: "Cobalt Web Technologies",
};

export const seoMeta = {
  title: siteMeta.title,
  description: siteMeta.description,
  structuredData: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    inLanguage: "en-US",
    "@id": siteMeta.url,
    url: siteMeta.url,
    name: siteMeta.title,
    description: siteMeta.description,
    isPartOf: {
      "@type": "WebSite",
      url: siteMeta.url,
      name: siteMeta.title,
      description: siteMeta.description,
    },
  },
};

export const openGraph = {
  locale: "en_US",
  type: "website",
  url: siteMeta.url,
  title: `${siteMeta.title} - Airwar Trail bringing stories of the past`,
  description: "Airwar Trail is about World War II history and interviews.",
  image: ogImageSrc,
};
