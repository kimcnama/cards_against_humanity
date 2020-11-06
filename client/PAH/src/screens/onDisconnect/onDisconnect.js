import React, {Component} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Image,
} from 'react-native';

const {width, height} = Dimensions.get('window');

const iconWidth = width * 0.5;

const disconnectText =
  'Sorry, you have disconnected from your room. If you are re-joining the same room, please use a different name!';

class OnDisconnect extends Component {
  constructor(props) {
    super();
    this.navigation = props.navigation;
  }

  proceed() {
    this.navigation.replace('GameSetup');
  }

  render() {
    return (
      <View style={styles.conatiner}>
        <View style={styles.topSection}>
          <View style={{height: iconWidth, width: iconWidth}}>
            <Image
              style={{height: iconWidth, width: iconWidth}}
              resizeMode="contain"
              source={require('./../../../assets/cancel.png')}
            />
          </View>
          <View style={{width: width * 0.9}}>
            <Text style={styles.heading}>Disconnected!</Text>
            <Text style={styles.bodyText}>{disconnectText}</Text>
          </View>
        </View>
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={() => this.proceed()}>
            <Text style={styles.proceedButtonText}>Back to setup menus</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

export default OnDisconnect;

const styles = StyleSheet.create({
  conatiner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#272727',
  },
  topSection: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    width: '100%',
    height: '20%',
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
    textAlign: 'center',
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
});
