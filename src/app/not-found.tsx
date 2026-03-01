export default function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0d0e15', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', margin: '0' }}>404</h1>
        <p style={{ opacity: 0.7 }}>Page Not Found</p>
        <a href="/" style={{ color: '#9d4edd', textDecoration: 'none', marginTop: '20px', display: 'inline-block' }}>Return Home</a>
      </div>
    </div>
  );
}
