import {AuthConfig} from 'angular-oauth2-oidc';

export const AUTH_CONFIG: AuthConfig = {
  issuer: '',
  redirectUri: window.location.origin,
  postLogoutRedirectUri: '/',
  clientId: '',
  responseType: 'code',
  scope: 'openid profile email offline_access',
  showDebugInformation: true,
};
