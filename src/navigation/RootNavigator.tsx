import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth, UserRole } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

// Auth Screen
import LoginScreen from '../screens/auth/LoginScreen';
import PendingScreen from '../screens/auth/PendingScreen';

// Resident Screens
import ResidentDashboard from '../screens/resident/ResidentDashboard';
import ResidentForumScreen from '../screens/resident/ResidentForumScreen';
import MessMenuScreen from '../screens/resident/MessMenuScreen';
import AttendanceScreen from '../screens/resident/AttendanceScreen';
import ComplaintScreen from '../screens/resident/ComplaintScreen';
import LeaveScreen from '../screens/resident/LeaveScreen';

// Admin Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import RegisterResidentScreen from '../screens/admin/RegisterResidentScreen';
import AllComplaintsScreen from '../screens/admin/AllComplaintsScreen';
import AttendanceLogScreen from '../screens/admin/AttendanceLogScreen';
import AdminLeaveScreen from '../screens/admin/AdminLeaveScreen';

// Guardian Screens
import GuardianDashboard from '../screens/guardian/GuardianDashboard';
import GuardianLeaveScreen from '../screens/guardian/GuardianLeaveScreen';

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
                            <Stack.Screen name="Forum" component={ResidentForumScreen} />
                            <Stack.Screen name="Attendance" component={AttendanceScreen} />
                            <Stack.Screen name="Complaints" component={ComplaintScreen} />
                            <Stack.Screen name="Leave" component={LeaveScreen} />
                            <Stack.Screen name="Mess" component={MessMenuScreen} />
                        </>
                    ) : userRole === 'admin' ? (
                        <>
                            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
                            <Stack.Screen name="RegisterResident" component={RegisterResidentScreen} />
                            <Stack.Screen name="AllComplaints" component={AllComplaintsScreen} />
                            <Stack.Screen name="AttendanceLog" component={AttendanceLogScreen} />
                            <Stack.Screen name="AdminLeaves" component={AdminLeaveScreen} />
                        </>
                    ) : userRole === 'guardian' ? (
                        <>
                            <Stack.Screen name="GuardianDashboard" component={GuardianDashboard} />
                            <Stack.Screen name="GuardianLeave" component={GuardianLeaveScreen} />
                        </>
                    ) : (
                        // Fallback for user with no role (or new user) - effectively "Pending Approval" or similar
                        <Stack.Screen name="Pending" component={PendingScreen} options={{ title: 'Pending Access' }} />
                    )
                ) : (
                    // Auth Stack
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
