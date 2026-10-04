-- Proteus Life native schema v2. Additive only; never edits Laravel or nutrition tables.
-- Existing installation must pass the bundled compatibility inspector.
-- Requires a fresh verified database + evidence backup and explicit operator approval.
-- MariaDB DDL commits implicitly: do not claim rollback via START TRANSACTION.
-- Expected checksum: 104a5bb288ee2cb3c523d3fb24aeaeea3a2d3f0d191d9bb8db7c1558190ccd76

CREATE TABLE IF NOT EXISTS proteus_life_schema (version INTEGER PRIMARY KEY, checksum VARCHAR(64) NOT NULL, applied_at VARCHAR(32) NOT NULL);

CREATE TABLE IF NOT EXISTS proteus_life_mutations (workspace_id BIGINT NOT NULL, user_id BIGINT NOT NULL, idempotency_key VARCHAR(100) NOT NULL, request_hash VARCHAR(64) NOT NULL, result_json TEXT NOT NULL, created_at VARCHAR(32) NOT NULL, PRIMARY KEY(workspace_id,user_id,idempotency_key));

INSERT INTO proteus_life_schema(version, checksum, applied_at)
SELECT 2, '104a5bb288ee2cb3c523d3fb24aeaeea3a2d3f0d191d9bb8db7c1558190ccd76', UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM proteus_life_schema WHERE version = 2);

-- Verify this exact checksum; a different existing checksum is a hard conflict.
SELECT version, checksum FROM proteus_life_schema WHERE version = 2;
