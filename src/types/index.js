// src/types/index.ts
export interface Restaurant {
    _id: string;
    name: string;
    address: string;
    google_place_id: string;
    description?: string;
    contact: {
        phone?: string;
        email?: string;
        whatsapp?: string;
    };
    google_data: {
        rating?: number;
        reviews_count?: number;
        place_url?: string;
    };
    menu: {
        type: 'manual' | 'url' | 'ai_generated';
        url?: string;
        sections?: MenuSection[];
    };
    whatsapp_bot: {
        welcome_message: {
            content: string;
            is_modified: boolean;
        };
        review_message: {
            content: string;
            is_modified: boolean;
        };
    };
    onboarding: {
        completed_steps: number[];
        current_step: number;
    };
}

export interface MenuSection {
    name: string;
    items: MenuItem[];
}

export interface MenuItem {
    name: string;
    description?: string;
    price: number;
    category?: string;
}

// src/lib/api/onboarding.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const onboardingApi = {
    searchRestaurant: async (name: string, address: string) => {
        const response = await axios.post(`${API_URL}/api/onboarding/search-restaurant`, {
            name,
            address
        });
        return response.data;
    },

    importFromGoogle: async (placeId: string) => {
        const response = await axios.post(`${API_URL}/api/onboarding/import-google`, {
            placeId
        });
        return response.data;
    },

    updateStep: async (step: number, data: any) => {
        const response = await axios.post(`${API_URL}/api/onboarding/step/${step}`, data);
        return response.data;
    }
};

// src/lib/hooks/useOnboarding.ts
import { useState } from 'react';
import { useRouter } from 'next/router';
import { onboardingApi } from '../api/onboarding';

export const useOnboarding = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchRestaurant = async (name: string, address: string) => {
        try {
            setLoading(true);
            setError(null);
            return await onboardingApi.searchRestaurant(name, address);
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const importRestaurant = async (placeId: string) => {
        try {
            setLoading(true);
            setError(null);
            const result = await onboardingApi.importFromGoogle(placeId);
            router.push('/onboarding/2');
            return result;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        searchRestaurant,
        importRestaurant
    };
};