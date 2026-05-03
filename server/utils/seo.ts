/**
 * Generate JSON-LD cho Product Schema
 */
export function generateProductSchema(product: {
  id: number;
  name: string;
  slug: string | null;
  image: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  description?: string | null;
  stockCount?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image || undefined,
    description: product.description || product.name,
    ...(product.minPrice && {
      offers: {
        "@type": "Offer",
        price: product.minPrice,
        priceCurrency: "VND",
        availability:
          (product.stockCount || 0) > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
      },
    }),
  };
}

/**
 * Generate JSON-LD cho BreadcrumbList
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate JSON-LD cho Organization Schema
 */
export function generateOrganizationSchema(org: {
  name: string;
  url: string;
  logo?: string;
  email?: string;
  phone?: string;
  facebook?: string;
  twitter?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: org.url,
    ...(org.logo && { logo: org.logo }),
    ...(org.email && { email: org.email }),
    ...(org.phone && { telephone: org.phone }),
    sameAs: [org.facebook, org.twitter].filter(Boolean),
  };
}

/**
 * Generate JSON-LD cho WebPage Schema
 */
export function generateWebPageSchema(page: {
  title: string;
  description?: string;
  url: string;
  published?: string;
  updated?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    headline: page.title,
    description: page.description,
    url: page.url,
    image: page.image || undefined,
    ...(page.published && { datePublished: page.published }),
    ...(page.updated && { dateModified: page.updated }),
  };
}
