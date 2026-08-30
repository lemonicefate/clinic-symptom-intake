import * as z from 'zod';

export const PROTOCOL_VERSION = 1 as const;

const base64urlSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);
const identifierSchema = z.string().min(1).max(128);

export const durationSchema = z.strictObject({
  value: z.number().positive().finite(),
  unit: z.enum(['hour', 'day', 'week', 'month', 'year']),
});

export const symptomAnswerSchema = z.strictObject({
  symptomId: identifierSchema,
  laterality: z.enum(['left', 'right', 'bilateral']).optional(),
  duration: durationSchema,
  severity: z.number().int().min(1).max(10),
});

export const patientAnswerSchema = z.strictObject({
  answerVersion: z.literal(1),
  symptoms: z.array(symptomAnswerSchema).min(1).max(20),
  otherText: z.string().max(2000).optional(),
});

export const responseMetadataSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  clinicRelayId: identifierSchema,
  lookupId: base64urlSchema,
  contentVersion: identifierSchema,
  submissionId: z.uuid(),
  revision: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export const relayEnvelopeSchema = z.strictObject({
  metadata: responseMetadataSchema,
  nonce: base64urlSchema,
  ciphertext: base64urlSchema,
  digest: base64urlSchema,
});

export type Duration = z.infer<typeof durationSchema>;
export type SymptomAnswer = z.infer<typeof symptomAnswerSchema>;
export type PatientAnswer = z.infer<typeof patientAnswerSchema>;
export type ResponseMetadata = z.infer<typeof responseMetadataSchema>;
export type RelayEnvelope = z.infer<typeof relayEnvelopeSchema>;
