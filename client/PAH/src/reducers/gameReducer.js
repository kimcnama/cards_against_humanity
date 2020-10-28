import {ADD_ROOM, ADD_GROUP, ADD_PLAYER_NAME} from './../actions/types';

const INITIAL_STATE = {
  roomName: '',
  groupName: '',
  playerName: '',
};

const gameReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case ADD_ROOM:
      return {
        ...state,
        roomName: action.roomName,
      };
    case ADD_GROUP:
      return {
        ...state,
        groupName: action.groupName,
      };
    case ADD_PLAYER_NAME:
      return {
        ...state,
        playerName: action.playerName,
      };
    default:
      return {
        ...state,
      };
  }
};

export default gameReducer;
