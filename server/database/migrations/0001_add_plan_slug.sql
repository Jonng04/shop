-- Migration: Add slug column to plans table
ALTER TABLE `plans` ADD COLUMN `slug` varchar(255) UNIQUE;
