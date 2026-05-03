<script setup lang="ts">
  interface HomeProduct {
    id: number;
    name: string;
    slug: string | null;
    image: string | null;
    categoryId: number | null;
    deliveryType: string | null;
    minPrice: number | null;
  }

  interface HomeResponse {
    categories: Array<{
      id: number;
      name: string;
      slug: string | null;
      image: string | null;
      productCount: number;
    }>;
    products: HomeProduct[];
    homeLeftImageBanners: Array<{
      image: string;
      href: string;
    }>;
    homePromoBanners: Array<{
      label: string;
      title: string;
      description: string;
      icon: string;
      href: string;
    }>;
    sliders: Array<{
      id: number | string;
      title: string;
      image: string;
      order: number;
      active: boolean;
    }>;
  }

  const { data: homeData } = await useFetch<HomeResponse>("/api/home", {
    key: "home-page-data",
    default: () => ({
      categories: [],
      products: [],
      homeLeftImageBanners: [],
      homePromoBanners: [],
      sliders: [],
    }),
  });

  // SEO - Homepage
  useSeoHead({
    title: "Home",
    description:
      "Mua các tài khoản Premium, công cụ hữu ích với giá tốt nhất. Giao hàng tự động, hỗ trợ 24/7",
    keywords:
      "mua tài khoản, shop tài khoản, netflix, spotify, youtube premium",
    type: "website",
  });

  const products = computed(() => homeData.value?.products || []);

  interface FlashSaleItem {
    itemId: number;
    saleId: number;
    planId: number;
    productId: number;
    productName: string;
    productSlug: string | null;
    planName: string;
    image: string | null;
    originalPrice: number;
    salePrice: number;
    discountPercent: number;
    total: number;
    sold: number;
  }

  interface FlashSaleResponse {
    endAt: string | null;
    items: FlashSaleItem[];
  }

  const { data: flashSaleData } = await useFetch<FlashSaleResponse>(
    "/api/flash-sales",
    {
      key: "flash-sales-active",
      default: () => ({ endAt: null, items: [] }),
    }
  );

  const flashSaleItems = computed(() => flashSaleData.value?.items ?? []);

  interface HomeLeftImageBanner {
    image: string;
    href: string;
  }

  interface HomePromoBanner {
    label: string;
    title: string;
    description: string;
    icon: string;
    href: string;
  }

  const homeLeftImageBanners = computed<HomeLeftImageBanner[]>(() => {
    const configured = homeData.value?.homeLeftImageBanners ?? [];
    return configured
      .map((item) => ({
        image: String(item?.image || ""),
        href: String(item?.href || ""),
      }))
      .filter((item) => item.image);
  });

  const homePromoBanners = computed<HomePromoBanner[]>(() => {
    const configured = homeData.value?.homePromoBanners ?? [];
    return configured
      .map((item) => ({
        label: String(item?.label || ""),
        title: String(item?.title || ""),
        description: String(item?.description || ""),
        icon: String(item?.icon || ""),
        href: String(item?.href || ""),
      }))
      .filter(
        (item) => item.label || item.title || item.description || item.icon
      );
  });

  const heroSlides = computed(() =>
    (homeData.value?.sliders ?? [])
      .map((item) => String(item?.image || ""))
      .filter(Boolean)
  );
</script>

<template>
  <div
    class="min-h-screen bg-[#fafafa] font-sans text-slate-800 dark:bg-[#0f1115] dark:text-slate-200"
  >
    <LayoutHeader />
    <LayoutNavbar />

    <main class="mx-auto max-w-[1400px] px-4 pb-12 pt-6 lg:px-6">
      <HomeHero
        :left-banners="homeLeftImageBanners"
        :hero-slides="heroSlides"
        :promo-banners="homePromoBanners"
      />

      <HomeFlashSale
        :end-at="flashSaleData?.endAt || null"
        :items="flashSaleItems"
        @expired="refreshNuxtData('flash-sales-active')"
      />

      <HomeProducts :products="products" />
    </main>

    <LayoutFooter />
  </div>
</template>
