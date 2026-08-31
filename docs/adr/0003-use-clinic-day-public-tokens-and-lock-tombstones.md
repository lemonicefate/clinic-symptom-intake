---
status: accepted
---

# Use clinic-day public tokens and lock tombstones

Each Intake Session receives an independent 256-bit Public Token that expires at the next Asia/Taipei midnight and can accept Response Revisions until atomic physician lock, cancellation, or expiry. Lock deletes response ciphertext after clinic acknowledgement but retains a minimal identity-free `locked` tombstone until midnight so a patient receives an accurate locked message; this deliberately refines Issue #1's literal instruction to delete the empty token record immediately on lock.
