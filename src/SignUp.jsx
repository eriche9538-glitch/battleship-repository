import { useState } from 'react'
import './SignUp.css'

function SignUp({ onSignUpComplete, onSwitchToSignIn }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required.')
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Sign-up failed. Please try again.')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      })

      // Redirect after 1.5 seconds
      const redirectTimer = setTimeout(() => {
        if (onSignUpComplete) {
          onSignUpComplete(data.user || { username: formData.username, email: formData.email })
        }
      }, 1500)

      // Cleanup timer if component unmounts
      return () => clearTimeout(redirectTimer)
    } catch (err) {
      console.error('Sign-up error:', err)
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <p className="eyebrow">Welcome to Battleships</p>
          <h1>Create Account</h1>
          <p className="lede">Join the fleet and start battling today.</p>
        </div>

        {success ? (
          <div className="success-message">
            <strong>Success!</strong>
            <p>Your account has been created. Redirecting to the game...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose your captain name"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
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
                placeholder="At least 6 characters"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your password"
                disabled={isLoading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="switch-auth-text">
              Already have an account?{' '}
              <button
                type="button"
                className="ghost-button switch-auth-button"
                onClick={onSwitchToSignIn}
              >
                Sign In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default SignUp
