import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// Define User Roles
export type UserRole = 'resident' | 'admin' | 'guardian' | null;

interface HostelData {
    id: string;
    name: string;
    address: string;
    location: {
        latitude: number;
        longitude: number;
    };
    occupancy: number;
}

interface AuthContextType {
    user: User | null;
    userRole: UserRole;
    hostelId: string | null;
    hostelData: HostelData | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    simulateLogin: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [hostelId, setHostelId] = useState<string | null>(null);
    const [hostelData, setHostelData] = useState<HostelData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Fetch user role and hostel from Firestore
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUserRole(userData.role as UserRole);
                        setHostelId(userData.hostelId || null);

                        // Fetch hostel data if hostelId exists
                        if (userData.hostelId) {
                            const hostelDocRef = doc(db, 'hostels', userData.hostelId);
                            const hostelDoc = await getDoc(hostelDocRef);
                            if (hostelDoc.exists()) {
                                setHostelData({
                                    id: hostelDoc.id,
                                    ...hostelDoc.data()
                                } as HostelData);
                            }
                        }
                    } else {
                        console.log("No user document found!");
                        setUserRole(null);
                        setHostelId(null);
                        setHostelData(null);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUserRole(null);
                    setHostelId(null);
                    setHostelData(null);
                }
            } else {
                setUserRole(null);
                setHostelId(null);
                setHostelData(null);
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUserRole(null);
        setUser(null);
        setHostelId(null);
        setHostelData(null);
    };

    // DEV ONLY: Simulate login for testing without Firebase
    const simulateLogin = (role: UserRole) => {
        setUser({ uid: 'dev-user-id', email: 'dev@test.com' } as User);
        setUserRole(role);
        // Set mock hostel data for dev mode
        setHostelId('dev-hostel-id');
        setHostelData({
            id: 'dev-hostel-id',
            name: 'Dev Hostel',
            address: 'Dev Address',
            location: {
                latitude: 18.513714,
                longitude: 73.819596
            },
            occupancy: 50
        });
        setIsLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, userRole, hostelId, hostelData, isLoading, signOut, simulateLogin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
