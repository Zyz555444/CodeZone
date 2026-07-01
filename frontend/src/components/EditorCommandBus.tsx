'use client';

import React, { createContext, useContext, useCallback, useReducer } from 'react';

export interface EditorCommand {
  type: 'goto' | 'diff' | 'replace' | 'focus' | 'agent_start' | 'agent_done';
  payload: Record<string, unknown>;
}

interface EditorEvent {
  type: 'ctrl_k_prompt' | 'selection_changed' | 'file_opened' | 'agent_abort';
  payload: Record<string, unknown>;
}

type CommandHandler = (cmd: EditorCommand) => void;
type EventHandler = (event: EditorEvent) => void;

interface EditorCommandState {
  handler: CommandHandler | null;
  subscribers: Set<EventHandler>;
}

type Action =
  | { type: 'SET_HANDLER'; handler: CommandHandler }
  | { type: 'SUBSCRIBE'; eventHandler: EventHandler }
  | { type: 'UNSUBSCRIBE'; eventHandler: EventHandler };

function reducer(state: EditorCommandState, action: Action): EditorCommandState {
  switch (action.type) {
    case 'SET_HANDLER':
      return { ...state, handler: action.handler };
    case 'SUBSCRIBE': {
      const next = new Set(state.subscribers);
      next.add(action.eventHandler);
      return { ...state, subscribers: next };
    }
    case 'UNSUBSCRIBE': {
      const next = new Set(state.subscribers);
      next.delete(action.eventHandler);
      return { ...state, subscribers: next };
    }
    default:
      return state;
  }
}

interface EditorCommandContextValue {
  emitCommand: (cmd: EditorCommand) => void;
  emitEvent: (event: EditorEvent) => void;
  subscribe: (handler: EventHandler) => () => void;
  setCommandHandler: (handler: CommandHandler) => void;
  agentState: 'idle' | 'running' | 'diff_preview';
}

const EditorCommandContext = createContext<EditorCommandContextValue | null>(null);

export function EditorCommandProvider({
  children,
  agentState = 'idle',
}: {
  children: React.ReactNode;
  agentState?: 'idle' | 'running' | 'diff_preview';
}) {
  const [state, dispatch] = useReducer(reducer, {
    handler: null,
    subscribers: new Set<EventHandler>(),
  });

  const setCommandHandler = useCallback((handler: CommandHandler) => {
    dispatch({ type: 'SET_HANDLER', handler });
  }, []);

  const subscribe = useCallback((eventHandler: EventHandler) => {
    dispatch({ type: 'SUBSCRIBE', eventHandler });
    return () => dispatch({ type: 'UNSUBSCRIBE', eventHandler });
  }, []);

  const emitCommand = useCallback((cmd: EditorCommand) => {
    state.handler?.(cmd);
  }, [state.handler]);

  const emitEvent = useCallback((event: EditorEvent) => {
    state.subscribers.forEach((handler) => handler(event));
  }, [state.subscribers]);

  const value: EditorCommandContextValue = {
    emitCommand,
    emitEvent,
    subscribe,
    setCommandHandler,
    agentState,
  };

  return React.createElement(EditorCommandContext.Provider, { value }, children);
}

export function useEditorCommandBus(): EditorCommandContextValue {
  const ctx = useContext(EditorCommandContext);
  if (!ctx) {
    throw new Error('useEditorCommandBus must be used within EditorCommandProvider');
  }
  return ctx;
}
