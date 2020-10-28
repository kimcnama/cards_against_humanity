import React from 'react';
import {createStackNavigator} from "@react-navigation/stack";
import {NavigationContainer} from "@react-navigation/native";
import HeaderStyle from './HeaderStyles';

import GameSetup from './../screens/setup/gameSetup';

interface RoutesProps {}

const Stack = createStackNavigator();

function GameSetupScreen({navigation}) {
    return <GameSetup navigation={navigation} />;
}

export const Routes: React.FC<RoutesProps> = ({}) => (
    <NavigationContainer>
        <Stack.Navigator screenOptions={HeaderStyle} >
            <Stack.Screen name="GameSetup" component={GameSetupScreen} />
        </Stack.Navigator>
    </NavigationContainer>
)
