import {ADD_CARD, REMOVE_CARD} from './types';

export const addCard = (cardText) => ({
  type: ADD_CARD,
  text: cardText,
});

export const removeCard = (id) => ({
  type: REMOVE_CARD,
  id: id,
});
