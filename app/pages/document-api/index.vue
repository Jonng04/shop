<script setup lang="ts">
  definePageMeta({ colorMode: "light" });

  useSeoHead({
    title: "Document API",
    description: "API v1 for auto order by API key/secret.",
  });

  const { origin } = useRequestURL();
  const baseUrl = computed(() => `${origin}/api/v1`);

  type DocItem = {
    id: string;
    title: string;
    method: "GET" | "POST";
    path: string;
    note: string;
    curl: string;
    response: string;
  };

  const docs = computed<DocItem[]>(() => [
    {
      id: "create-order",
      title: "Create Order",
      method: "POST",
      path: "/orders",
      note: "Create order and pay by balance",
      curl: `curl -X POST "${baseUrl.value}/orders" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <YOUR_API_KEY>" \\
  -H "X-API-Secret: <YOUR_API_SECRET>" \\
  -d '{
    "items":[{"plan_id":18,"quantity":1}],
    "coupon_code":""
  }'`,
      response: `{
  "success": true,
  "message": "Order created",
  "data": {
    "orders": [{"trans_id":"ORD1703750400ABC","status":"completed","total":100000}],
    "summary": {"total_amount":100000,"new_balance":400000}
  }
}`,
    },
    {
      id: "order-status",
      title: "Order Status",
      method: "GET",
      path: "/orders/{trans_id}",
      note: "Check order and delivery content",
      curl: `curl "${baseUrl.value}/orders/ORD1703750400ABC" \\
  -H "X-API-Key: <YOUR_API_KEY>" \\
  -H "X-API-Secret: <YOUR_API_SECRET>"`,
      response: `{
  "success": true,
  "data": {
    "order": {"trans_id":"ORD1703750400ABC","status":"completed","payment_status":"paid"},
    "delivery": {"items":["Account: user@example.com | Pass: abc123"],"delivered_count":1,"expected_count":1}
  }
}`,
    },
    {
      id: "order-list",
      title: "Order List",
      method: "GET",
      path: "/orders?page=1&limit=20&status=completed",
      note: "List orders with pagination",
      curl: `curl "${baseUrl.value}/orders?page=1&limit=20&status=completed" \\
  -H "X-API-Key: <YOUR_API_KEY>" \\
  -H "X-API-Secret: <YOUR_API_SECRET>"`,
      response: `{"success":true,"data":{"orders":[...],"pagination":{"current_page":1,"per_page":20,"total":45,"total_pages":3,"has_more":true}}}`,
    },
    {
      id: "product-list",
      title: "Product List",
      method: "GET",
      path: "/products?page=1&limit=10&sort=price_asc",
      note: "Get products + plans",
      curl: `curl "${baseUrl.value}/products?page=1&limit=10&sort=price_asc" \\
  -H "X-API-Key: <YOUR_API_KEY>" \\
  -H "X-API-Secret: <YOUR_API_SECRET>"`,
      response: `{"success":true,"data":{"products":[...],"pagination":{"current_page":1,"per_page":10,"total":120,"total_pages":12,"has_more":true}}}`,
    },
    {
      id: "category-list",
      title: "Category List",
      method: "GET",
      path: "/categories",
      note: "Get active categories",
      curl: `curl "${baseUrl.value}/categories" \\
  -H "X-API-Key: <YOUR_API_KEY>" \\
  -H "X-API-Secret: <YOUR_API_SECRET>"`,
      response: `{"success":true,"data":{"categories":[{"id":1,"name":"Entertainment","product_count":12}]}}`,
    },
    {
      id: "account-info",
      title: "Account Info",
      method: "GET",
      path: "/account",
      note: "Get account profile",
      curl: `curl "${baseUrl.value}/account" \\
  -H "X-API-Key: <YOUR_API_KEY>" \\
  -H "X-API-Secret: <YOUR_API_SECRET>"`,
      response: `{"success":true,"data":{"id":1,"username":"partner","email":"a@b.com","balance":400000,"status":"active"}}`,
    },
  ]);

  const fallbackDoc: DocItem = {
    id: "fallback",
    title: "Document",
    method: "GET",
    path: "/",
    note: "",
    curl: "",
    response: "",
  };

  const activeId = ref<string>("create-order");

  const activeDoc = computed<DocItem>(() => {
    return (
      docs.value.find((item) => item.id === activeId.value) ??
      docs.value[0] ??
      fallbackDoc
    );
  });

  const copiedKey = ref<string | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      copiedKey.value = key;
      setTimeout(() => {
        copiedKey.value = null;
      }, 2000);
    } catch {}
  };
</script>

<template>
  <div class="min-h-screen bg-[#f0f2f7] font-sans text-slate-800">
    <LayoutHeader />
    <LayoutNavbar />

    <main class="mx-auto max-w-[1400px] px-4 pb-20 pt-8 lg:px-6">
      <!-- Hero -->
      <section
        class="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-7 shadow-xl"
      >
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-400"
            >
              <span
                class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"
              ></span>
              API v1
            </span>
            <h1 class="mt-3 text-3xl font-bold tracking-tight text-white">
              Document API
            </h1>
            <p class="mt-1.5 text-sm text-slate-400">
              Use API key/secret to auto-buy from your external system.
            </p>
          </div>
          <div
            class="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur"
          >
            <Icon
              name="lucide:globe"
              class="h-4 w-4 shrink-0 text-emerald-400"
            />
            <span class="text-xs text-slate-400">Base URL</span>
            <code class="ml-1 font-mono text-sm font-semibold text-white">{{
              baseUrl
            }}</code>
            <button
              type="button"
              class="ml-2 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              @click="copyToClipboard(baseUrl, 'baseurl')"
            >
              <Icon
                :name="copiedKey === 'baseurl' ? 'lucide:check' : 'lucide:copy'"
                class="h-3.5 w-3.5"
              />
            </button>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <!-- Sidebar -->
        <aside class="lg:col-span-4 xl:col-span-3">
          <div
            class="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div class="border-b border-slate-100 px-4 py-3">
              <p
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400"
              >
                Endpoints
              </p>
            </div>
            <div class="p-2">
              <button
                v-for="item in docs"
                :key="item.id"
                type="button"
                class="mb-1 w-full rounded-xl px-3 py-2.5 text-left transition-all"
                :class="
                  item.id === activeId
                    ? 'bg-emerald-50 ring-1 ring-emerald-200'
                    : 'hover:bg-slate-50'
                "
                @click="activeId = item.id"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide"
                    :class="
                      item.method === 'POST'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-sky-100 text-sky-700'
                    "
                    >{{ item.method }}</span
                  >
                  <span
                    class="truncate text-[13px] font-semibold"
                    :class="
                      item.id === activeId
                        ? 'text-emerald-700'
                        : 'text-slate-700'
                    "
                    >{{ item.title }}</span
                  >
                </div>
                <p
                  class="mt-0.5 truncate pl-[52px] font-mono text-[11px]"
                  :class="
                    item.id === activeId ? 'text-emerald-500' : 'text-slate-400'
                  "
                >
                  {{ item.path }}
                </p>
              </button>
            </div>
          </div>
        </aside>

        <!-- Main content -->
        <div class="space-y-4 lg:col-span-8 xl:col-span-9">
          <!-- Endpoint detail -->
          <article
            class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <!-- Header -->
            <div
              class="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4"
            >
              <span
                class="rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide"
                :class="
                  activeDoc.method === 'POST'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-sky-100 text-sky-700'
                "
                >{{ activeDoc.method }}</span
              >
              <h2 class="text-lg font-bold text-slate-900">
                {{ activeDoc.title }}
              </h2>
              <code
                class="ml-auto rounded-lg bg-slate-100 px-3 py-1 font-mono text-xs text-slate-600"
                >{{ activeDoc.path }}
              </code>
            </div>

            <div class="p-6">
              <p class="text-sm text-slate-600">{{ activeDoc.note }}</p>

              <!-- cURL -->
              <div class="mt-5">
                <div class="mb-2 flex items-center justify-between">
                  <span
                    class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500"
                  >
                    <Icon name="lucide:terminal" class="h-3.5 w-3.5" />
                    cURL
                  </span>
                  <button
                    type="button"
                    class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    @click="copyToClipboard(activeDoc.curl, 'curl')"
                  >
                    <Icon
                      :name="
                        copiedKey === 'curl' ? 'lucide:check' : 'lucide:copy'
                      "
                      class="h-3 w-3"
                    />
                    {{ copiedKey === "curl" ? "Copied!" : "Copy" }}
                  </button>
                </div>
                <div
                  class="rounded-2xl bg-[#0d1117] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                >
                  <pre class="overflow-x-auto p-5 text-[12px] leading-6">
                    <code class="text-slate-300">{{ activeDoc.curl }}</code>
                  </pre>
                </div>
              </div>

              <!-- Response -->
              <div class="mt-5">
                <div class="mb-2 flex items-center justify-between">
                  <span
                    class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500"
                  >
                    <Icon name="lucide:braces" class="h-3.5 w-3.5" />
                    Response sample
                  </span>
                  <button
                    type="button"
                    class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    @click="copyToClipboard(activeDoc.response, 'response')"
                  >
                    <Icon
                      :name="
                        copiedKey === 'response'
                          ? 'lucide:check'
                          : 'lucide:copy'
                      "
                      class="h-3 w-3"
                    />
                    {{ copiedKey === "response" ? "Copied!" : "Copy" }}
                  </button>
                </div>
                <div
                  class="rounded-2xl bg-[#0d1117] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                >
                  <pre class="overflow-x-auto p-5 text-[12px] leading-6">
                    <code class="text-emerald-300">{{ activeDoc.response }}</code>
                  </pre>
                </div>
              </div>
            </div>
          </article>

          <!-- Auth headers -->
          <article
            class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div
              class="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4"
            >
              <Icon
                name="lucide:shield-check"
                class="h-4 w-4 text-emerald-600"
              />
              <h3 class="text-sm font-bold text-slate-900">
                Authentication Headers
              </h3>
            </div>
            <div class="p-6">
              <div
                class="rounded-2xl bg-[#0d1117] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
              >
                <pre
                  class="overflow-x-auto p-5 text-[12px] leading-6"
                ><code class="text-slate-300"><span class="text-sky-400">X-API-Key</span>: <NuxtLink to="/api-keys" class="text-amber-400 underline decoration-dotted hover:text-amber-300">lấy tại /api-keys</NuxtLink>
<span class="text-sky-400">X-API-Secret</span>: <NuxtLink to="/api-keys" class="text-amber-400 underline decoration-dotted hover:text-amber-300">lấy tại /api-keys</NuxtLink>
<span class="text-sky-400">Content-Type</span>: application/json</code></pre>
              </div>
              <p class="mt-3 text-xs text-slate-500">
                Tạo API key tại trang
                <NuxtLink
                  to="/api-keys"
                  class="font-semibold text-emerald-600 hover:underline"
                  >Quản lý API Keys</NuxtLink
                >. Lưu secret ngay khi tạo vì sẽ không hiện lại. Không hard-code
                ở frontend.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>

    <LayoutFooter />
  </div>
</template>

<style scoped>
  pre code {
    display: block;
    min-width: max-content;
    white-space: pre;
    font-family:
      "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
  }
</style>
