import {createStore, combineReducers} from 'redux';
import handReducer from './reducers/handReducer';
import gameReducer from './reducers/gameReducer';
import webSocketClientReducer from './reducers/webSocketClientReducer';

const rootReducer = combineReducers({
  handReducer: handReducer,
  gameReducer: gameReducer,
  webSocketClientReducer: webSocketClientReducer,
});

const configureStore = () => createStore(rootReducer);

export default configureStore;
