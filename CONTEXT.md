# Clinic Symptom Intake

This context describes the short-lived workflow that collects a patient's current symptoms and prepares physician-reviewed chart drafts before information is transferred to the clinic's existing HIS. It is not a medical record or longitudinal patient-data system.

## Language

**Intake Session**:
A clinic-day-scoped record that links one visit's local patient identity, assigned physician, Public Token, Patient Answer, and Workflow State.
_Avoid_: Visit record, medical record, chart

**Clinic Day**:
The Asia/Taipei calendar day that owns an Intake Session and defines its latest possible retention and token expiry.
_Avoid_: Rolling 24-hour period

**Public Token**:
A single-Intake-Session capability that lets a patient access and revise a questionnaire until it is locked, cancelled, or expired.
_Avoid_: Patient ID, QR code

**Patient Answer**:
The patient's original structured symptom selections and optional Other Text for one Response Revision.
_Avoid_: Chart, HPI, physician note

**Response Revision**:
A monotonically ordered version of a Patient Answer submitted before physician review.
_Avoid_: Edit history, chart version

**Other Text**:
Optional patient-authored text for information not represented by the approved symptom choices.
_Avoid_: LLM prompt, physician note

**Workflow State**:
The user-visible state of an Intake Session: `waiting for input`, `submitted`, `viewed`, `completed`, or `cancelled`; midnight expiry deletes the session instead of preserving another state.
_Avoid_: Sync state, relay state

**Chart Draft**:
Editable English Chief Complaint and HPI text generated for physician review before explicit transfer to the HIS.
_Avoid_: Medical record, completed chart, SOAP note

**Clinical Content Release**:
An immutable, physician-approved version of the symptom catalogue, patient wording, and deterministic English templates used by an Intake Session.
_Avoid_: Live catalogue, physician preference

**Assigned Physician**:
The physician currently authorized to review an Intake Session's Patient Answer and Chart Draft.
_Avoid_: Treating physician, session owner

**Receptionist**:
A clinic user who manages Intake Sessions and Workflow State without access to Patient Answers or Chart Drafts.
_Avoid_: Staff user, operator

**Physician**:
A clinic user who reviews assigned Patient Answers, controls Chart Drafts, and confirms completion.
_Avoid_: Provider, reviewer

**Administrator**:
A clinic user who manages accounts and approved Clinical Content Releases without routine access to Patient Answers or Chart Drafts.
_Avoid_: Superuser

**Anonymous Cloud Relay**:
The public, identity-free exchange that temporarily holds opaque token state and encrypted response content for clinic retrieval.
_Avoid_: Cloud database, patient backend

**Clinic Sync Gateway**:
The clinic-side participant that initiates synchronization, validates retrieved responses, and reconnects them to local Intake Sessions.
_Avoid_: Cloud callback, inbound gateway

**Manual Workflow**:
The clinic's existing verbal history-taking process used whenever this system is unavailable or intentionally bypassed.
_Avoid_: Offline mode, fallback cache
