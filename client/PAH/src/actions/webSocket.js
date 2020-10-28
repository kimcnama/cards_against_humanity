import {SET_ON_MESSAGE_FUNCTION} from './types';

export const redirectOnMessageFunc = (functionHandle) => ({
  type: SET_ON_MESSAGE_FUNCTION,
  functionHandle: functionHandle,
});
