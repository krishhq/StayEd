import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth, UserRole } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

// Auth Screen
import LoginScreen from '../screens/auth/LoginScreen';

// Resident Screens
import ResidentDashboard from '../screens/resident/ResidentDashboard';
import ForumScreen from '../screens/resident/ForumScreen';

// Admin Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import RegisterResidentScreen from '../screens/admin/RegisterResidentScreen';

// Guardian Screens
import GuardianDashboard from '../screens/guardian/GuardianDashboard';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { user, userRole, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator>
                {user ? (
                    // Authenticated Stacks
                    userRole === 'resident' ? (
                        <>
                            <Stack.Screen name="ResidentDashboard" component={ResidentDashboard} />
                            <Stack.Screen name="Forum" component={ForumScreen} />
                        </>
                    ) : userRole === 'admin' ? (
                        <>
                            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
                            <Stack.Screen name="RegisterResident" component={RegisterResidentScreen} />
                        </>
                    ) : userRole === 'guardian' ? (
                        <>
                            <Stack.Screen name="GuardianDashboard" component={GuardianDashboard} />
                        </>
                    ) : (
                        // Fallback for user with no role (or new user) - effectively "Pending Approval" or similar
                        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Pending Access' }} />
                    )
                ) : (
                    // Auth Stack
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
