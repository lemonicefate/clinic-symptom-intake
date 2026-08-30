---
status: accepted
---

# Separate cloud relay from local identity

The Anonymous Cloud Relay will never receive patient name, medical record number, queue number, or Assigned Physician. It stores only opaque token metadata and application-layer ciphertext, while the clinic-local Intake Session owns identity mapping and decryption material; this accepts loss of in-flight intake data during local-host failure in exchange for keeping the public cloud unable to reconstruct a patient record.
