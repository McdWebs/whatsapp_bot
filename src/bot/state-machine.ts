import { UserState, StateContext, StateHandler } from './states/index';
import { InitialStateHandler } from './states/initial.state';
import { SelectingReminderStateHandler } from './states/selecting-reminder.state';
import { SelectingTimeStateHandler } from './states/selecting-time.state';
import { SelectingTefillinTimeStateHandler } from './states/selecting-tefillin-time.state';
import { SelectingLocationStateHandler } from './states/selecting-location.state';
import { userRepository } from '../db/repositories/user.repository';
import { logger } from '../utils/logger';

export class StateMachine {
  private handlers: Map<UserState, StateHandler> = new Map();

  constructor() {
    this.handlers.set(UserState.INITIAL, new InitialStateHandler());
    this.handlers.set(UserState.SELECTING_REMINDER_TYPE, new SelectingReminderStateHandler());
    this.handlers.set(UserState.SELECTING_TIME, new SelectingTimeStateHandler());
    this.handlers.set(UserState.SELECTING_TEFILLIN_TIME, new SelectingTefillinTimeStateHandler());
    this.handlers.set(UserState.SELECTING_LOCATION, new SelectingLocationStateHandler());
  }

  async processMessage(userId: string, phoneNumber: string, message: string): Promise<void> {
    try {
      // Get current user state
      const user = await userRepository.findById(userId);
      if (!user) {
        logger.warn('User not found in state machine', { userId });
        return;
      }

      const currentState = user.current_state as UserState;

      // Create context
      const context: StateContext = {
        userId: user.id,
        phoneNumber: user.phone_number,
        currentState: currentState || UserState.INITIAL,
        data: {},
      };

      // Get handler for current state
      const handler = this.handlers.get(context.currentState) || this.handlers.get(UserState.INITIAL)!;

      // Process message
      const newContext = await handler.handle(context, message);

      // Update user state if changed
      if (newContext.currentState !== currentState) {
        await userRepository.updateState(userId, newContext.currentState);
        logger.info('User state updated', {
          userId,
          oldState: currentState,
          newState: newContext.currentState,
        });
      }
    } catch (error) {
      logger.error('Error in state machine', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const stateMachine = new StateMachine();

