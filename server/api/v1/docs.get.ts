export default defineEventHandler((event) => {
  setHeader(event, "content-type", "text/html; charset=utf-8");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shop API v1 - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/v1/openapi',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset,
      ],
      layout: 'StandaloneLayout',
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
    });
  </script>
</body>
</html>`;
});
