import React, {Component} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  TextInput,
  SafeAreaView,
} from 'react-native';
import {formatText} from './../../shared/Utils';

// redux
import {connect} from 'react-redux';
import {addRoom, addPlayerName} from './../../actions/game';

const {width, height} = Dimensions.get('window');

// required for redux
const mapDispatchToProps = (dispatch) => {
  return {
    addRoomProp: (room) => dispatch(addRoom(room)),
    addPlayerNameProp: (player) => dispatch(addPlayerName(player)),
  };
};

const bodyText =
  'What is room name? To enter a game with your friends, you must all enter the same room name. To ensure you are not entering an old room, please make up a room name that has likely not been used before.';

class GameSetup extends Component {
  constructor(props) {
    super();
    this.navigation = props.navigation;
    this.state = {
      roomName: 'auto',
      playerName: '',
      errorText: '',
    };
  }

  proceed() {
    if (!this.state.playerName) {
      this.setState({
        ...this.state,
        errorText: 'Please enter a name!',
      });
      return;
    }
    if (!this.state.roomName) {
      this.setState({
        ...this.state,
        errorText: 'Please enter the name of a room to join!',
      });
      return;
    }
    this.props.addRoomProp(this.state.roomName);
    this.props.addPlayerNameProp(this.state.playerName);
    this.props.navigation.navigate('InputGroup');
  }

  onRoomNameText = (text) => {
    this.setState({
      ...this.state,
      roomName: formatText(text, false, true),
      errorText: '',
    });
  };

  onPlayerNameText = (text) => {
    this.setState({
      ...this.state,
      playerName: formatText(text, false, true),
      errorText: '',
    });
  };

  render() {
    return (
      <View style={styles.conatiner}>
        <SafeAreaView style={styles.conatiner}>
          <View style={styles.topSection}>
            <Text style={styles.heading}>Setup Menu</Text>
            <View style={styles.textInputView}>
              <View style={{height: height * 0.03}} />
              <Text style={styles.bodyText}>Your Name</Text>
              <View style={{height: height * 0.01}} />
              <TextInput
                style={styles.textBox}
                onChangeText={(text) => this.onPlayerNameText(text)}
                value={this.state.playerName}
                textAlign={'center'}
              />
              <View style={{height: height * 0.03}} />
              <Text style={styles.bodyText}>Room Name</Text>
              <View style={{height: height * 0.01}} />
              <TextInput
                style={styles.textBox}
                onChangeText={(text) => this.onRoomNameText(text)}
                value={this.state.roomName}
                textAlign={'center'}
              />
              <View style={{height: height * 0.03}} />
              <Text style={styles.bodyText}>{bodyText}</Text>
            </View>
          </View>
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.proceedButton}
              onPress={() => this.proceed()}>
              <Text style={styles.proceedButtonText}>Continue</Text>
            </TouchableOpacity>
            <View style={{height: height * 0.01}} />
            <Text style={styles.errorText}>{this.state.errorText}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }
}

export default connect(null, mapDispatchToProps)(GameSetup);

const styles = StyleSheet.create({
  conatiner: {
    width: '100%',
    height: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#272727',
  },
  topSection: {
    width: '100%',
    height: '85%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  bottomSection: {
    width: '100%',
    height: '15%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  heading: {
    fontSize: 34,
    color: 'white',
    fontWeight: '500',
    textAlign: 'center',
    padding: 15,
  },
  bodyText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
    textAlign: 'left',
  },
  proceedButton: {
    height: 50,
    width: width * 0.9,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#88E08C',
  },
  proceedButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: '500',
  },
  textBox: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 15,
    color: '#272727',
    fontSize: 24,
  },
  textInputView: {
    alignItems: 'flex-start',
    width: width * 0.9,
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    fontWeight: '600',
    textAlign: 'center',
  },
});
