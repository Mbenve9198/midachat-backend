// src/lib/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
    id: string;
    name: string;
    email: string;
    onboardingCompleted: boolean;
    currentStep: number;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
}

export const useAuth = () => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isLoading: true,
        error: null
    });
    const router = useRouter();

    useEffect(() => {
        verifyToken();
    }, []);

    const verifyToken = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setAuthState(prev => ({ ...prev, isLoading: false }));
            return;
        }

        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAuthState({
                user: response.data.user,
                isLoading: false,
                error: null
            });
        } catch (error) {
            localStorage.removeItem('token');
            setAuthState({
                user: null,
                isLoading: false,
                error: 'Sessione scaduta'
            });
            router.push('/');
        }
    };

    const login = async (email: string, password: string) => {
        try {
            setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
                email,
                password
            });
            
            localStorage.setItem('token', response.data.token);
            setAuthState({
                user: response.data.user,
                isLoading: false,
                error: null
            });

            if (!response.data.user.onboardingCompleted) {
                router.push(`/onboarding/${response.data.user.currentStep}`);
            } else {
                router.push('/dashboard');
            }
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                isLoading: false,
                error: error.response?.data?.message || 'Errore durante il login'
            }));
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setAuthState({
            user: null,
            isLoading: false,
            error: null
        });
        router.push('/');
    };

    return {
        user: authState.user,
        isLoading: authState.isLoading,
        error: authState.error,
        login,
        logout,
        verifyToken
    };
};