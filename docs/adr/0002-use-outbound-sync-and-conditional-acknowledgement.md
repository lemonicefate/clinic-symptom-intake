---
status: accepted
---

# Use outbound sync and conditional acknowledgement

The Clinic Sync Gateway initiates every relay-management and retrieval connection over HTTPS; the public cloud has no inbound path to the clinic host. A response is acknowledged only after durable local commit, and the relay deletes ciphertext only when token, revision, and digest still match, so retry or a stale acknowledgement cannot delete a newer Patient Answer.
