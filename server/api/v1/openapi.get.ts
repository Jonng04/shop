export default defineEventHandler((event) => {
  const host =
    getHeader(event, "x-forwarded-host") ||
    getHeader(event, "host") ||
    "localhost:3000";
  const proto = getHeader(event, "x-forwarded-proto") || "http";
  const serverUrl = `${proto}://${host}`;

  return {
    openapi: "3.0.3",
    info: {
      title: "Shop API v1",
      version: "1.0.0",
      description: "Auto-generated basic OpenAPI document for API v1",
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: "Account" },
      { name: "Categories" },
      { name: "Products" },
      { name: "Orders" },
    ],
    components: {
      securitySchemes: {
        ApiKeyHeader: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Public API key",
        },
        ApiSecretHeader: {
          type: "apiKey",
          in: "header",
          name: "x-api-secret",
          description: "API secret",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            statusCode: { type: "integer" },
            message: { type: "string" },
          },
        },
      },
    },
    security: [{ ApiKeyHeader: [], ApiSecretHeader: [] }],
    paths: {
      "/api/v1/account": {
        get: {
          tags: ["Account"],
          summary: "Get current account profile",
          responses: {
            "200": { description: "OK" },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/categories": {
        get: {
          tags: ["Categories"],
          summary: "Get categories",
          responses: {
            "200": { description: "OK" },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/products": {
        get: {
          tags: ["Products"],
          summary: "Get products",
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
            { name: "category_id", in: "query", schema: { type: "integer" } },
            { name: "search", in: "query", schema: { type: "string" } },
            {
              name: "sort",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "newest",
                  "oldest",
                  "price_asc",
                  "price_desc",
                  "bestseller",
                ],
              },
            },
          ],
          responses: {
            "200": { description: "OK" },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/orders": {
        get: {
          tags: ["Orders"],
          summary: "Get current user's orders",
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "OK" },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        post: {
          tags: ["Orders"],
          summary: "Create order",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    coupon_code: { type: "string" },
                    note: { type: "string" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["plan_id"],
                        properties: {
                          plan_id: { type: "integer" },
                          quantity: { type: "integer", minimum: 1 },
                          fields: {
                            type: "object",
                            additionalProperties: true,
                          },
                        },
                      },
                    },
                  },
                  required: ["items"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Created" },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/orders/{id}": {
        get: {
          tags: ["Orders"],
          summary: "Get order detail by trans_id",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Order trans_id",
            },
          ],
          responses: {
            "200": { description: "OK" },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
    },
  };
});
