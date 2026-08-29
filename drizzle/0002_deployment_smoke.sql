CREATE TABLE IF NOT EXISTS `deployment_smoke` (
	`id` integer PRIMARY KEY CHECK (`id` = 1),
	`web_version` text NOT NULL CHECK (
		length(`web_version`) BETWEEN 1 AND 64
		AND `web_version` GLOB 'pausesure-web-[0-9]*.[0-9]*.[0-9]*'
	),
	`checked_at` integer NOT NULL CHECK (`checked_at` > 0)
);
