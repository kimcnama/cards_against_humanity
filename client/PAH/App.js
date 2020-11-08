/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';

import {Provider} from 'react-redux';
import SplashScreen from 'react-native-splash-screen';

import configureStore from './src/store';

import {Routes} from './src/navigation/Routes';

const store = configureStore();

const PAH = () => {
  return (
    <Provider store={store}>
      <Routes />
    </Provider>
  );
};

export default class App extends React.Component {
  componentDidMount() {
    SplashScreen.hide();
  }

  render() {
    return <PAH />;
  }
}
