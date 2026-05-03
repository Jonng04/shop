CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_user_id` int,
	`actor_name` varchar(255) NOT NULL,
	`actor_email` varchar(255),
	`actor_role` varchar(50) DEFAULT 'admin',
	`action` varchar(255) NOT NULL,
	`module` varchar(100) NOT NULL,
	`target` varchar(255) NOT NULL,
	`description` text,
	`level` varchar(50) DEFAULT 'info',
	`ip` varchar(45),
	`device` text,
	`metadata` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(120),
	`api_key` varchar(255) NOT NULL,
	`secret_hash` varchar(255) NOT NULL,
	`status` varchar(50) DEFAULT 'active',
	`last_used_at` timestamp,
	`expires_at` timestamp,
	`revoked_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_api_key_unique` UNIQUE(`api_key`)
);
--> statement-breakpoint
CREATE TABLE `banks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bank_name` varchar(255) NOT NULL,
	`bank_code` varchar(50),
	`account_number` varchar(50) NOT NULL,
	`account_name` varchar(255) NOT NULL,
	`status` varchar(50) DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `banks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `block_ips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip` varchar(45) NOT NULL,
	`username` varchar(255),
	`country` varchar(10) DEFAULT 'VN',
	`reason` text NOT NULL,
	`hit_count` int DEFAULT 0,
	`status` varchar(50) DEFAULT 'active',
	`block_type` varchar(50) DEFAULT 'manual',
	`blocked_at` timestamp DEFAULT (now()),
	`expires_at` timestamp,
	`last_seen_at` timestamp DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `block_ips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255),
	`image` text,
	`status` varchar(50) DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `coupon_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coupon_id` int NOT NULL,
	`user_id` int NOT NULL,
	`order_id` int,
	`discount_type` varchar(50) NOT NULL,
	`discount_value` int NOT NULL,
	`discount_amount` bigint NOT NULL,
	`order_value_before` bigint NOT NULL,
	`order_value_after` bigint NOT NULL,
	`status` varchar(50) DEFAULT 'applied',
	`reason` text,
	`applied_at` timestamp DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `coupon_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`discount_type` varchar(50) DEFAULT 'percent',
	`discount_value` int NOT NULL,
	`max_discount` int,
	`min_order_value` int,
	`applicable_product_ids` text,
	`applicable_category_ids` text,
	`usage_limit` int,
	`used_count` int DEFAULT 0,
	`max_per_user` int,
	`start_at` timestamp,
	`expiry_date` timestamp,
	`status` varchar(50) DEFAULT 'active',
	`description` text,
	`internal_note` text,
	`created_by` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `flash_sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flash_sale_id` int NOT NULL,
	`product_id` int,
	`plan_id` int,
	`discount_type` varchar(50) DEFAULT 'percent',
	`discount_value` bigint NOT NULL,
	`max_discount` bigint,
	`quantity_limit` int DEFAULT 0,
	`sold_count` int DEFAULT 0,
	`max_per_user` int DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flash_sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flash_sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255),
	`status` varchar(50) DEFAULT 'upcoming',
	`note` text,
	`start_at` timestamp,
	`end_at` timestamp,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flash_sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `flash_sales_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int,
	`plan_id` int,
	`stock_id` int,
	`product_name` varchar(255),
	`plan_name` varchar(255),
	`quantity` int DEFAULT 1,
	`unit_price` bigint DEFAULT 0,
	`subtotal_amount` bigint DEFAULT 0,
	`coupon_code` varchar(100),
	`discount_amount` bigint DEFAULT 0,
	`total_amount` bigint DEFAULT 0,
	`status` varchar(50) DEFAULT 'pending',
	`reason` text,
	`delivered_content` text,
	`delivered_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_code` varchar(50) NOT NULL,
	`user_id` int,
	`assigned_admin_id` int,
	`order_type` varchar(50) DEFAULT 'instant',
	`payment_type` varchar(50) DEFAULT 'balance',
	`payment_id` int,
	`fulfillment_status` varchar(50) DEFAULT 'pending',
	`coupon_code` varchar(100),
	`subtotal_amount` bigint DEFAULT 0,
	`discount_amount` bigint DEFAULT 0,
	`total_amount` bigint NOT NULL,
	`status` varchar(50) DEFAULT 'pending',
	`customer_note` text,
	`admin_note` text,
	`reason` text,
	`reservation_expires_at` timestamp,
	`processing_at` timestamp,
	`delivered_at` timestamp,
	`completed_at` timestamp,
	`cancelled_at` timestamp,
	`refunded_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_code_unique` UNIQUE(`order_code`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_code` varchar(50) NOT NULL,
	`user_id` int,
	`order_id` int,
	`type` varchar(50) DEFAULT 'checkout',
	`status` varchar(50) DEFAULT 'pending',
	`amount` bigint NOT NULL,
	`received_amount` bigint DEFAULT 0,
	`reference_code` varchar(255),
	`transfer_content` varchar(255),
	`note` text,
	`expired_at` timestamp,
	`paid_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_payment_code_unique` UNIQUE(`payment_code`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int,
	`name` varchar(255) NOT NULL,
	`image` text,
	`price` bigint NOT NULL,
	`duration_value` int,
	`duration_type` varchar(50),
	`status` varchar(50) DEFAULT 'active',
	`description` text,
	`delivery_type` varchar(50) DEFAULT 'manual',
	`fields` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_id` int,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255),
	`image` text,
	`description` text,
	`delivery_type` varchar(50) DEFAULT 'manual',
	`status` varchar(50) DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `stocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_id` int,
	`content` text NOT NULL,
	`status` varchar(50) DEFAULT 'available',
	`order_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `stocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_code` varchar(50) NOT NULL,
	`customer_user_id` int NOT NULL,
	`admin_user_id` int,
	`assigned_by_user_id` int,
	`order_id` int,
	`status` varchar(50) DEFAULT 'waiting',
	`priority` varchar(50) DEFAULT 'normal',
	`source` varchar(50) DEFAULT 'web',
	`subject` varchar(255),
	`tags` text,
	`last_message_id` int,
	`last_message_preview` text,
	`last_message_sender_role` varchar(50),
	`last_message_at` timestamp,
	`customer_unread_count` int DEFAULT 0,
	`admin_unread_count` int DEFAULT 0,
	`customer_last_read_message_id` int,
	`admin_last_read_message_id` int,
	`assigned_at` timestamp,
	`first_response_at` timestamp,
	`resolved_at` timestamp,
	`closed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_conversations_conversation_code_unique` UNIQUE(`conversation_code`)
);
--> statement-breakpoint
CREATE TABLE `support_message_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message_id` int NOT NULL,
	`storage_key` varchar(255),
	`file_name` varchar(255) NOT NULL,
	`original_name` varchar(255),
	`file_url` text NOT NULL,
	`thumbnail_url` text,
	`mime_type` varchar(150),
	`file_size` bigint DEFAULT 0,
	`width` int,
	`height` int,
	`duration_seconds` int,
	`deleted_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `support_message_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`client_message_id` varchar(100),
	`sender_user_id` int,
	`sender_role` varchar(50) NOT NULL,
	`message_type` varchar(50) DEFAULT 'text',
	`content` text,
	`metadata` text,
	`reply_to_message_id` int,
	`is_internal` boolean DEFAULT false,
	`is_edited` boolean DEFAULT false,
	`is_deleted` boolean DEFAULT false,
	`edited_at` timestamp,
	`deleted_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_messages_client_message_id_unique` UNIQUE(`client_message_id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`order_id` int,
	`payment_id` int,
	`balance_before` bigint NOT NULL,
	`amount` bigint NOT NULL,
	`balance_after` bigint NOT NULL,
	`type` varchar(50) NOT NULL,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`balance` bigint DEFAULT 0,
	`total_balance` bigint DEFAULT 0,
	`role` varchar(255) DEFAULT 'user',
	`reset_token` varchar(255),
	`last_ip` varchar(45),
	`device` text,
	`login_attempts` int DEFAULT 0,
	`status` varchar(50) DEFAULT 'active',
	`last_login_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`product_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usage` ADD CONSTRAINT `coupon_usage_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usage` ADD CONSTRAINT `coupon_usage_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usage` ADD CONSTRAINT `coupon_usage_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flash_sale_items` ADD CONSTRAINT `flash_sale_items_flash_sale_id_flash_sales_id_fk` FOREIGN KEY (`flash_sale_id`) REFERENCES `flash_sales`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flash_sale_items` ADD CONSTRAINT `flash_sale_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flash_sale_items` ADD CONSTRAINT `flash_sale_items_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flash_sales` ADD CONSTRAINT `flash_sales_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flash_sales` ADD CONSTRAINT `flash_sales_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_stock_id_stocks_id_fk` FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_assigned_admin_id_users_id_fk` FOREIGN KEY (`assigned_admin_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plans` ADD CONSTRAINT `plans_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_conversations` ADD CONSTRAINT `support_conversations_customer_user_id_users_id_fk` FOREIGN KEY (`customer_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_conversations` ADD CONSTRAINT `support_conversations_admin_user_id_users_id_fk` FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_conversations` ADD CONSTRAINT `support_conversations_assigned_by_user_id_users_id_fk` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_conversations` ADD CONSTRAINT `support_conversations_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_message_attachments` ADD CONSTRAINT `support_message_attachments_message_id_support_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `support_messages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_conversation_id_support_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `support_conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_sender_user_id_users_id_fk` FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `api_keys_user_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_keys_status_idx` ON `api_keys` (`status`);--> statement-breakpoint
CREATE INDEX `api_keys_user_status_idx` ON `api_keys` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `flash_sale_items_flash_sale_idx` ON `flash_sale_items` (`flash_sale_id`);--> statement-breakpoint
CREATE INDEX `flash_sale_items_product_idx` ON `flash_sale_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `flash_sale_items_plan_idx` ON `flash_sale_items` (`plan_id`);--> statement-breakpoint
CREATE INDEX `flash_sale_items_flash_sale_product_idx` ON `flash_sale_items` (`flash_sale_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `flash_sales_status_idx` ON `flash_sales` (`status`);--> statement-breakpoint
CREATE INDEX `flash_sales_start_at_idx` ON `flash_sales` (`start_at`);--> statement-breakpoint
CREATE INDEX `flash_sales_end_at_idx` ON `flash_sales` (`end_at`);--> statement-breakpoint
CREATE INDEX `flash_sales_status_start_end_idx` ON `flash_sales` (`status`,`start_at`,`end_at`);--> statement-breakpoint
CREATE INDEX `flash_sales_created_by_idx` ON `flash_sales` (`created_by`);--> statement-breakpoint
CREATE INDEX `support_conversations_customer_idx` ON `support_conversations` (`customer_user_id`);--> statement-breakpoint
CREATE INDEX `support_conversations_admin_idx` ON `support_conversations` (`admin_user_id`);--> statement-breakpoint
CREATE INDEX `support_conversations_assigned_by_idx` ON `support_conversations` (`assigned_by_user_id`);--> statement-breakpoint
CREATE INDEX `support_conversations_status_idx` ON `support_conversations` (`status`);--> statement-breakpoint
CREATE INDEX `support_conversations_order_idx` ON `support_conversations` (`order_id`);--> statement-breakpoint
CREATE INDEX `support_conversations_last_message_at_idx` ON `support_conversations` (`last_message_at`);--> statement-breakpoint
CREATE INDEX `support_conversations_admin_status_last_message_idx` ON `support_conversations` (`admin_user_id`,`status`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `support_conversations_customer_last_message_idx` ON `support_conversations` (`customer_user_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `support_conversations_status_last_message_idx` ON `support_conversations` (`status`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `support_message_attachments_message_idx` ON `support_message_attachments` (`message_id`);--> statement-breakpoint
CREATE INDEX `support_messages_conversation_idx` ON `support_messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `support_messages_sender_idx` ON `support_messages` (`sender_user_id`);--> statement-breakpoint
CREATE INDEX `support_messages_created_at_idx` ON `support_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `support_messages_conversation_created_at_idx` ON `support_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_messages_reply_to_idx` ON `support_messages` (`reply_to_message_id`);--> statement-breakpoint
CREATE INDEX `wishlists_user_idx` ON `wishlists` (`user_id`);--> statement-breakpoint
CREATE INDEX `wishlists_product_idx` ON `wishlists` (`product_id`);--> statement-breakpoint
CREATE INDEX `wishlists_user_product_idx` ON `wishlists` (`user_id`,`product_id`);