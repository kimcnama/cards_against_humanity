import React, {Component} from 'react';
import {View, StyleSheet, Button, Text} from 'react-native';

import {connect} from 'react-redux';
import {redirectOnMessageFunc} from './../../actions/webSocket';

import Sockette from 'sockette';

const mapStateToProps = (state) => {
  return {
    client: state.webSocketClientReducer.client,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    onMessageFunctionHandle: (functionHandle) =>
      dispatch(redirectOnMessageFunc(functionHandle)),
  };
};

const wsURL =
  'wss://7fzsgk085d.execute-api.eu-west-1.amazonaws.com/development';

//Init WebSockets with Cognito Access Token
// const client = new Sockette(wsURL, {
//   timeout: 5e3,
//   maxAttempts: 1,
//   onopen: (e) => console.log('connected:', e),
//   onmessage: (e) => console.log('Message Received:', e),
//   onreconnect: (e) => console.log('Reconnecting...', e),
//   onmaximum: (e) => console.log('Stop Attempting!', e),
//   onclose: (e) => console.log('Closed!', e),
//   onerror: (e) => console.log('Error:', e),
// });

class HandScreen extends Component {
  constructor() {
    super();
    this.state = {
      playerMessage: 'default',
      questionText: '',
      answerTexts: [],
    };
    this.onMessage = this.onMessage.bind(this);
  }

  onMessage(event) {
    console.log('Message Received to redirected function:', event);
    this.updateTextScreen(event);
  }

  componentDidMount() {
    this.props.onMessageFunctionHandle(this.onMessage);
  }

  updateTextScreen(e) {
    this.setState({
      ...this.state,
      playerMessage: e,
    });
  }

  sendMessage() {
    this.props.client.json({
      action: 'joinRoom',
      playerName: 'reeb',
      roomName: 'select',
    });
  }

  render() {
    return (
      <View style={styles.conatiner}>
        <Text>{this.state.playerMessage}</Text>
        <Button
          onPress={() => this.sendMessage()}
          title="Send Message"
          color="#841584"
        />
      </View>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(HandScreen);

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
