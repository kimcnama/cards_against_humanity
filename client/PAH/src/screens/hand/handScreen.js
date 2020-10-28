import React, {Component} from 'react';
import {View, StyleSheet} from 'react-native';

import {connect} from 'react-redux';
import {addCard} from './../../actions/hand';

import {w3cwebsocket as W3CWebSocket} from 'websocket';

const mapStateToProps = (state) => {
  return {
    answerTexts: state.handReducer.cardList,
  };
};


const mapDispatchToProps = (dispatch) => {
  return {
    addCard: (cardText) => dispatch(addCard(cardText)),
  };
};

const client = new W3CWebSocket(
  'wss://7fzsgk085d.execute-api.eu-west-1.amazonaws.com/development',
);

class HandScreen extends Component {
  constructor() {
    super();
    this.state = {
      questionText: '',
      answerTexts: [],
    };
  }

  componentDidMount() {
    client.onopen = () => {
      console.log('client connected');
    };
  }

  render() {
    return (<View style={styles.conatiner}></View>);
  }
}

export default connect(mapStateToProps, null)(HandScreen);

const styles = StyleSheet.create({
  conatiner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'blue',
  },
  textBox: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    width: 200,
  },
});
