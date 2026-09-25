const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const data = await authService.registerUser(req.body, req);
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data,
  });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.loginUser(req.body, req);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data,
  });
});

const logout = asyncHandler(async (req, res) => {
  const data = await authService.logoutUser(req.user, req);
  res.status(200).json({
    success: true,
    message: data.message,
    data: null,
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Current user',
    data: { user },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword(req.user._id, req.body, req);
  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    data,
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword(req.body.email, req);
  res.status(200).json({
    success: true,
    message: data.message,
    data,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body, req);
  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    data,
  });
});

module.exports = {
  register,
  login,
  logout,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
};
