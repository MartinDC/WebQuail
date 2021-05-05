export enum WSCloseCode {
    GOING_AWAY = 1001,
    PROTOCOL_ERROR = 1002,
    UNSUPPORTED_DATA = 1003,
    POLICY_VIOLATION = 1008,
    INTERNAL_ERROR = 1011,
}

export enum WSReadyState {
    CONNECTING = 0,
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3,
}
