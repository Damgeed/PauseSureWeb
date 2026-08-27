CREATE TABLE `privacy_event_daily_constrained` (
	`day` text NOT NULL CHECK (
		length(`day`) = 10
		AND `day` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
		AND date(`day`, '+0 days') = `day`
	),
	`event_name` text NOT NULL CHECK (`event_name` IN (
		'web_check_started',
		'web_check_completed',
		'result_viewed',
		'next_action_selected'
	)),
	`input_kind` text NOT NULL CHECK (`input_kind` IN (
		'none', 'text', 'link', 'screenshot', 'qr', 'phone'
	)),
	`risk` text NOT NULL CHECK (`risk` IN (
		'none', 'high', 'unclear', 'insufficient'
	)),
	`action` text NOT NULL CHECK (`action` IN (
		'none', 'verify', 'recover'
	)),
	`channel` text NOT NULL CHECK (`channel` = 'web'),
	`event_count` integer NOT NULL CHECK (`event_count` BETWEEN 1 AND 9007199254740991),
	`updated_at` integer NOT NULL CHECK (`updated_at` > 0),
	CHECK (
		(
			`event_name` = 'web_check_started'
			AND `input_kind` <> 'none'
			AND `risk` = 'none'
			AND `action` = 'none'
		)
		OR (
			`event_name` IN ('web_check_completed', 'result_viewed')
			AND `input_kind` <> 'none'
			AND `risk` <> 'none'
			AND `action` = 'none'
		)
		OR (
			`event_name` = 'next_action_selected'
			AND `input_kind` = 'none'
			AND `risk` <> 'none'
			AND `action` <> 'none'
		)
	),
	PRIMARY KEY(`day`, `event_name`, `input_kind`, `risk`, `action`, `channel`)
);

INSERT INTO `privacy_event_daily_constrained` (
	`day`,
	`event_name`,
	`input_kind`,
	`risk`,
	`action`,
	`channel`,
	`event_count`,
	`updated_at`
)
SELECT
	`day`,
	`event_name`,
	`input_kind`,
	`risk`,
	`action`,
	`channel`,
	`event_count`,
	`updated_at`
FROM `privacy_event_daily`;

DROP TABLE `privacy_event_daily`;

ALTER TABLE `privacy_event_daily_constrained` RENAME TO `privacy_event_daily`;
