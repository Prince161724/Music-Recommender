import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'https://music-backend-kmep.onrender.com'
const GOOGLE_CLIENT_ID = '464017570662-tqv6a8jjq4f50cc1kuq426tjmjbfiipe.apps.googleusercontent.com'
const PLACEHOLDER_HASH = '2a96cbd8b46e442fc41c2b86b821562f'
const PER_PAGE = 10
const MAX_TRACKS = 20

function nameToColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 55%, 35%)`
}
function nameToColor2(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) * 31 + ((hash << 3) - hash)
  return `hsl(${Math.abs(hash) % 360}, 50%, 22%)`
}

function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('bm_token') || '')
  const [user, setUser] = useState(null)
  const [authView, setAuthView] = useState('') // '' | 'login' | 'signup'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // App state
  const [view, setView] = useState('home') // 'home' | 'results' | 'history' | 'liked'
  const [link, setLink] = useState('')
  const [allTracks, setAllTracks] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [likedSongs, setLikedSongs] = useState([])
  const [searchHistory, setSearchHistory] = useState([])

  const googleInitialized = useRef(false)
  const googleBtnRef = useRef(null)

  // ===== AUTH HELPERS =====
  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token])

  const logout = () => {
    setToken('')
    setUser(null)
    setLikedSongs([])
    setSearchHistory([])
    localStorage.removeItem('bm_token')
    setView('home')
  }

  // Verify token on mount
  useEffect(() => {
    if (!token) return
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); else logout() })
      .catch(() => logout())
  }, [token])

  // Load liked songs when logged in
  useEffect(() => {
    if (!token) return
    fetch(`${API}/user/liked`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setLikedSongs(d.likedSongs || []))
      .catch(() => { })
  }, [token])

  // ===== AUTH ACTIONS =====
  const handleAuth = async (type) => {
    setAuthError('')
    setAuthLoading(true)
    try {
      const body = type === 'signup'
        ? { name: authForm.name, email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password }
      const res = await fetch(`${API}/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.error) { setAuthError(data.error); return }
      localStorage.setItem('bm_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setAuthView('')
      setAuthForm({ name: '', email: '', password: '' })
    } catch { setAuthError('Connection failed') }
    finally { setAuthLoading(false) }
  }

  // Google Sign-In: load script once
  useEffect(() => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  // Google: handle credential response
  const handleGoogleCredential = useCallback(async (response) => {
    try {
      const res = await fetch(`${API}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('bm_token', data.token)
        setToken(data.token)
        setUser(data.user)
        setAuthView('')
      } else {
        setAuthError(data.error || 'Google login failed')
      }
    } catch { setAuthError('Google login failed') }
  }, [])

  // Google: render button when modal opens
  useEffect(() => {
    if (!authView || !googleBtnRef.current) return
    if (!window.google?.accounts?.id) return

    // Initialize only once
    if (!googleInitialized.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      })
      googleInitialized.current = true
    }

    // Render the button
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: '100%',
      text: 'continue_with',
      shape: 'pill',
    })
  }, [authView, handleGoogleCredential])

  // ===== SEARCH =====
  const handleSubmit = async () => {
    if (!link.trim()) return
    setLoading(true)
    setError('')
    setAllTracks([])
    setPage(1)
    try {
      const res = await fetch(`${API}/getSimilarSongs`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ link: link.trim() })
      })
      const data = await res.json()
      const sorted = (data.list || [])
        .sort((a, b) => (b.match || 0) - (a.match || 0))
        .slice(0, MAX_TRACKS)
      setAllTracks(sorted)
      setView('results')

      // Save to history if logged in
      if (token) {
        fetch(`${API}/user/history`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            query: link.trim(),
            songName: sorted[0]?.name || '',
            artistName: sorted[0]?.artist?.name || ''
          })
        }).catch(() => { })
      }
    } catch { setError('Something went wrong. Try again.') }
    finally { setLoading(false) }
  }

  // ===== LIKE/UNLIKE =====
  const isLiked = (name, artist) => likedSongs.some(s => s.name === name && s.artist === artist)

  const toggleLike = async (track) => {
    if (!token) { setAuthView('login'); return }
    const liked = isLiked(track.name, track.artist?.name)
    const endpoint = liked ? '/user/unlike' : '/user/like'
    const imgUrl = getImage(track.image)
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          name: track.name,
          artist: track.artist?.name,
          url: track.url,
          duration: track.duration,
          match: track.match,
          image: imgUrl
        })
      })
      const data = await res.json()
      if (data.likedSongs) setLikedSongs(data.likedSongs)
    } catch { }
  }

  // ===== LOAD HISTORY =====
  const loadHistory = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/user/history`, { headers: headers() })
      const data = await res.json()
      setSearchHistory(data.searchHistory || [])
    } catch { }
    setView('history')
  }

  // ===== HELPERS =====
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }
  const formatDuration = (sec) => {
    if (!sec) return ''
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`
  }
  const isPlaceholder = (url) => !url || url.includes(PLACEHOLDER_HASH)
  const getImage = (images) => {
    if (!images || !images.length) return ''
    const large = images.find(i => i.size === 'extralarge') || images.find(i => i.size === 'large') || images[0]
    const url = large?.['#text'] || ''
    return isPlaceholder(url) ? '' : url
  }

  const totalPages = Math.ceil(allTracks.length / PER_PAGE)
  const currentTracks = allTracks.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // ===== AUTH MODAL =====
  const renderAuthModal = () => {
    if (!authView) return null
    return (
      <div className="modal-overlay" onClick={() => setAuthView('')}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <button className="modal__close" onClick={() => setAuthView('')}>✕</button>
          <h2 className="modal__title">{authView === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p className="modal__sub">{authView === 'login' ? 'Sign in to your account' : 'Join BotMusic today'}</p>

          {authError && <p className="modal__error">{authError}</p>}

          <div className="modal__form">
            {authView === 'signup' && (
              <input
                className="modal__input"
                placeholder="Name"
                value={authForm.name}
                onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
              />
            )}
            <input
              className="modal__input"
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
            />
            <input
              className="modal__input"
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAuth(authView)}
            />
            <button
              className="modal__btn"
              onClick={() => handleAuth(authView)}
              disabled={authLoading}
            >
              {authLoading ? '...' : (authView === 'login' ? 'Sign In' : 'Sign Up')}
            </button>

            <div className="modal__divider"><span>or</span></div>

            <div ref={googleBtnRef} className="modal__google-container" />
          </div>

          <p className="modal__switch">
            {authView === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={() => { setAuthView(authView === 'login' ? 'signup' : 'login'); setAuthError('') }}>
              {authView === 'login' ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
        </div>
      </div>
    )
  }

  // ===== NAVBAR =====
  const renderNav = () => (
    <nav className="nav" id="navbar">
      <div className="nav__brand" onClick={() => { setView('home'); setAllTracks([]) }} style={{ cursor: 'pointer' }}>BotMusic</div>
      <div className="nav__right">
        {view !== 'home' && (
          <span className="nav__link nav__link--back" onClick={() => { setView('home'); setAllTracks([]) }}>← Home</span>
        )}
        {user ? (
          <>
            {token && <span className="nav__link" onClick={() => { loadHistory() }}>History</span>}
            {token && <span className="nav__link" onClick={() => setView('liked')}>Liked</span>}
            <span className="nav__user" onClick={logout} title="Click to logout">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </>
        ) : (
          <span className="nav__link nav__link--cta" onClick={() => setAuthView('login')}>Sign In</span>
        )}
      </div>
    </nav>
  )

  // ===== LIKED SONGS VIEW =====
  if (view === 'liked') {
    return (
      <div className="page page--results">
        <div className="glow glow--1" /><div className="glow glow--2" />
        {renderNav()}
        {renderAuthModal()}
        <main className="results">
          <div className="results__header">
            <div>
              <h2 className="results__heading">❤️ Liked Songs</h2>
              <p className="results__count">{likedSongs.length} songs</p>
            </div>
          </div>
          {likedSongs.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__icon">❤️</p>
              <p className="empty-state__text">No liked songs yet</p>
              <p className="empty-state__sub">Like songs from your search results to save them here</p>
            </div>
          ) : (
            <div className="results__list">
              {likedSongs.map((s, i) => {
                const c1 = nameToColor(s.name)
                const c2 = nameToColor2(s.name)
                return (
                  <a key={i} className="track" href={s.url} target="_blank" rel="noopener noreferrer">
                    <span className="track__rank">#{i + 1}</span>
                    <div className="track__art" style={!s.image ? { background: `linear-gradient(135deg, ${c1}, ${c2})` } : {}}>
                      {s.image ? <img src={s.image} alt={s.name} className="track__img" /> : <span className="track__art-icon">♫</span>}
                    </div>
                    <div className="track__info">
                      <div className="track__name">{s.name}</div>
                      <div className="track__artist">{s.artist}</div>
                    </div>
                    <div className="track__right">
                      {s.duration > 0 && <span className="track__duration">{formatDuration(s.duration)}</span>}
                    </div>
                    <span className="track__arrow">→</span>
                  </a>
                )
              })}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ===== HISTORY VIEW =====
  if (view === 'history') {
    return (
      <div className="page page--results">
        <div className="glow glow--1" /><div className="glow glow--2" />
        {renderNav()}
        {renderAuthModal()}
        <main className="results">
          <div className="results__header">
            <div>
              <h2 className="results__heading">🕐 Search History</h2>
              <p className="results__count">{searchHistory.length} searches</p>
            </div>
          </div>
          {searchHistory.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__icon">🔍</p>
              <p className="empty-state__text">No searches yet</p>
              <p className="empty-state__sub">Your search history will appear here</p>
            </div>
          ) : (
            <div className="results__list">
              {searchHistory.map((h, i) => (
                <div key={i} className="track history-item">
                  <span className="track__rank">#{i + 1}</span>
                  <div className="track__art" style={{ background: `linear-gradient(135deg, ${nameToColor(h.query)}, ${nameToColor2(h.query)})` }}>
                    <span className="track__art-icon">🔍</span>
                  </div>
                  <div className="track__info">
                    <div className="track__name">{h.songName || 'Unknown'} — {h.artistName || 'Unknown'}</div>
                    <div className="track__artist">{new Date(h.searchedAt).toLocaleString()}</div>
                  </div>
                  <span className="track__arrow">→</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ===== RESULTS VIEW =====
  if (view === 'results' && allTracks.length > 0) {
    return (
      <div className="page page--results">
        <div className="glow glow--1" /><div className="glow glow--2" />
        {renderNav()}
        {renderAuthModal()}
        <main className="results">
          <div className="results__header">
            <div>
              <h2 className="results__heading">Similar Tracks</h2>
              <p className="results__count">Top {allTracks.length} matches · Page {page} of {totalPages}</p>
            </div>
          </div>

          <div className="results__list">
            {currentTracks.map((track, i) => {
              const rank = (page - 1) * PER_PAGE + i + 1
              const imgUrl = getImage(track.image)
              const c1 = nameToColor(track.name)
              const c2 = nameToColor2(track.name)
              const liked = isLiked(track.name, track.artist?.name)

              return (
                <div key={rank} className="track" id={`track-${rank}`}>
                  <span className="track__rank">#{rank}</span>
                  <div className="track__art" style={!imgUrl ? { background: `linear-gradient(135deg, ${c1}, ${c2})` } : {}}>
                    {imgUrl ? <img src={imgUrl} alt={track.name} className="track__img" /> : <span className="track__art-icon">♫</span>}
                  </div>
                  <div className="track__info">
                    <div className="track__name">{track.name}</div>
                    <div className="track__artist">{track.artist?.name}</div>
                  </div>
                  <div className="track__right">
                    {track.duration > 0 && <span className="track__duration">{formatDuration(track.duration)}</span>}
                    <span className="track__match">{Math.round((track.match || 0) * 100)}%</span>
                  </div>
                  <button
                    className={`like-btn ${liked ? 'like-btn--active' : ''}`}
                    onClick={(e) => { e.preventDefault(); toggleLike(track) }}
                    title={liked ? 'Unlike' : 'Like'}
                  >
                    {liked ? '❤️' : '🤍'}
                  </button>
                  <a href={track.url} target="_blank" rel="noopener noreferrer" className="track__arrow">→</a>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination" id="pagination">
              <button className={`pagination__btn ${page === 1 ? 'pagination__btn--active' : ''}`} onClick={() => setPage(1)}>1</button>
              <button className={`pagination__btn ${page === 2 ? 'pagination__btn--active' : ''}`} onClick={() => setPage(2)}>2</button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ===== HOME VIEW =====
  return (
    <div className="page">
      <div className="glow glow--1" /><div className="glow glow--2" />
      {renderNav()}
      {renderAuthModal()}
      <main className="main">
        <div className="content">
          <h1 className="heading">Find music<br />you'll love.</h1>
          <p className="subtext">Paste a song link and let AI find similar tracks for you.</p>
          <div className="input-bar" id="input-bar">
            <span className="input-bar__icon">🔗</span>
            <input type="url" className="input-bar__field" placeholder="Paste a Spotify or YouTube link..." value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={handleKeyDown} id="link-input" />
            <button className="input-bar__btn" disabled={!link.trim() || loading} onClick={handleSubmit} id="submit-btn">{loading ? '...' : 'Go'}</button>
          </div>
          {error && <p className="error-msg">{error}</p>}
        </div>
        <div className="cube-scene" id="cube-scene">
          <div className="cube-reflection" />
          <div className="cube">
            <div className="cube__face cube__face--front"><div className="cube__icon">♫</div></div>
            <div className="cube__face cube__face--top" />
            <div className="cube__face cube__face--right" />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
