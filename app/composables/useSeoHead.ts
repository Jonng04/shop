/**
 * Composable helper để set SEO meta tags
 * Lấy config từ SITE_URL trong .env
 */

export interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: "website" | "article" | "product";
  published?: string;
  updated?: string;
  author?: string;
  structuredData?: Record<string, any>;
}

/**
 * Hook để set SEO head tags
 * @param meta - SEO metadata object (optional)
 */
export function useSeoHead(meta?: SeoMeta) {
  const runtimeConfig = useRuntimeConfig();
  const route = useRoute();

  const siteUrl = (
    (runtimeConfig.public.siteUrl as string) || "http://localhost:3000"
  ).replace(/\/$/, "");
  const fullUrl = computed(() => `${siteUrl}${route.fullPath}`);

  // Build title
  const pageTitle = computed(() => {
    return meta?.title || "Shop";
  });

  // Build description
  const pageDescription = computed(() => {
    return meta?.description || "Mua tài khoản & công cụ trực tuyến";
  });

  // Build keywords
  const pageKeywords = computed(() => {
    return meta?.keywords || "shop, tài khoản, công cụ";
  });

  // Build image
  const pageImage = computed(() => meta?.image || `${siteUrl}/og-image.png`);

  // Use useHead to set meta tags
  useHead({
    title: pageTitle,
    meta: [
      {
        name: "description",
        content: pageDescription,
      },
      {
        name: "keywords",
        content: pageKeywords,
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      // Open Graph
      {
        property: "og:title",
        content: pageTitle,
      },
      {
        property: "og:description",
        content: pageDescription,
      },
      {
        property: "og:image",
        content: pageImage,
      },
      {
        property: "og:url",
        content: fullUrl,
      },
      {
        property: "og:type",
        content: meta?.type || "website",
      },
      // Twitter Card
      {
        name: "twitter:title",
        content: pageTitle,
      },
      {
        name: "twitter:description",
        content: pageDescription,
      },
      {
        name: "twitter:image",
        content: pageImage,
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
    link: [
      {
        rel: "canonical",
        href: fullUrl,
      },
    ],
    script: meta?.structuredData
      ? [
          {
            type: "application/ld+json",
            innerHTML: JSON.stringify(meta.structuredData),
          },
        ]
      : [],
  });
}
