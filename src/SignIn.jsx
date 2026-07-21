import { useState } from 'react'
import './SignUp.css'

function SignIn({ onSignInComplete, onSwitchToSignUp }) {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!formData.identifier || !formData.password) {
      setError('Email/username and password are required.')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Sign-in failed.')
        setIsLoading(false)
        return
      }

      if (onSignInComplete) {
        onSignInComplete(data.user)
      }
    } catch (err) {
      console.error('Sign-in error:', err)
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <p className="eyebrow">Welcome back</p>
          <h1>Sign In</h1>
          <p className="lede">Use your email or username to enter the fleet.</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label htmlFor="identifier">Email or Username</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="you@example.com or captain"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="lede" style={{ marginTop: '1rem', textAlign: 'center' }}>
          Need an account?{' '}
          <button type="button" className="ghost-button" onClick={onSwitchToSignUp}>
            Create one
          </button>
        </p>
      </div>
    </div>
  )
}

export default SignIn
