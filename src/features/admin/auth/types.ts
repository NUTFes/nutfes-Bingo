export type AuthActionState = {
  error: string | null;
};

export type ForgotPasswordActionState = {
  error: string | null;
  success: boolean;
};

export const INITIAL_AUTH_ACTION_STATE: AuthActionState = {
  error: null,
};

export const INITIAL_FORGOT_PASSWORD_ACTION_STATE: ForgotPasswordActionState = {
  error: null,
  success: false,
};
