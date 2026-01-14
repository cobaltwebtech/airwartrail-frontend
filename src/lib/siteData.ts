import ogImageSrc from "@/assets/static/opengraphimage.jpg";

export const siteMeta = {
	title: "Air War Trail",
	tagline: "Air War Trail bringing stories of the past",
	description: "Air War Trail bringing stories of the past",
	description_short: "Air War Trail video interviews",
	url: "https://www.airwartrail.com/",
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
	description: "Air War Trail is about World War II history and interviews.",
	image: ogImageSrc,
};
