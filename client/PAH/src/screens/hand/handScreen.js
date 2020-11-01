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
  Alert,
  Modal,
  TextInput,
  Keyboard,
  Switch,
} from 'react-native';

import {connect} from 'react-redux';
import {addCard} from './../../actions/hand';

import Sockette from 'sockette';

import {formatText} from './../../shared/Utils';
import Carousel from 'react-native-snap-carousel';

const proceedGreen = '#88E08C';
const proceedRed = '#FF7474';
const proceedBlue = '#A5BEFF';

const modalBlue = '#257CFF';
const modalRed = '#FC5638';

const questionModalStaticText =
  'If you want to add your own question, it will join the queue of custom questions up next. Questions will be added to database and put into question deck, so please check spelling.';
const answerModalStaticText =
  'You can add custom answers here. Answers are added to the answer deck database so please check spelling.';

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
const RESULTS_STAGE_ANSWER_REVEAL = 'RESULTS_STAGE_ANSWER_REVEAL';
const RESULTS_STAGE_SCOREBOARD = 'RESULTS_STAGE_SCOREBOARD';

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
      answerCards: [],
      currentQuestion: '',
      playersAndScores: [],
      customAnswer: '',
      addAnswerToDB: '',
      customQuestion: '',
      winningAnswer: '',
      answerSubmitted: false,
      activeAnswerCardIndex: 0,
      activeSelectedSubmissionCardIndex: 0,
      showAddQuestionModal: false,
      questionModalText: '',
      answerModalText: '',
      showAddAnswerModal: false,
      isAnswerToNextQuestionSlider: true,
      roundStage: ANSWER_SUBMISSION_STAGE,
      previousQuestion: '',
      canForceNextRound: true,
      bestAnswerSelected: false,
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
        let nextRoundStage =
          body.answers.length > 0
            ? ANSWER_SELECTION_STAGE
            : RESULTS_STAGE_SCOREBOARD;
        this.setState({
          answers: body.answers,
          playersAnswered: [],
          serverMessage: '',
          roundStage: nextRoundStage,
        });
        return;
      case 'selectionRoundComplete':
        console.log('round complete', body.body);
        let jsonBody = body.body;
        let prevQ = this.state.currentQuestion;
        let nextRoundStageSelection =
          jsonBody.forceNextRound === false
            ? RESULTS_STAGE_ANSWER_REVEAL
            : RESULTS_STAGE_SCOREBOARD;
        this.setState({
          currentQuestion: jsonBody.nextQuestion,
          playersAndScores: jsonBody.scores,
          winningAnswer: jsonBody.winningAnswer,
          answerSubmitted: false,
          roundStage: nextRoundStageSelection,
          previousQuestion: prevQ,
          isAnswerToNextQuestionSlider: true,
        });
        return;
      case 'currentRoundHost':
        this.setState({
          ...this.state,
          roundHostId: body.hostConnectionId,
          isHost: body.hostConnectionId === this.state.connectionId,
          roundHostName: body.hostName,
        });
        if (body.forcedNextRound === true) {
          this.setState({roundStage: RESULTS_STAGE_SCOREBOARD});
        }
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
      case 'roundLenTimeLeft':
        this.sendTimeLeftAlert(body.secs);
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

  selectAnswerCard() {
    if (this.state.answerSubmitted) {
      return;
    }

    let _answer = this.state.answerCards[this.state.activeAnswerCardIndex]
      .answer;
    let _id = this.state.answerCards[this.state.activeAnswerCardIndex].id;

    this.client.json({
      action: 'onAnswer',
      answerToNextQuestion: true,
      answer: _answer,
      addToDB: false,
      id: _id,
      roomName: this.props.roomName,
      groupName: this.props.groupName,
      playerName: this.props.playerName,
      forceNextRound: false,
    });

    var answerHandCopy = this.state.answerCards.filter(
      (card) => card.id !== _id,
    );

    this.setState({
      ...this.state,
      answerCards: answerHandCopy,
      answerSubmitted: true,
      activeAnswerCardIndex: 0,
      isAnswerToNextQuestionSlider: false,
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

  sendTimeLeftAlert(secs) {
    Alert.alert(
      'Warning!',
      'You must wait ' +
        String(secs) +
        ' seconds until you can skip round stage',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => {
            console.log('OK Pressed');
          },
        },
      ],
      {cancelable: false},
    );
    this.setState({canForceNextRound: true});
  }

  addQuestionAnswerView() {
    return (
      <View style={styles.questionAnswerView}>
        <TouchableOpacity
          style={styles.imageIconButtonView}
          onPress={() =>
            this.setState({
              ...this.state,
              showAddQuestionModal: true,
              showAddAnswerModal: false,
            })
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
            this.setState({
              ...this.state,
              showAddQuestionModal: false,
              showAddAnswerModal: true,
            })
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
            onPress={() => this.forceNextRoundAnswerSubmission()}>
            <Text style={styles.proceedButtonText}>Force next round stage</Text>
          </TouchableOpacity>
          {this.addQuestionAnswerView()}
        </View>
      </View>
    );
  }

  proceedToScoreboard() {
    this.setState({
      roundStage: RESULTS_STAGE_SCOREBOARD,
    });
  }

  proceedToNextRound() {
    this.setState({
      roundStage: ANSWER_SUBMISSION_STAGE,
    });
  }

  scoreBoardView() {
    return (
      <SafeAreaView>
        <View style={{width: width, alignItems: 'center'}}>
          <View style={styles.cardViewUpper}>
            <Text style={styles.instructionText}>Round Review!</Text>
            <View style={{height: 50, width: 50, paddingTop: 10}}>
              <Image
                style={{height: 50, width: 50}}
                resizeMode="contain"
                source={require('./../../../assets/crowns.png')}
              />
            </View>
            <View style={{height: 20}} />
            <Text style={styles.questionText}>Scoreboard:</Text>
          </View>
          <View style={styles.cardViewLower}>
            <ScrollView contentContainerStyle={styles.middleScrollView}>
              <View style={{alignItems: 'center', width: width}}>
                {this.state.playersAndScores.map((item) => {
                  return (
                    <View style={styles.resultsTextView}>
                      <Text style={styles.questionText}>{item.playerName}</Text>
                      <Text style={styles.questionText}>{item.playerWins}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.buttonArea}>
              <TouchableOpacity
                style={{
                  ...styles.proceedButton,
                  backgroundColor: proceedBlue,
                }}
                onPress={() => this.proceedToNextRound()}>
                <Text style={styles.proceedButtonText}>
                  Continue to next round
                </Text>
              </TouchableOpacity>
              {this.addQuestionAnswerView()}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  winningAnswerView() {
    return (
      <SafeAreaView>
        <View style={{width: width, alignItems: 'center'}}>
          <View style={styles.cardViewUpper}>
            <Text style={styles.instructionText}>Round Review!</Text>
            <View style={{height: 50, width: 50, paddingTop: 10}}>
              <Image
                style={{height: 50, width: 50}}
                resizeMode="contain"
                source={require('./../../../assets/crowns.png')}
              />
            </View>
            <ScrollView contentContainerStyle={styles.middleScrollView}>
              <Text style={styles.questionText}>
                Q: {this.state.previousQuestion}
              </Text>
            </ScrollView>
          </View>
          <View style={styles.cardViewLower}>
            <ScrollView contentContainerStyle={styles.middleScrollView}>
              <View style={{width: width, alignItems: 'center'}}>
                <View style={styles.winnerText}>
                  <Text
                    style={{
                      ...styles.bestAnswerText,
                      textDecorationLine: 'underline',
                    }}>
                    Best Answer:
                  </Text>
                  <Text style={styles.bestAnswerText}>
                    {this.state.winningAnswer}
                  </Text>
                </View>
                <View style={{height: 30}} />
                <View style={styles.winnerText}>
                  <Text
                    style={{
                      ...styles.bestAnswerText,
                      textDecorationLine: 'underline',
                    }}>
                    Round Winner:{' '}
                  </Text>
                  <Text style={styles.bestAnswerText}>
                    {this.state.roundHostName}
                  </Text>
                </View>
              </View>
            </ScrollView>
            <View style={styles.buttonArea}>
              <TouchableOpacity
                style={{
                  ...styles.proceedButton,
                  backgroundColor: proceedBlue,
                }}
                onPress={() => this.proceedToScoreboard()}>
                <Text style={styles.proceedButtonText}>
                  Continue to results
                </Text>
              </TouchableOpacity>
              {this.addQuestionAnswerView()}
            </View>
          </View>
        </View>
      </SafeAreaView>
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

  _renderSubmittedCard = ({item, index}) => {
    return (
      <View style={styles.card}>
        <ScrollView>
          <Text style={styles.cardText}>A: {item.answerStruct.answer}</Text>
        </ScrollView>
      </View>
    );
  };

  selectBestAnswer() {
    if (this.state.answerSubmitted) {
      return;
    }

    let selectedAns = this.state.answers[
      this.state.activeSelectedSubmissionCardIndex
    ];

    console.log('selected submission: ', selectedAns);

    this.client.json({
      action: 'onSelectAnswer',
      winnerConnectionId: selectedAns.connectionId,
      roomName: this.props.roomName,
      groupName: this.props.groupName,
      forceNextRound: false,
    });

    this.setState({
      ...this.state,
      answers: [],
      activeSelectedSubmissionCardIndex: 0,
      answerSubmitted: true,
    });
  }

  forceNextRoundAnswerPick() {
    this.client.json({
      action: 'onSelectAnswer',
      winnerConnectionId: '',
      roomName: this.props.roomName,
      groupName: this.props.groupName,
      forceNextRound: true,
    });

    this.setState({
      ...this.state,
      answers: [],
      activeSelectedSubmissionCardIndex: 0,
      canForceNextRound: false,
    });
  }

  forceNextRoundAnswerSubmission() {
    this.client.json({
      action: 'onAnswer',
      answerToNextQuestion: true,
      answer: '',
      addToDB: false,
      id: '',
      roomName: this.props.roomName,
      groupName: this.props.groupName,
      playerName: this.props.playerName,
      forceNextRound: true,
    });

    this.setState({
      ...this.state,
      customAnswer: '',
      answerSubmitted: true,
      canForceNextRound: false,
      isAnswerToNextQuestionSlider: true,
    });
  }

  mapAnswerSubmissions() {
    let instructionText = this.state.isHost
      ? 'Please select the best answer!'
      : 'Please wait for round host!';
    let hostPickButton = (
      <TouchableOpacity
        style={{
          ...styles.proceedButton,
          backgroundColor: proceedGreen,
        }}
        onPress={() => this.selectBestAnswer()}>
        <Text style={styles.proceedButtonText}>Select this answer</Text>
      </TouchableOpacity>
    );
    let forceNextRoundButton = (
      <TouchableOpacity
        style={{
          ...styles.proceedButton,
          backgroundColor: proceedRed,
        }}
        onPress={() => this.forceNextRoundAnswerPick()}>
        <Text style={styles.proceedButtonText}>Force next round</Text>
      </TouchableOpacity>
    );
    return (
      <SafeAreaView>
        <View style={{width: width, alignItems: 'center'}}>
          <View style={styles.cardViewUpper}>
            <Text style={styles.instructionText}>{instructionText}</Text>
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
              data={this.state.answers}
              renderItem={this._renderSubmittedCard}
              sliderWidth={width}
              itemWidth={width * 0.7}
              onSnapToItem={(index) => {
                this.setState({activeSelectedSubmissionCardIndex: index});
              }}
            />
            <View style={styles.buttonArea}>
              {this.state.isHost && hostPickButton}
              {!this.state.isHost && forceNextRoundButton}
              {this.addQuestionAnswerView()}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  onCustomAnswerChange(text) {
    if (text.includes('\n')) {
      text = text.replace('\n', '');
      Keyboard.dismiss();
    }
    this.setState({
      ...this.state,
      customAnswer: formatText(text, true, true),
    });
  }

  sendCustomAnswer() {
    if (!this.state.customAnswer) {
      return;
    }

    let ansNextQ = this.state.isAnswerToNextQuestionSlider;

    this.client.json({
      action: 'onAnswer',
      answerToNextQuestion: ansNextQ,
      answer: this.state.customAnswer,
      addToDB: true,
      id: '',
      roomName: this.props.roomName,
      groupName: this.props.groupName,
      playerName: this.props.playerName,
      forceNextRound: false,
    });

    this.setState({
      ...this.state,
      customAnswer: '',
      answerSubmitted: true,
      showAddQuestionModal: false,
      showAddAnswerModal: false,
      isAnswerToNextQuestionSlider: false,
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
      forceNextRound: false,
    });

    this.setState({
      ...this.state,
      addAnswerToDB: '',
    });
  }

  onCustomQuestionChange(text) {
    if (text.includes('\n')) {
      text = text.replace('\n', '');
      Keyboard.dismiss();
    }
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
      showAddAnswerModal: false,
      showAddQuestionModal: false,
    });
  }

  closeModals() {
    this.setState({
      showAddQuestionModal: false,
      showAddAnswerModal: false,
      customQuestion: '',
      customAnswer: '',
    });
  }

  questionModal() {
    return (
      <Modal
        visible={this.state.showAddQuestionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => this.closeModals()}>
        <SafeAreaView>
          <View
            style={{
              ...styles.conatiner,
              backgroundColor: 'transparent',
              justifyContent: 'flex-start',
            }}>
            <View
              style={{...styles.modalContainer, backgroundColor: modalBlue}}>
              <View style={styles.innerModal}>
                <Text style={styles.headingText}>
                  Add question to question queue
                </Text>
                <View style={{width: '100%'}}>
                  <Text style={styles.questionText}>Question:</Text>
                  <TextInput
                    style={styles.textInput}
                    onChangeText={(text) => this.onCustomQuestionChange(text)}
                    value={this.state.customQuestion}
                    multiline={true}
                    returnKeyType="done"
                  />
                  <View style={{height: 10}}/>
                  <Text style={styles.smallModalText}>
                    {questionModalStaticText}
                  </Text>
                  <View style={{height: 10}}/>
                  <TouchableOpacity
                    style={{
                      ...styles.proceedButton,
                      backgroundColor: 'white',
                      width: '100%',
                    }}
                    onPress={() => this.sendCustomQuestion()}>
                    <Text
                      style={{...styles.proceedButtonText, color: modalBlue}}>
                      Submit this question
                    </Text>
                  </TouchableOpacity>
                  <View style={{height: 10}}/>
                  <TouchableOpacity
                    style={{
                      ...styles.proceedButton,
                      backgroundColor: 'white',
                      width: '100%',
                    }}
                    onPress={() => this.closeModals()}>
                    <Text style={{...styles.proceedButtonText}}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  toggleAnswerToNextQSlider() {
    if (!this.state.isAnswerToNextQuestionSlider) {
      if (!this.state.answerSubmitted) {
        this.setState({isAnswerToNextQuestionSlider: true});
      }
    } else {
      this.setState({isAnswerToNextQuestionSlider: false});
    }
  }

  answerModal() {
    return (
      <Modal
        visible={this.state.showAddAnswerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => this.closeModals()}>
        <SafeAreaView>
          <View
            style={{
              ...styles.conatiner,
              backgroundColor: 'transparent',
              justifyContent: 'flex-start',
            }}>
            <View
              style={{...styles.modalContainer, backgroundColor: modalRed}}>
              <View style={styles.innerModal}>
                <Text style={styles.headingText}>Add Custom Answer</Text>
                <View style={{width: '100%'}}>
                  <Text style={styles.questionText}>Answer:</Text>
                  <TextInput
                    style={styles.textInput}
                    onChangeText={(text) => this.onCustomAnswerChange(text)}
                    value={this.state.customAnswer}
                    multiline={true}
                    returnKeyType="done"
                  />
                  <View style={{height: 10}}/>
                  <Text style={styles.smallModalText}>
                    {answerModalStaticText}
                  </Text>
                  <View style={{height: 10}}/>
                  <View
                    style={{
                      width: '100%',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}>
                    <Text style={styles.questionText}>
                      Answer to current Q:
                    </Text>
                    <Switch
                      trackColor={{false: '#767577', true: '#6BD55D'}}
                      thumbColor={'white'}
                      ios_backgroundColor="#3e3e3e"
                      onValueChange={() => this.toggleAnswerToNextQSlider()}
                      value={this.state.isAnswerToNextQuestionSlider}
                    />
                  </View>
                  <View style={{height: 10}}/>
                  <TouchableOpacity
                    style={{
                      ...styles.proceedButton,
                      backgroundColor: 'white',
                      width: '100%',
                    }}
                    onPress={() => this.sendCustomAnswer()}>
                    <Text
                      style={{...styles.proceedButtonText, color: modalRed}}>
                      Submit this answer
                    </Text>
                  </TouchableOpacity>
                  <View style={{height: 10}}/>
                  <TouchableOpacity
                    style={{
                      ...styles.proceedButton,
                      backgroundColor: 'white',
                      width: '100%',
                    }}
                    onPress={() => this.closeModals()}>
                    <Text style={{...styles.proceedButtonText}}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
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
          {this.state.roundStage === ANSWER_SELECTION_STAGE &&
            this.mapAnswerSubmissions()}
          {this.state.roundStage === RESULTS_STAGE_ANSWER_REVEAL &&
            this.winningAnswerView()}
          {this.state.roundStage === RESULTS_STAGE_SCOREBOARD &&
            this.scoreBoardView()}
          {this.state.showAddQuestionModal && this.questionModal()}
          {this.state.showAddAnswerModal && this.answerModal()}
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
  smallModalText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
    textAlign: 'center',
  },
  headingText: {
    fontSize: 28,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  bestAnswerText: {
    fontSize: 22,
    color: proceedGreen,
    fontWeight: '500',
    flexWrap: 'wrap',
    textAlign: 'center',
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
    width: width * 0.7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 40,
  },
  winnerText: {
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    borderRadius: 20,
  },
  innerModal: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  textInput: {
    height: height * 0.3,
    borderColor: 'gray',
    borderWidth: 1,
    backgroundColor: 'white',
    borderRadius: 10,
  },
});
