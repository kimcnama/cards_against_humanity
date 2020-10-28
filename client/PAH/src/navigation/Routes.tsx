import React from 'react';
import {createStackNavigator} from "@react-navigation/stack";
import {NavigationContainer} from "@react-navigation/native";
import HeaderStyle from './HeaderStyles';

import GameSetup from './../screens/setup/gameSetup';
import HandScreen from './../screens/hand/handScreen';

interface RoutesProps {}

const Stack = createStackNavigator();

function GameSetupScreen({navigation}) {
    return <GameSetup navigation={navigation} />;
}

function HandViewScreen({navigation}) {
    return <HandScreen navigation={navigation} />;
}

export const Routes: React.FC<RoutesProps> = ({}) => (
    <NavigationContainer>
        <Stack.Navigator screenOptions={HeaderStyle} >
            <Stack.Screen name="GameSetup" component={GameSetupScreen} />
            <Stack.Screen name="Hand" component={HandViewScreen} />
        </Stack.Navigator>
    </NavigationContainer>
)
