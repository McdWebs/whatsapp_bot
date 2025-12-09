export enum UserState {
  INITIAL = 'INITIAL',
  SELECTING_REMINDER_TYPE = 'SELECTING_REMINDER_TYPE',
  SELECTING_TIME = 'SELECTING_TIME',
  SELECTING_TEFILLIN_TIME = 'SELECTING_TEFILLIN_TIME',
  SELECTING_LOCATION = 'SELECTING_LOCATION',
  SELECTING_REMINDER_TO_DELETE = 'SELECTING_REMINDER_TO_DELETE',
  CONFIRMED = 'CONFIRMED',
}

export interface StateContext {
  userId: string;
  phoneNumber: string;
  currentState: UserState;
  data?: Record<string, any>; // Temporary data for state transitions
}

export interface StateHandler {
  handle(context: StateContext, message: string): Promise<StateContext>;
}

