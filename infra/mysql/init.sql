-- DataLake Entity Graph Explorer — MySQL 8 Initialization
-- Charset: utf8mb4 for full Unicode support (emojis, CJK, etc.)
-- Collation: utf8mb4_unicode_ci for case-insensitive comparison

SET NAMES utf8mb4;
SET character_set_client = utf8mb4;

CREATE DATABASE IF NOT EXISTS `datalake_graph`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `datalake_graph`;

-- Enable local_infile for potential bulk loads
SET GLOBAL local_infile = 1;

-- Set timezone
SET GLOBAL time_zone = '+00:00';
