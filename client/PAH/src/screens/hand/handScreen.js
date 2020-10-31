import React, {Component} from 'react';
import {
  View,
  StyleSheet,
  Button,
  Text,
  ScrollView,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';

import {connect} from 'react-redux';
import {addCard} from './../../actions/hand';

import Sockette from 'sockette';

import {formatText} from './../../shared/Utils';
import Carousel from 'react-native-snap-carousel';

const proceedGreen = '#88E08C';
const proceedRed = '#FF7474';
const proceedBlue = '#A5BEFF';

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

const {width, height} = Dimensions.get('window');

const wsURL =
  'wss://7fzsgk085d.execute-api.eu-west-1.amazonaws.com/development';

const ANSWER_SUBMISSION_STAGE = 'ANSWER_SUBMISSION_STAGE';
const ANSWER_SELECTION_STAGE = 'ANSWER_SELECTION_STAGE';
const RESULTS_STAGE = 'RESULTS_STAGE';

class HandScreen extends Component {
  constructor() {
    super();
    this.state = {
      questionText: '',
      answerTexts: [],
      playersInGame: [],
      playersAnswered: [],
      connectionId: '',
      roundHostId: '',
      roundHostName: '',
      isHost: false,
      serverMessage: '',
      answers: [],
      answerReveal: false,
      answerCards: [],
      currentQuestion: '',
      playersAndScores: [],
      customAnswer: '',
      addAnswerToDB: '',
      customQuestion: '',
      winningAnswer: '',
      answerSubmitted: false,
      activeAnswerCardIndex: 0,
      showAddQuestionModal: false,
      showAddAnswerModal: false,
      roundStage: ANSWER_SUBMISSION_STAGE,
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
    let body = JSON.parse(event.data);
    console.log('json msg: ', body);
    switch (body.eventType) {
      case 'activePlayers':
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
          return {
            ...this.state,
            playersAnswered: arrCopy,
            answers: [],
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
        let jsonBody = body.body;
        this.setState({
          currentQuestion: jsonBody.nextQuestion,
          playersAndScores: jsonBody.scores,
          answerReveal: false,
          winningAnswer: jsonBody.winningAnswer,
          answerSubmitted: false,
          roundHostName: jsonBody.winner,
        });
        return;
      case 'currentRoundHost':
        this.setState({
          ...this.state,
          roundHostId: body.hostConnectionId,
          isHost: body.hostConnectionId === this.state.connectionId,
          roundHostName: body.hostName,
        });
        return;
      case 'playerMessage':
        this.setState({
          ...this.state,
          serverMessage: body.message,
        });
        return;
      case 'pushNewCardToUser':
        this.setState((state) => {
          const arrCopy = state.answerCards.concat(body.card);
          return {
            ...this.state,
            answerCards: arrCopy,
          };
        });
        return;
      case 'initialQuestion':
        this.setState({
          ...this.state,
          currentQuestion: body.question,
        });
        return;
      case 'initialAnswerCards':
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

  selectAnswerCard() {
    if (this.state.answerSubmitted) {
      return;
    }

    let _answer = this.state.answerCards[this.state.activeAnswerCardIndex]
      .answer;
    let _id = this.state.answerCards[this.state.activeAnswerCardIndex].id;

    console.log('selected answer: ' + _answer);

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
      answerSubmitted: true,
    });
  }

  mapAnswers() {
    return (
      <View>
        {this.state.answers.map((answer, i) => {
          if (this.state.roundHostId === this.state.connectionId) {
            return (
              <Button
                onPress={this.selectAnswer.bind(this, i)}
                title={answer.answerStruct.answer}
                key={i}
                color="#841584"
              />
            );
          } else {
            return (
              <Text style={styles.smallText}>{answer.answerStruct.answer}</Text>
            );
          }
        })}
      </View>
    );
  }

  addQuestionAnswerView() {
    return (
      <View style={styles.questionAnswerView}>
        <TouchableOpacity
          style={styles.imageIconButtonView}
          onPress={() =>
            this.setState({...this.state, showAddQuestionModal: true})
          }>
          <Image
            style={styles.iconImageSz}
            resizeMode="contain"
            source={require('./../../../assets/addQuestion.png')}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.imageIconButtonView}
          onPress={() =>
            this.setState({...this.state, showAddAnswerModal: true})
          }>
          <Image
            style={styles.iconImageSz}
            resizeMode="contain"
            source={require('./../../../assets/addAnswer.png')}
          />
        </TouchableOpacity>
      </View>
    );
  }

  _renderAnswerCard = ({item, index}) => {
    return (
      <View style={styles.card}>
        <ScrollView>
          <Text style={styles.cardText}>A: {item.answer}</Text>
        </ScrollView>
      </View>
    );
  };

  submitAnswerStageWaitingPlayers() {
    return (
      <View style={{width: width, alignItems: 'center'}}>
        <View style={styles.waitingPlayersView}>
          <View style={{height: height * 0.1}}>
            <Text style={styles.instructionText}>
              Please wait for all players to answer!
            </Text>
          </View>
          <Text style={styles.questionText}>Players Answered:</Text>
          <ScrollView contentContainerStyle={styles.middleScrollView}>
            {this.state.playersInGame.map((player) => {
              var imgSource = this.state.playersAnswered.includes(player)
                ? require('./../../../assets/check.png')
                : require('./../../../assets/cancel.png');
              if (this.state.roundHostName === player) {
                imgSource = require('./../../../assets/crowns.png');
              }
              return (
                <View style={styles.resultsTextView}>
                  <Text style={styles.questionText}>{player}</Text>
                  <View style={{height: 22, width: 22, paddingTop: 10}}>
                    <Image
                      style={{height: 22, width: 22}}
                      resizeMode="contain"
                      source={imgSource}
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.buttonArea}>
          <TouchableOpacity
            style={{
              ...styles.proceedButton,
              backgroundColor: proceedRed,
            }}
            onPress={() => this.selectAnswerCard()}>
            <Text style={styles.proceedButtonText}>Force next round stage</Text>
          </TouchableOpacity>
          {this.addQuestionAnswerView()}
        </View>
      </View>
    );
  }

  submitAnswerStageNotHost() {
    return (
      <SafeAreaView>
        <View style={{width: width, alignItems: 'center'}}>
          <View style={styles.cardViewUpper}>
            <Text style={styles.instructionText}>Please submit an answer!</Text>
            <ScrollView contentContainerStyle={styles.middleScrollView}>
              <Text style={styles.questionText}>
                Q: {this.state.currentQuestion}
              </Text>
            </ScrollView>
          </View>
          <View style={styles.cardViewLower}>
            <Carousel
              ref={(c) => {
                this._carousel = c;
              }}
              layout="default"
              data={this.state.answerCards}
              renderItem={this._renderAnswerCard}
              sliderWidth={width}
              itemWidth={width * 0.7}
              onSnapToItem={(index) => {
                this.setState({activeAnswerCardIndex: index});
              }}
            />
            <View style={styles.buttonArea}>
              <TouchableOpacity
                style={{
                  ...styles.proceedButton,
                  backgroundColor: proceedGreen,
                }}
                onPress={() => this.selectAnswerCard()}>
                <Text style={styles.proceedButtonText}>Submit this answer</Text>
              </TouchableOpacity>
              {this.addQuestionAnswerView()}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  mapResults() {
    return (
      <View>
        {this.state.playersAndScores.map((result) => {
          return (
            <Text style={styles.smallText}>
              {result.playerName}:{result.playerWins} wins
            </Text>
          );
        })}
      </View>
    );
  }

  onCustomAnswerChange(text) {
    this.setState({
      ...this.state,
      customAnswer: formatText(text, true, true),
    });
  }

  sendCustomAnswer() {
    if (!this.state.customAnswer) {
      return;
    }

    this.client.json({
      action: 'onAnswer',
      answerToNextQuestion: true,
      answer: this.state.customAnswer,
      addToDB: true,
      id: '',
      roomName: this.props.roomName,
      groupName: this.props.groupName,
      playerName: this.props.playerName,
    });

    this.setState({
      ...this.state,
      customAnswer: '',
      answerSubmitted: true,
    });
  }

  onAddAnswerToDBChange(text) {
    this.setState({
      ...this.state,
      addAnswerToDB: formatText(text, true, true),
    });
  }

  addAnswerToDB() {
    if (!this.state.addAnswerToDB) {
      return;
    }

    this.client.json({
      action: 'onAnswer',
      answerToNextQuestion: false,
      answer: this.state.addAnswerToDB,
      addToDB: true,
      id: '',
      roomName: this.props.roomName,
      groupName: this.props.groupName,
      playerName: this.props.playerName,
    });

    this.setState({
      ...this.state,
      addAnswerToDB: '',
    });
  }

  onCustomQuestionChange(text) {
    this.setState({
      ...this.state,
      customQuestion: formatText(text, true, false),
    });
  }

  sendCustomQuestion() {
    if (!this.state.customQuestion) {
      return;
    }

    this.client.json({
      action: 'onPushNextQuestion',
      question: this.state.customQuestion,
      roomName: this.props.roomName,
      groupName: this.props.groupName,
    });

    this.setState({
      ...this.state,
      customQuestion: '',
    });
  }

  render() {
    return (
      <View style={styles.conatiner}>
        <SafeAreaView>
          {this.state.roundStage === ANSWER_SUBMISSION_STAGE &&
            !this.state.answerSubmitted &&
            !this.state.isHost &&
            this.submitAnswerStageNotHost()}
          {this.state.roundStage === ANSWER_SUBMISSION_STAGE &&
            (this.state.isHost || this.state.answerSubmitted) &&
            this.submitAnswerStageWaitingPlayers()}
        </SafeAreaView>
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
    backgroundColor: '#272727',
  },
  cardViewUpper: {
    height: '35%',
    width: '90%',
    alignItems: 'center',
  },
  cardViewLower: {
    height: '65%',
    width: '100%',
  },
  card: {
    width: '100%',
    height: height * 0.35,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 20,
  },
  cardText: {
    fontSize: 20,
    color: 'black',
    fontWeight: '500',
  },
  proceedButton: {
    height: 50,
    width: width * 0.9,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: '500',
  },
  buttonArea: {
    height: height * 0.2,
    justifyContent: 'space-around',
    alignItems: 'center',
    width: width,
  },
  textBox: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    width: 200,
  },
  smallText: {
    fontSize: 14,
    color: 'white',
  },
  questionText: {
    fontSize: 22,
    color: 'white',
    fontWeight: '500',
  },
  instructionText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
  },
  questionAnswerView: {
    width: width * 0.95,
    height: height * 0.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageIconButtonView: {
    height: height * 0.1,
    width: height * 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconImageSz: {
    width: height * 0.1,
    height: height * 0.1,
  },
  waitingPlayersView: {
    height: height * 0.75,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  middleScrollView: {flexGrow: 1, justifyContent: 'center'},
  resultsTextView: {
    width: width * 0.8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 40,
  },
});
