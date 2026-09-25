import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearAuth,
  markInitialized,
  setAuthError,
  setAuthLoading,
  setUser,
} from '../redux/authSlice';
import { fetchCurrentUser } from '../services/authService';

const FATAL_SESSION_CODES = new Set([
  'TOKEN_EXPIRED',
  'INVALID_TOKEN',
  'USER_NOT_FOUND',
  'PASSWORD_CHANGED',
  'UNAUTHORIZED',
]);

/**
 * Restores session from stored JWT on app boot without logging the user out
 * on network / cold-start failures.
 */
export default function AuthBootstrap({ children }) {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!token) {
        dispatch(markInitialized());
        return;
      }

      if (!userRef.current) {
        dispatch(setAuthLoading());
      }

      try {
        const data = await fetchCurrentUser();
        if (!cancelled) {
          dispatch(setUser(data.data.user));
        }
      } catch (error) {
        if (cancelled) return;
        const cachedUser = userRef.current;
        const fatal =
          error?.status === 401 &&
          (FATAL_SESSION_CODES.has(error?.errorCode) || !cachedUser);

        if (fatal) {
          dispatch(clearAuth());
        } else {
          dispatch(markInitialized());
          if (error?.status !== 401) {
            dispatch(setAuthError(error?.message || 'Unable to refresh session'));
          }
        }
      }
    }

    restore();

    return () => {
      cancelled = true;
    };
  }, [dispatch, token]);

  return children;
}
