import {createStore, combineReducers} from 'redux';
import handReducer from './reducers/handReducer';
import gameReducer from './reducers/gameReducer';

const rootReducer = combineReducers({
  handReducer: handReducer,
  gameReducer: gameReducer,
});

const configureStore = () => createStore(rootReducer);

export default configureStore;
