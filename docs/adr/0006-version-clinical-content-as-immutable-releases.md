---
status: accepted
---

# Version clinical content as immutable releases

The symptom catalogue, Traditional Chinese patient wording, and deterministic English templates live in version-controlled YAML Clinical Content Releases. An Intake Session pins one release for its lifetime, and every release requires schema validation, golden-output tests, and physician approval so a later wording change cannot silently reinterpret an existing Patient Answer.
