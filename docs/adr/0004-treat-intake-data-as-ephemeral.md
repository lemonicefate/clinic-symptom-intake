---
status: accepted
---

# Treat intake data as ephemeral

The HIS, not this system, is the durable clinical record, so Patient Answers, identity mappings, Public Tokens, and Chart Drafts are not backed up and are deleted after the Clinic Day. Local sensitive fields use a Clinic-Day key that is destroyed during fenced cleanup; this promises operational and cryptographic deletion from the application, not recovery resistance against an administrator controlling the running host or specialized storage forensics.
