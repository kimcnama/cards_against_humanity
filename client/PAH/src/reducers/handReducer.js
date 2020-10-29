import {ADD_CARD, REMOVE_CARD} from './../actions/types';

const INITIAL_STATE = {
  cardList: [],
};

const handReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case ADD_CARD:
      return {
        ...state,
        cardList: state.cardList.concat({
          id: action.id,
          text: action.text,
        }),
      };
    case REMOVE_CARD:
      return {
        ...state,
        cardList: state.cardList.filter((card) => card.id !== action.id),
      };
    default:
      return {
        ...state,
      };
  }
};

export default handReducer;
