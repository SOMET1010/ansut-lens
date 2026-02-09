UPDATE social_api_config SET enabled = true, quota_limit = 10000 WHERE plateforme = 'twitter';
UPDATE social_api_config SET enabled = true, quota_limit = 1000 WHERE plateforme = 'linkedin';