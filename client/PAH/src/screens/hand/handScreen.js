import React, {Component} from 'react';
import {View, StyleSheet, Button, Text} from 'react-native';

import {connect} from 'react-redux';
import {addCard} from './../../actions/hand';

import Sockette from 'sockette';

const mapStateToProps = (state) => {
  return {
    playerName: state.gameReducer.playerName,
    groupName: state.gameReducer.groupName,
    roomName: state.gameReducer.roomName,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addCard: (cardText) => dispatch(addCard(cardText)),
  };
};

const wsURL =
  'wss://7fzsgk085d.execute-api.eu-west-1.amazonaws.com/development';

class HandScreen extends Component {
  constructor() {
    super();
    this.state = {
      questionText: '',
      answerTexts: [],
      playersInGame: [],
      playersAnswered: [],
      connectionId: '',
      serverMessage: '',
      answers: [],
      answerReveal: false,
      answerCards: [],
      currentQuestion: '',
      playersAndScores: [],
    };
    //Init WebSockets with Cognito Access Token
    this.client = new Sockette(wsURL, {
      timeout: 5e3,
      maxAttempts: 1,
      onopen: (e) => this.onWssOpen(e),
      onmessage: (e) => this.parseOnMessage(e),
      onreconnect: (e) => console.log('Reconnecting...', e),
      onmaximum: (e) => console.log('Stop Attempting!', e),
      onclose: (e) => console.log('Closed!', e),
      onerror: (e) => console.log('Error:', e),
    });
  }

  parseOnMessage(event) {
    console.log('body JSON msg', event);
    let body = JSON.parse(event.data);
    switch (body.eventType) {
      case 'activePlayers':
        console.log('active players', body.players);
        this.setState({
          ...this.state,
          playersInGame: body.players,
        });
        return;
      case 'yourConnectionId':
        this.setState({
          ...this.state,
          connectionId: body.message,
        });
        return;
      case 'playerAnswered':
        this.setState((state) => {
          const arrCopy = state.playersAnswered.concat(body.player);
          console.log('arrCopy', arrCopy);
          return {
            ...this.state,
            playersAnswered: arrCopy,
          };
        });
        return;
      case 'submissionRoundComplete':
        this.setState({
          answers: body.answers,
          answerReveal: true,
          playersAnswered: [],
          serverMessage: '',
        });
        return;
      case 'selectionRoundComplete':
        console.log('round complete', body.body);
        this.resetRound(body.body);
        return;
      case 'playerMessage':
        this.setState({
          ...this.state,
          serverMessage: body.message,
        });
        return;
      case 'initialQuestion':
        console.log('init question', body.question);
        this.setState({
          ...this.state,
          currentQuestion: body.question,
        });
        return;
      case 'initialAnswerCards':
        console.log('initialAnswerCards', body.answers);
        this.setState({
          ...this.state,
          answerCards: body.answers,
        });
        return;
      case 'error':
        console.log('error message', body);
        return;
      default:
        console.log('unknown event', body);
        return;
    }
  }

  resetRound(body) {
    this.setState({
      currentQuestion: body.nextQuestion,
      playersAndScores: body.scores,
    });
  }

  onWssOpen(event) {
    this.client.json({
      action: 'joinRoom',
      playerName: this.props.playerName,
      roomName: this.props.roomName,
      groupName: this.props.groupName,
    });
  }

  selectAnswer(index) {
    let selectedAns = this.state.answers[index];

    this.client.json({
      action: 'onSelectAnswer',
      winnerConnectionId: selectedAns.connectionId,
      roomName: this.props.roomName,
      groupName: this.props.groupName,
    });

    this.setState({
      ...this.state,
      answerReveal: false,
      answers: [],
    });
  }

  selectAnswerCard(_answer, _id) {
    this.client.json({
      action: 'onAnswer',
      answerToNextQuestion: true,
      answer: _answer,
      addToDB: false,
      id: _id,
      roomName: this.props.roomName,
      groupName: this.props.groupName,
      playerName: this.props.playerName,
    });

    var answerHandCopy = this.state.answerCards.filter(
      (card) => card.id !== _id,
    );

    this.setState({
      ...this.state,
      answerCards: answerHandCopy,
    });
  }

  mapAnswers() {
    return (
      <View>
        {this.state.answers.map((answer, i) => {
          return (
            <Button
              onPress={this.selectAnswer.bind(this, i)}
              title={answer.answerStruct.answer}
              key={i}
              color="#841584"
            />
          );
        })}
      </View>
    );
  }

  mapAnswerCards() {
    return (
      <View>
        {this.state.answerCards.map((answer, i) => {
          return (
            <Button
              onPress={this.selectAnswerCard.bind(
                this,
                answer.answer,
                answer.id,
              )}
              title={answer.answer}
              key={i}
              color="#841584"
            />
          );
        })}
      </View>
    );
  }

  mapResults() {
    return (
      <View>
        {this.state.playersAndScores.map((result) => {
          return (
            <Text>
              {result.playerName}:{result.playerWins} wins
            </Text>
          );
        })}
      </View>
    );
  }

  render() {
    return (
      <View style={styles.conatiner}>
        <Text>Current Q: {this.state.currentQuestion}</Text>
        {this.mapAnswerCards()}
        <Text>Players: {this.state.playersInGame}</Text>
        <Text>Conn ID: {this.state.connectionId}</Text>
        <Text>Players Answered: {this.state.playersAnswered}</Text>
        <Text>Server msg: {this.state.serverMessage}</Text>
        {this.state.answerReveal && this.mapAnswers()}
        {this.mapResults()}
        <Button
          onPress={() => this.sendCustomAnswer()}
          title="Send Custom Answer"
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
