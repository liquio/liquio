import { useAppSelector } from 'core/store/hooks';

export const useAuth = () => useAppSelector((state) => state.auth);
