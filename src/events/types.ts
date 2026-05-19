/**
 * Event listener connection states.
 */
export type EventListenerState =
  | 'starting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'stopped';

/**
 * Handler for Safeguard events (NotifyEventAsync messages from SignalR).
 */
export type EventHandler = (event: SafeguardEvent) => void;

/**
 * Handler for state change notifications.
 */
export type StateChangeHandler = (state: EventListenerState) => void;

/**
 * A Safeguard event as delivered by SignalR.
 */
export interface SafeguardEvent {
  EventName: string;
  [key: string]: unknown;
}

/**
 * Options for persistent event listeners.
 */
export interface PersistentListenerOptions {
  /** Delay between reconnection attempts in milliseconds. Default: 5000. */
  retryIntervalMs?: number;
  /** Maximum number of reconnect attempts before giving up. Default: unlimited. */
  maxRetries?: number;
}
