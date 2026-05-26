import React from 'react';
import { login, signup } from './firebase.js';

function AuthScreen() {
  const [mode, setMode] = React.useState('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-frame" style={{ justifyContent: 'center' }}>
      <div style={{ padding: '0 24px', width: '100%' }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>
            Mis Entrenos
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ink-2)' }}>
            {mode === 'login'
              ? 'Accede para sincronizar tus datos entre dispositivos.'
              : 'Crea una cuenta para guardar y sincronizar tus entrenos.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <div style={{ fontSize: 13, color: 'var(--down)', textAlign: 'center' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="pickbtn"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)', padding: '14px 22px', borderRadius: 999, fontWeight: 600, fontSize: 15, marginTop: 4 }}
          >
            {loading ? 'Cargando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div className="demo-link" style={{ marginTop: 20, textAlign: 'center' }}>
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '13px 16px',
  fontSize: 15,
  borderRadius: 14,
  border: '1px solid var(--line-2)',
  background: 'var(--surface)',
  outline: 'none',
};

function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Este correo ya está registrado.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'El correo no es válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento.';
    default:
      return 'Algo salió mal. Inténtalo de nuevo.';
  }
}

export default AuthScreen;
