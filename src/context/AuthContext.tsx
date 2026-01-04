import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// Define User Roles
export type UserRole = 'resident' | 'admin' | 'guardian' | null;

interface AuthContextType {
    user: User | null;
    userRole: UserRole;
    isLoading: boolean;
    signOut: () => Promise<void>;
    // We will handle login in the LoginScreen mainly, but could expose methods here if needed
    simulateLogin: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Fetch user role from Firestore
                // Assuming we store user role in a 'users' collection with document ID as uid
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUserRole(userData.role as UserRole);
                    } else {
                        // Handle case where user exists in Auth but not in Firestore (e.g. new user)
                        // For now, default to null or handle registration flow
                        console.log("No user document found!");
                        setUserRole(null);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setUserRole(null);
                }
            } else {
                setUserRole(null);
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUserRole(null);
        setUser(null);
    };

    // DEV ONLY: Simulate login for testing without Firebase
    const simulateLogin = (role: UserRole) => {
        setUser({ uid: 'dev-user-id', email: 'dev@test.com' } as User);
        setUserRole(role);
        setIsLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, userRole, isLoading, signOut, simulateLogin }}>
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
