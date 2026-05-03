ALTER TABLE `products`
  ADD INDEX `idx_products_status_name` (`status`, `name`),
  ADD INDEX `idx_products_status_slug` (`status`, `slug`);
