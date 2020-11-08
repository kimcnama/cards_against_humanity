import {ADD_ROOM, ADD_GROUP, ADD_PLAYER_NAME} from './../actions/types';

const INITIAL_STATE = {
  roomName: '',
  groupName: '',
  playerName: '',
};

const gameReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case ADD_ROOM:
      console.log('roomName redux: ', action.roomName);
      return {
        ...state,
        roomName: action.roomName,
      };
    case ADD_GROUP:
      console.log('group name redux: ', action.groupName);
      return {
        ...state,
        groupName: action.groupName,
      };
    case ADD_PLAYER_NAME:
      console.log('playerName redux: ', action.playerName);
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
