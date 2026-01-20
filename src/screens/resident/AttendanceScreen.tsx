import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    GEOFENCE_RADIUS,
    HOSTEL_COORDINATES,
    calculateDistance,
    isWithinTimeSlot
} from '../../utils/attendanceUtils';

interface EntryExitLog {
    id: string;
    type: 'entry' | 'exit';
    timestamp: any;
    distance?: number;
}

import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';
import { useNavigation } from '@react-navigation/native';

export default function AttendanceScreen() {
    const { user, hostelId, residentId, hostelData } = useAuth();
    const { colors, theme } = useTheme();
    const navigation = useNavigation();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [entryExitLoading, setEntryExitLoading] = useState(false);
    const [distance, setDistance] = useState<number | null>(null);
    const [isInsideCampus, setIsInsideCampus] = useState<boolean>(false);
    const [recentLogs, setRecentLogs] = useState<EntryExitLog[]>([]);

    useEffect(() => {
        fetchRecentLogs();
    }, []);

    const fetchRecentLogs = async () => {
        if (!user) {
            console.log('[AttendanceScreen] No user, skipping log fetch');
            return;
        }
        try {
            console.log('[AttendanceScreen] Fetching logs for userId:', user.uid);
            const q = query(
                collection(db, 'entry_exit_logs'),
                where('userId', '==', user.uid),
                orderBy('timestamp', 'desc'),
                limit(5)
            );
            const snapshot = await getDocs(q);
            console.log('[AttendanceScreen] Query executed. Docs found:', snapshot.docs.length);

            const logs: EntryExitLog[] = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log('[AttendanceScreen] Log entry:', { id: doc.id, type: data.type, timestamp: data.timestamp });
                return {
                    id: doc.id,
                    ...data
                } as EntryExitLog;
            });

            console.log('[AttendanceScreen] Setting recentLogs with', logs.length, 'entries');
            setRecentLogs(logs);
        } catch (error) {
            console.error('[AttendanceScreen] Error fetching logs:', error);
            setRecentLogs([]);
        }
    };

    const fetchLocation = async () => {
        const hostelLocation = hostelData?.location || {
            latitude: HOSTEL_COORDINATES.latitude,
            longitude: HOSTEL_COORDINATES.longitude
        };

        if (!hostelLocation) {
            Alert.alert('Error', 'Hostel location not configured');
            return null;
        }

        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return null;
            }

            let location = await Location.getCurrentPositionAsync({});
            const dist = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                hostelLocation.latitude,
                hostelLocation.longitude
            );

            setLocation(location);
            setDistance(dist);
            setIsInsideCampus(dist <= GEOFENCE_RADIUS);
            return { location, distance: dist, isInside: dist <= GEOFENCE_RADIUS };
        } catch (error) {
            console.log('Error fetching location:', error);
            return null;
        }
    };

    const verifyBiometric = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) return true;
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verify Identity',
        });
        return result.success;
    };

    const handleMarkAttendance = async (bypassTime = false) => {
        if (!bypassTime) {
            const timeCheck = isWithinTimeSlot();
            if (!timeCheck.allowed) {
                Alert.alert(
                    'Outside Time Slot',
                    `Attendance can only be marked during:\n• Evening: 8 PM - 9:30 PM\n\nNext slot: ${timeCheck.nextSlot}`
                );
                return;
            }
        }

        setLoading(true);
        const locationData = await fetchLocation();
        if (!locationData) {
            Alert.alert('Error', 'Could not fetch location. Please enable location services.');
            setLoading(false);
            return;
        }

        if (!locationData.isInside && !bypassTime) {
            Alert.alert(
                '⚠️ Outside Campus',
                `You are ${locationData.distance.toFixed(0)}m away from campus.\n\nPlease return to campus area (within ${GEOFENCE_RADIUS}m).`
            );
            setLoading(false);
            return;
        }

        const biometricSuccess = await verifyBiometric();
        if (!biometricSuccess) {
            Alert.alert('Failed', 'Biometric verification failed');
            setLoading(false);
            return;
        }

        try {
            if (user && hostelId) {
                await addDoc(collection(db, 'attendance'), {
                    userId: user.uid,
                    residentId: residentId,
                    hostelId: hostelId,
                    timestamp: serverTimestamp(),
                    latitude: locationData.location.coords.latitude,
                    longitude: locationData.location.coords.longitude,
                    distance: locationData.distance
                });
                Alert.alert('✅ Success', 'Attendance marked successfully!');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
        setLoading(false);
    };

    const handleEntryExit = async (type: 'entry' | 'exit') => {
        setEntryExitLoading(true);
        const biometricSuccess = await verifyBiometric();
        if (!biometricSuccess) {
            Alert.alert('Failed', 'Biometric verification failed');
            setEntryExitLoading(false);
            return;
        }

        try {
            if (user && hostelId) {
                await addDoc(collection(db, 'entry_exit_logs'), {
                    userId: user.uid,
                    residentId: residentId,
                    hostelId: hostelId,
                    type: type,
                    timestamp: serverTimestamp(),
                });
                Alert.alert('✅ Success', `${type.toUpperCase()} logged successfully!`);
                fetchRecentLogs();
            }
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
        setEntryExitLoading(false);
    };

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-IN', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Attendance" onBackPress={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                {/* Campus Status */}
                {location && distance !== null && (
                    <Card
                        style={[styles.statusCard, { backgroundColor: isInsideCampus ? '#10B981' : colors.error }]}
                        variant="elevated"
                    >
                        <Text style={styles.statusIcon}>{isInsideCampus ? '📍' : '🚶'}</Text>
                        <Text style={styles.statusTitle}>
                            {isInsideCampus ? 'Inside Campus' : 'Outside Campus'}
                        </Text>
                        <Text style={styles.statusDetail}>
                            {distance.toFixed(0)}m from center
                        </Text>
                    </Card>
                )}

                {/* Entry/Exit Section */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Movement</Text>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10B981' }, entryExitLoading && styles.btnDisabled]}
                        onPress={() => handleEntryExit('entry')}
                        disabled={entryExitLoading}
                    >
                        {entryExitLoading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Text style={styles.btnIcon}>➡️</Text>
                                <Text style={styles.btnLabel}>Entry</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#F43F5E' }, entryExitLoading && styles.btnDisabled]}
                        onPress={() => handleEntryExit('exit')}
                        disabled={entryExitLoading}
                    >
                        {entryExitLoading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Text style={styles.btnIcon}>⬅️</Text>
                                <Text style={styles.btnLabel}>Exit</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Recent Logs Preview */}
                {recentLogs.length > 0 && (
                    <Card style={styles.logsCard} variant="outlined">
                        <Text style={[styles.cardHeader, { color: colors.subText }]}>Recent Activity</Text>
                        {recentLogs.map((log, index) => (
                            <View key={log.id} style={[styles.logRow, index === recentLogs.length - 1 && { borderBottomWidth: 0 }]}>
                                <View style={[styles.typeBadge, { backgroundColor: log.type === 'entry' ? '#10B981' : '#F43F5E' }]}>
                                    <Text style={styles.typeText}>{log.type.toUpperCase()}</Text>
                                </View>
                                <Text style={[styles.logTime, { color: colors.text }]}>{formatTimestamp(log.timestamp)}</Text>
                            </View>
                        ))}
                    </Card>
                )}

                {/* Main Attendance Section */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>Main Register</Text>
                <TouchableOpacity
                    style={[styles.mainBtn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
                    onPress={() => handleMarkAttendance(false)}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : (
                        <Text style={styles.mainBtnText}>🔐 Mark Daily Attendance</Text>
                    )}
                </TouchableOpacity>

                {/* Dev Tools */}
                <TouchableOpacity
                    style={styles.devBtn}
                    onPress={() => {
                        Alert.alert('Dev Mode', 'Bypass geofence/time constraints?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Force Mark', onPress: () => handleMarkAttendance(true) }
                        ]);
                    }}
                >
                    <Text style={[styles.devBtnText, { color: colors.subText }]}>🛠️ Dev Override</Text>
                </TouchableOpacity>

                {/* Info Card */}
                <Card style={styles.infoCard} variant="flat">
                    <Text style={[styles.infoTitle, { color: colors.text }]}>⏰ Attendance Windows</Text>
                    <Text style={[styles.infoText, { color: colors.subText }]}>• Evening Slot: 08:00 PM - 09:30 PM</Text>
                    <Text style={[styles.infoText, { color: colors.subText }]}>Make sure you are within {GEOFENCE_RADIUS}m of the campus center.</Text>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    errorText: {
        color: '#F43F5E',
        textAlign: 'center',
        marginBottom: Spacing.md,
        fontSize: Typography.size.sm,
    },
    statusCard: {
        padding: Spacing.xl,
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    statusIcon: {
        fontSize: 32,
        marginBottom: Spacing.xs,
    },
    statusTitle: {
        color: 'white',
        fontSize: Typography.size.lg,
        fontWeight: Typography.weight.bold,
    },
    statusDetail: {
        color: 'white',
        opacity: 0.8,
        fontSize: Typography.size.xs,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.md,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    actionBtn: {
        flex: 1,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        ...Shadows.md,
    },
    btnIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    btnLabel: {
        color: 'white',
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.bold,
    },
    logsCard: {
        padding: Spacing.lg,
    },
    cardHeader: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.md,
    },
    logRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    typeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    logTime: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
    },
    mainBtn: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        ...Shadows.lg,
    },
    mainBtnText: {
        color: 'white',
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
    },
    btnDisabled: {
        opacity: 0.5,
    },
    devBtn: {
        alignItems: 'center',
        padding: Spacing.md,
        marginTop: Spacing.md,
    },
    devBtnText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.medium,
        textDecorationLine: 'underline',
    },
    infoCard: {
        marginTop: Spacing.xl,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
    },
    infoTitle: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.bold,
        marginBottom: 8,
    },
    infoText: {
        fontSize: Typography.size.xs,
        marginBottom: 4,
        lineHeight: 18,
    },
});

