import React, { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { passwordError, PASSWORD_MIN_LENGTH } from '@thrive/shared/validation/password';
import { LEGAL, LEGAL_VERSION } from '../../services/legal';
import { RegisterView } from '../../components/account/RegisterView';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  // « Recevoir les nouveautés » : préférence locale, NON envoyée (aucune donnée correspondante côté serveur).
  const [newsletter, setNewsletter] = useState(false);

  const handleRegister = async () => {
    if (isLoading) return;
    if (!firstName || !lastName || !email || !password) {
      setError('Tous les champs sont requis');
      return;
    }
    const pwdErr = passwordError(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    // Consentement explicite (Loi 25 art. 4.1 et 14, RGPD art. 7, Apple 5.1.1) :
    // le compte est réservé à un adulte titulaire de l'autorité parentale.
    if (!accepted) {
      setError('Veuillez confirmer votre âge et accepter les conditions pour continuer.');
      return;
    }
    try {
      setError('');
      // Session ouverte immédiatement : le routeur racine envoie le parent dans l'app.
      await signUp(email, password, {
        firstName,
        lastName,
        role: 'PARENT',
        legal_version: LEGAL_VERSION,
        legal_accepted_at: new Date().toISOString(),
        adult_guardian_confirmed: true,
      });
    } catch (err: any) {
      setError(err.message ?? 'Inscription impossible');
    }
  };

  const pwdErr = password.length >= PASSWORD_MIN_LENGTH ? passwordError(password) : null;
  return (
    <RegisterView
      firstName={firstName}
      lastName={lastName}
      email={email}
      password={password}
      onChangeFirstName={setFirstName}
      onChangeLastName={setLastName}
      onChangeEmail={setEmail}
      onChangePassword={setPassword}
      passwordMin={PASSWORD_MIN_LENGTH}
      passwordRuleHint={pwdErr}
      newsletter={newsletter}
      onChangeNewsletter={setNewsletter}
      accepted={accepted}
      onChangeAccepted={setAccepted}
      onOpenTerms={() => WebBrowser.openBrowserAsync(LEGAL.terms)}
      onOpenPrivacy={LEGAL.privacy ? () => WebBrowser.openBrowserAsync(LEGAL.privacy) : undefined}
      error={error}
      loading={isLoading}
      canContinue={Boolean(firstName && lastName && email && password && !passwordError(password))}
      onContinue={handleRegister}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
    />
  );
}
