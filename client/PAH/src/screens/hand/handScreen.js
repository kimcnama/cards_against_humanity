import React, {Component} from 'react';
import {View, StyleSheet, Button} from 'react-native';

import {connect} from 'react-redux';
import {addCard} from './../../actions/hand';

import Sockette from 'sockette';

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

const wsURL =
  'wss://7fzsgk085d.execute-api.eu-west-1.amazonaws.com/development';

//Init WebSockets with Cognito Access Token
const client = new Sockette(wsURL, {
  timeout: 5e3,
  maxAttempts: 1,
  onopen: (e) => console.log('connected:', e),
  onmessage: (e) => console.log('Message Received:', e),
  onreconnect: (e) => console.log('Reconnecting...', e),
  onmaximum: (e) => console.log('Stop Attempting!', e),
  onclose: (e) => console.log('Closed!', e),
  onerror: (e) => console.log('Error:', e),
});

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

  sendMessage() {
    client.json({
      action: 'joinRoom',
      playerName: 'reeb',
      roomName: 'select',
    });
  }

  render() {
    return (
      <View style={styles.conatiner}>
        <Button
          onPress={() => this.sendMessage()}
          title="Send Message"
          color="#841584"
        />
      </View>
    );
  }
}

export default connect(mapStateToProps, null)(HandScreen);

const styles = StyleSheet.create({
  conatiner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    width: 200,
  },
});
