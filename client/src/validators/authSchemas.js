import * as yup from 'yup';

export const loginSchema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export const registerSchema = yup.object({
  firstName: yup.string().trim().required('First name is required'),
  lastName: yup.string().trim().required('Last name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  phone: yup.string().optional(),
  roleName: yup.string().required('Role is required'),
  password: yup
    .string()
    .min(8, 'At least 8 characters')
    .matches(/[A-Z]/, 'Include an uppercase letter')
    .matches(/[a-z]/, 'Include a lowercase letter')
    .matches(/[0-9]/, 'Include a number')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm your password'),
});

export const forgotPasswordSchema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
});

export const resetPasswordSchema = yup.object({
  password: yup
    .string()
    .min(8, 'At least 8 characters')
    .matches(/[A-Z]/, 'Include an uppercase letter')
    .matches(/[a-z]/, 'Include a lowercase letter')
    .matches(/[0-9]/, 'Include a number')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm your password'),
});

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .min(8, 'At least 8 characters')
    .matches(/[A-Z]/, 'Include an uppercase letter')
    .matches(/[a-z]/, 'Include a lowercase letter')
    .matches(/[0-9]/, 'Include a number')
    .required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Confirm your password'),
});
