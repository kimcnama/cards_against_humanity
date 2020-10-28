import React, {Component} from 'react';
import {View} from 'react-native';
import {connect} from 'react-redux';
import addCard from './actions/hand';

class HandScreen extends Component {
  constructor() {
    this.state = {
      questionText: '',
      answerTexts: [],
    };
  }

  render() {
    return <View></View>;
  }
}

const mapStateToProps = (state) => {
  console.log(state);
  return {
    answerTexts: state.handReducer.cardList,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addCard: (cardText) => dispatch(addCard(cardText)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(HandScreen);
