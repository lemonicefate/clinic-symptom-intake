import { describe, expect, test } from 'vitest';
import {
  patientAnswerSchema,
  relayEnvelopeSchema,
  responseMetadataSchema,
} from '../src/contracts.js';

const syntheticAnswer = {
  answerVersion: 1,
  symptoms: [{
    symptomId: 'ear.pain',
    laterality: 'left',
    duration: { value: 2, unit: 'day' },
    severity: 4,
  }],
};

const syntheticMetadata = {
  protocolVersion: 1,
  clinicRelayId: 'clinic-test-01',
  lookupId: 'UGCJiXT4ShjMhMiYGNTEuIu3E3ol5KJzEYsp2xV01_A',
  contentVersion: 'ent.synthetic.v1',
  submissionId: '00000000-0000-4000-8000-000000000001',
  revision: 1,
  expiresAt: 1893427200,
};

test('accepts the fixed synthetic Patient Answer shape', () => {
  expect(patientAnswerSchema.parse(syntheticAnswer)).toEqual(syntheticAnswer);
});

describe('relay boundary', () => {
  test.each(['patientName', 'medicalRecordNumber', 'queueNumber', 'assignedPhysician'])(
    'rejects identity field %s from metadata',
    (field) => {
      const result = responseMetadataSchema.safeParse({
        ...syntheticMetadata,
        [field]: 'synthetic-forbidden-value',
      });
      expect(result.success).toBe(false);
    },
  );

  test('rejects plaintext alongside an encrypted relay envelope', () => {
    const result = relayEnvelopeSchema.safeParse({
      metadata: syntheticMetadata,
      nonce: 'oKGio6Slpqeoqaqr',
      ciphertext: 'AA',
      digest: 'AA',
      patientAnswer: syntheticAnswer,
    });
    expect(result.success).toBe(false);
  });
});
