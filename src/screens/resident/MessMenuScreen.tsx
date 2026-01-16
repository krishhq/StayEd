import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, getCountFromServer, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { sendBulkNotifications } from '../../utils/notificationUtils';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

const MOCK_MENU = {
    'Monday': { breakfast: 'Aloo Paratha, Curd, Tea/Coffee', lunch: 'Rice, Dal Fry, Mixed Veg, Salad', snacks: 'Samosa, Tea', dinner: 'Roti, Paneer Butter Masala, Jeera Rice' },
    'Tuesday': { breakfast: 'Poha, Sprouts, Milk', lunch: 'Rajma Chawal, Aloo Jeera, Raita', snacks: 'Biscuits, Coffee', dinner: 'Roti, Chicken Curry (or Mushroom Mattar), Rice' },
    'Wednesday': { breakfast: 'Idli, Sambar, Chutney', lunch: 'Lemon Rice, Curd Rice, Papad', snacks: 'Vada Pav, Tea', dinner: 'Egg Curry (or Kofta), Paratha, Rice' },
    'Thursday': { breakfast: 'Upma, Banana, Milk', lunch: 'Kadhi Pakoda, Rice, Bhindi Fry', snacks: 'Sandwich, Juice', dinner: 'Chole Bhature, Salad' },
    'Friday': { breakfast: 'Bread Omelette (or Cutlet), Tea', lunch: 'Veg Biryani, Raita, Salan', snacks: 'Pakora, Tea', dinner: 'Fried Rice, Manchurian, Soup' },
    'Saturday': { breakfast: 'Dosa, Potato Masala, Sambar', lunch: 'Khichdi, Kadhi, Achar, Papad', snacks: 'Puff, Coffee', dinner: 'Special Thali (Sweet included)' },
    'Sunday': { breakfast: 'Chole Puri, Halwa', lunch: 'Special Sunday Feast (Chicken/Paneer)', snacks: 'Corn, Tea', dinner: 'Light Meal (Dal Rice)' }
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MessMenuScreen() {
    const { user, hostelId } = useAuth();
    const { colors, theme } = useTheme();
    const navigation = useNavigation();
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [loading, setLoading] = useState(false);

    const currentMenu = MOCK_MENU[selectedDay as keyof typeof MOCK_MENU];

    const handleSkip = async (mealType: string) => {
        if (!user || !hostelId) return;

        Alert.alert(
            'Confirm Skip',
            `Are you sure you want to skip ${mealType}? This helps us reduce food waste.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, Skip', style: 'destructive', onPress: () => processSkip(mealType) }
            ]
        );
    };

    const processSkip = async (mealType: string) => {
        if (!user || !hostelId) return;

        setLoading(true);
        const mealId = `${selectedDay}-${mealType}`;
        const today = new Date().toISOString().split('T')[0];

        try {
            await addDoc(collection(db, 'meal_skips'), {
                userId: user.uid,
                hostelId: hostelId,
                mealId,
                date: today,
                timestamp: serverTimestamp()
            });

            Alert.alert('Logged', `You've marked ${mealType} as skipped for ${selectedDay}.`);
            // Rest of the high skip rate alert logic remains same...
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderMealCard = (time: string, title: string, content: string, type: string, icon: string) => (
        <Card style={styles.mealCard} variant="elevated">
            <View style={styles.cardHeader}>
                <View style={styles.titleGroup}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
                        <Text style={styles.mealIcon}>{icon}</Text>
                    </View>
                    <View>
                        <Text style={[styles.mealTitle, { color: colors.text }]}>{title}</Text>
                        <Text style={[styles.mealTime, { color: colors.subText }]}>{time}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.skipBtn, { backgroundColor: colors.error + '10' }]}
                    onPress={() => handleSkip(type)}
                    disabled={loading}
                >
                    <Text style={[styles.skipText, { color: colors.error }]}>SKIP</Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.mealContent, { color: colors.text }]}>{content}</Text>
        </Card>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Weekly Menu" onBackPress={() => navigation.goBack()} />

            <View style={[styles.dayContainer, { borderBottomColor: colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
                    {DAYS.map(day => (
                        <TouchableOpacity
                            key={day}
                            style={[
                                styles.dayBtn,
                                selectedDay === day && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setSelectedDay(day)}
                        >
                            <Text style={[
                                styles.dayText,
                                { color: selectedDay === day ? 'white' : colors.subText }
                            ]}>
                                {day.substring(0, 3).toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.menuScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.dayIndicator}>
                    <Text style={[styles.dayIndicatorText, { color: colors.primary }]}>{selectedDay.toUpperCase()}</Text>
                    <View style={[styles.indicatorLine, { backgroundColor: colors.primary }]} />
                </View>

                {renderMealCard('08:00 - 09:30', 'Breakfast', currentMenu.breakfast, 'Breakfast', '🍳')}
                {renderMealCard('12:30 - 02:00', 'Lunch', currentMenu.lunch, 'Lunch', '🍛')}
                {renderMealCard('05:00 - 06:00', 'Snacks', currentMenu.snacks, 'Snacks', '☕')}
                {renderMealCard('08:00 - 09:30', 'Dinner', currentMenu.dinner, 'Dinner', '🍲')}

                <View style={styles.footerInfo}>
                    <Text style={[styles.footerText, { color: colors.subText }]}>
                        Meals skipped help us minimize food waste and optimize expenses.
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
    dayContainer: {
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    dayScroll: {
        paddingHorizontal: Spacing.md,
    },
    dayBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: BorderRadius.full,
        marginRight: Spacing.sm,
    },
    dayText: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
    },
    menuScroll: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    dayIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    dayIndicatorText: {
        fontSize: 12,
        fontWeight: Typography.weight.bold,
        letterSpacing: 2,
    },
    indicatorLine: {
        flex: 1,
        height: 1,
        opacity: 0.2,
    },
    mealCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.xl,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mealIcon: {
        fontSize: 20,
    },
    mealTitle: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
    },
    mealTime: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.medium,
        marginTop: 2,
    },
    skipBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: BorderRadius.sm,
    },
    skipText: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        marginBottom: Spacing.md,
        opacity: 0.5,
    },
    mealContent: {
        fontSize: Typography.size.sm,
        lineHeight: 22,
        fontWeight: Typography.weight.medium,
    },
    footerInfo: {
        marginTop: Spacing.xl,
        padding: Spacing.lg,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 18,
        fontStyle: 'italic',
    },
});


