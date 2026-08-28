CREATE TABLE IF NOT EXISTS `privacy_event_daily` (
	`day` text NOT NULL,
	`event_name` text NOT NULL,
	`input_kind` text DEFAULT 'none' NOT NULL,
	`risk` text DEFAULT 'none' NOT NULL,
	`action` text DEFAULT 'none' NOT NULL,
	`channel` text NOT NULL,
	`event_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`day`, `event_name`, `input_kind`, `risk`, `action`, `channel`)
);
