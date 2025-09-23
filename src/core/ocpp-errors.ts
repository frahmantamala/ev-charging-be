export const OCPP_ERRORS = {
  ProtocolError: {
    code: 'ProtocolError',
    description: 'Payload does not conform to protocol or is missing required fields.'
  },
  NotFound: {
    code: 'NotFound',
    description: 'Requested resource does not exist.'
  },
  SecurityError: {
    code: 'SecurityError',
    description: 'Operation not allowed due to current state or permissions.'
  },
  TypeConstraintViolation: {
    code: 'TypeConstraintViolation',
    description: 'Payload value violates type or business constraints.'
  },
  InternalError: {
    code: 'InternalError',
    description: 'An unexpected error occurred.'
  },
};

export type OcppErrorCode = keyof typeof OCPP_ERRORS;
