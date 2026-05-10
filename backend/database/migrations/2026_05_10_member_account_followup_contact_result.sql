ALTER TABLE member_account_followups
    ADD COLUMN last_contact_result ENUM('responded','no_response','wrong_number','promise_confirmed') NULL AFTER notes,
    ADD COLUMN last_contact_at DATETIME NULL AFTER last_contact_result;

CREATE INDEX idx_maf_contact_result ON member_account_followups (tenant_id, gym_id, last_contact_result, last_contact_at);
