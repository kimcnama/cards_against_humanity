import {ADD_ROOM, ADD_GROUP, ADD_PLAYER_NAME} from './types';

export const addGroup = (groupName) => ({
  type: ADD_GROUP,
  groupName: groupName,
});

export const addRoom = (roomName) => ({
  type: ADD_ROOM,
  roomName: roomName,
});

export const addPlayerName = (playerName) => ({
  type: ADD_PLAYER_NAME,
  playerName: playerName,
});
