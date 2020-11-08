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
import {addGroup} from './../../actions/game';

const {width, height} = Dimensions.get('window');

// required for redux
const mapDispatchToProps = (dispatch) => {
  return {
    addGroupProp: (group) => dispatch(addGroup(group)),
  };
};

const bodyText =
  'What is group? Custom questions and answer cards you and your group enter will be saved to the database. In order to to get these cards added to your card decks, make sure to enter the correct group name.';

class InputGroup extends Component {
  constructor(props) {
    super();
    this.navigation = props.navigation;
    this.state = {
      groupName: 'phenibrutes',
      errorText: '',
    };
  }

  proceed() {
    if (!this.state.groupName) {
      this.setState({
        ...this.state,
        errorText: 'Please enter the name of a group to be part of!',
      });
      return;
    }

    this.props.addGroupProp(this.state.groupName);

    this.navigation.popToTop();
    this.navigation.replace('Hand');
  }

  onGroupTextChange(text) {
    this.setState({
      ...this.state,
      groupName: formatText(text, false, true),
      errorText: '',
    });
  }

  render() {
    return (
      <View style={styles.conatiner}>
        <SafeAreaView style={styles.conatiner}>
          <View style={styles.topSection}>
            <Text style={styles.heading}>Group</Text>
            <View style={styles.textInputView}>
              <View style={{height: height * 0.03}} />
              <Text style={styles.bodyText}>Group Name</Text>
              <View style={{height: height * 0.01}} />
              <TextInput
                style={styles.textBox}
                onChangeText={(text) => this.onGroupTextChange(text)}
                value={this.state.groupName}
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

export default connect(null, mapDispatchToProps)(InputGroup);

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
