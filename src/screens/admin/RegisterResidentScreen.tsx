import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { addResident, registerUser } from '../../services/firestoreService';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function RegisterResidentScreen() {
    const { hostelId, user, userData } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('+91');
    const [email, setEmail] = useState('');
    const [room, setRoom] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('+91');
    const [permanentAddress, setPermanentAddress] = useState('');
    const [aadharCard, setAadharCard] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !phone || phone === '+91' || !guardianName || !guardianPhone || guardianPhone === '+91' || !room) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (!hostelId) {
            Alert.alert('Error', 'Hostel ID not found. Configuration error.');
            return;
        }

        setLoading(true);
        try {
            const residentId = await addResident({
                name,
                phone,
                email,
                roomNumber: room,
                guardianName,
                guardianPhone,
                permanentAddress,
                aadharCard,
                hostelId: hostelId,
            });

            await registerUser({
                id: residentId,
                name,
                phone,
                email,
                role: 'resident',
                hostelId: hostelId,
                residentId: residentId,
            }, residentId);

            const guardianUserId = `guardian_${residentId}`;
            await registerUser({
                id: guardianUserId,
                name: guardianName,
                phone: guardianPhone,
                role: 'guardian',
                hostelId: hostelId,
                linkedResidentId: residentId,
            }, guardianUserId);

            Alert.alert('Success', 'Resident & Guardian Registered successfully');
            setName('');
            setPhone('+91');
            setEmail('');
            setRoom('');
            setGuardianName('');
            setGuardianPhone('+91');
            setPermanentAddress('');
            setAadharCard('');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (label: string, value: string, onChange: (t: string) => void, placeholder: string, options: any = {}) => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.subText }]}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                    options.multiline && styles.textArea
                ]}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.subText + '50'}
                {...options}
            />
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Add Resident" onBackPress={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Card style={styles.sectionCard}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Resident Identity</Text>
                    {renderInput('FULL NAME*', name, setName, 'e.g. Rahul Sharma')}
                    {renderInput('PHONE NUMBER*', phone, (text) => {
                        if (!text.startsWith('+91')) setPhone('+91' + text.replace(/^\+?9?1?/, ''));
                        else setPhone(text);
                    }, '+91...', { keyboardType: 'phone-pad' })}
                    {renderInput('EMAIL (OPTIONAL)', email, setEmail, 'student@example.com', { keyboardType: 'email-address' })}

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            {renderInput('ROOM*', room, setRoom, '101')}
                        </View>
                        <View style={{ width: Spacing.md }} />
                        <View style={{ flex: 1.5 }}>
                            {renderInput('AADHAR CARD', aadharCard, setAadharCard, '12 Digit UID', { keyboardType: 'number-pad' })}
                        </View>
                    </View>
                </Card>

                <Card style={styles.sectionCard}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Guardian Connection</Text>
                    {renderInput('GUARDIAN NAME*', guardianName, setGuardianName, 'Parent/Guardian Name')}
                    {renderInput('GUARDIAN PHONE*', guardianPhone, (text) => {
                        if (!text.startsWith('+91')) setGuardianPhone('+91' + text.replace(/^\+?9?1?/, ''));
                        else setGuardianPhone(text);
                    }, '+91...', { keyboardType: 'phone-pad' })}
                    {renderInput('PERMANENT ADDRESS', permanentAddress, setPermanentAddress, 'Full residential address...', { multiline: true, numberOfLines: 3 })}
                </Card>

                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    <Text style={styles.submitText}>{loading ? 'Processing...' : 'Complete Registration'}</Text>
                </TouchableOpacity>

                <View style={styles.footerInfo}>
                    <Text style={[styles.infoText, { color: colors.subText }]}>
                        * Required fields. This will generate credentials for both Resident and Guardian.
                    </Text>
                </View>
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
    sectionCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: Spacing.lg,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 9,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
        marginBottom: 6,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: Typography.size.sm,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
    },
    submitBtn: {
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        ...Shadows.md,
        marginTop: Spacing.md,
        marginBottom: Spacing.xl,
    },
    submitText: {
        color: 'white',
        fontWeight: Typography.weight.bold,
        fontSize: Typography.size.sm,
        letterSpacing: 0.5,
    },
    footerInfo: {
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    infoText: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 16,
        fontStyle: 'italic',
    }
});

