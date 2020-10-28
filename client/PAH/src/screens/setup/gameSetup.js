import React from 'react';
import {
  View,
  SafeAreaView,
  Text,
  StyleSheet,
  TextInput,
  Button,
} from 'react-native';
import {formatText} from './../../shared/Utils';

import {connect} from 'react-redux';
import {addGroup, addRoom, addPlayerName} from './../../actions/game';

// required for redux
const mapDispatchToProps = (dispatch) => {
  return {
    addGroup: (group) => dispatch(addGroup(group)),
    addRoom: (room) => dispatch(addRoom(room)),
    addPlayerName: (player) => dispatch(addPlayerName(player)),
  };
};

class GameSetup extends React.Component {
  constructor() {
    super();
    this.state = {
      groupName: 'phenibrutes',
      roomName: '',
      playerName: '',
      errorText: '',
    };
  }

  onGroupNameText = (text) => {
    this.setState({
      ...this.state,
      groupName: formatText(text, false, true),
      errorText: '',
    });
  };

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

  proceed() {
    if (!this.state.playerName) {
      this.setState({
        ...this.state,
        errorText: 'Please enter a name!',
      });
      return;
    }
    if (!this.state.groupName) {
      this.setState({
        ...this.state,
        errorText: 'Please enter the name of a group to be part of!',
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
    this.props.addGroup(this.state.groupName);
    this.props.addRoom(this.state.roomName);
    this.props.addPlayerName(this.state.playerName);
  }

  render() {
    return (
      <View style={styles.conatiner}>
        <SafeAreaView>
          <Text>Group Name:</Text>
          <TextInput
            style={styles.textBox}
            onChangeText={(text) => this.onGroupNameText(text)}
            value={this.state.groupName}
          />
          <Text>Room Name:</Text>
          <TextInput
            style={styles.textBox}
            onChangeText={(text) => this.onRoomNameText(text)}
            value={this.state.roomName}
          />
          <Text>Player Name:</Text>
          <TextInput
            style={styles.textBox}
            onChangeText={(text) => this.onPlayerNameText(text)}
            value={this.state.playerName}
          />
          <Button
            onPress={() => this.proceed()}
            title="Proceed"
            color="#841584"
          />
          <Text>{this.state.errorText}</Text>
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
