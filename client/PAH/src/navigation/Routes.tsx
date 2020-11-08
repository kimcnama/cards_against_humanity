import React from 'react';
import {createStackNavigator} from "@react-navigation/stack";
import {NavigationContainer} from "@react-navigation/native";
import HeaderStyle from './HeaderStyles';

import GameSetup from './../screens/setup/gameSetup';
import InputGroup from './../screens/setup/inputGroup';
import HandScreen from './../screens/hand/handScreen';
import OnDisconnect from './../screens/onDisconnect/onDisconnect';

interface RoutesProps {}

const Stack = createStackNavigator();

function GameSetupScreen({navigation}) {
    return <GameSetup navigation={navigation} />;
}

function InputGroupScreen({navigation}) {
    return <InputGroup navigation={navigation} />;
}

function HandViewScreen({navigation}) {
    return <HandScreen navigation={navigation} />;
}

function OnDisconnectScreen({navigation}) {
    return <OnDisconnect navigation={navigation} />;
}

export const Routes: React.FC<RoutesProps> = ({}) => (
    <NavigationContainer>
        <Stack.Navigator screenOptions={HeaderStyle} >
            <Stack.Screen name="GameSetup" component={GameSetupScreen} />
            <Stack.Screen name="InputGroup" component={InputGroupScreen} />
            <Stack.Screen name="Hand" component={HandViewScreen} />
            <Stack.Screen name="OnDisconnect" component={OnDisconnectScreen} />
        </Stack.Navigator>
    </NavigationContainer>
)
