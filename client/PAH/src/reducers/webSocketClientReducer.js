import Sockette from 'sockette';
import {SET_ON_MESSAGE_FUNCTION} from './../actions/types';

const wsURL =
  'wss://7fzsgk085d.execute-api.eu-west-1.amazonaws.com/development';

const INITIAL_STATE = {
  client: new Sockette(wsURL, {
    timeout: 5e3,
    maxAttempts: 1,
    onopen: (e) => console.log('connected:', e),
    onmessage: (e) => console.log('Message Received:', e),
    onreconnect: (e) => console.log('Reconnecting...', e),
    onmaximum: (e) => console.log('Stop Attempting!', e),
    onclose: (e) => console.log('Closed!', e),
    onerror: (e) => console.log('Error:', e),
  }),
};

const webSocketClientReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case SET_ON_MESSAGE_FUNCTION:
      console.log('redirecting onmessage');
      return {
        ...state,
        onMessageHandle: function (e) {
          action.functionHandle(e);
        },
      };
    default:
      return {
        ...state,
      };
  }
};

export default webSocketClientReducer;
