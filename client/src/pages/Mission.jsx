import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Mission() {
  const navigate = useNavigate();

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f1eb 0%, #e8dcc6 100%)',
    padding: '20px 0',
  };

  const contentStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '60px',
    paddingTop: '40px',
  };

  const titleStyle = {
    fontSize: '3rem',
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: '20px',
    lineHeight: '1.2',
  };

  const subtitleStyle = {
    fontSize: '1.2rem',
    color: '#6B5B47',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
  };

  const sectionStyle = {
    marginBottom: '60px',
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  };

  const sectionTitleStyle = {
    fontSize: '2rem',
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: '20px',
    textAlign: 'center',
  };

  const textStyle = {
    fontSize: '1.1rem',
    color: '#5A4A3A',
    lineHeight: '1.8',
    marginBottom: '20px',
  };

  const highlightStyle = {
    color: '#8B4513',
    fontWeight: '600',
  };

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '30px',
    marginTop: '40px',
  };

  const statCardStyle = {
    textAlign: 'center',
    padding: '30px',
    background: '#f8f5f0',
    borderRadius: '15px',
    border: '2px solid #e8dcc6',
  };

  const statNumberStyle = {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: '10px',
  };

  const statLabelStyle = {
    fontSize: '1rem',
    color: '#6B5B47',
    fontWeight: '500',
  };

  const buttonStyle = {
    background: '#8B4513',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '25px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '30px',
    transition: 'all 0.3s ease',
  };

  const backButtonStyle = {
    background: 'transparent',
    color: '#8B4513',
    border: '2px solid #8B4513',
    padding: '12px 25px',
    borderRadius: '25px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginRight: '20px',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>Our Mission</h1>
          <p style={subtitleStyle}>
            Empowering women entrepreneurs through food, fostering dreams, and building communities one recipe at a time.
          </p>
        </div>

        {/* Our Story */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Our Story</h2>
          <p style={textStyle}>
            What started as a <span style={highlightStyle}>small dream in a home kitchen</span> has grown into a movement 
            that empowers women across communities. We believe that every woman has the potential to be an entrepreneur, 
            and every home kitchen can become a source of income and independence.
          </p>
          <p style={textStyle}>
            Our journey began when we realized that many talented women were creating amazing food products but lacked 
            the platform, resources, and support to turn their passion into sustainable businesses. We decided to 
            change that.
          </p>
        </div>

        {/* Our Vision */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Our Vision</h2>
          <p style={textStyle}>
            To create a <span style={highlightStyle}>world where every woman can achieve financial independence</span> 
            through her culinary skills, where traditional recipes are preserved and celebrated, and where communities 
            thrive through mutual support and shared success.
          </p>
        </div>

        {/* Our Impact */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Our Impact</h2>
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>150+</div>
              <div style={statLabelStyle}>Women Entrepreneurs Supported</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>5000+</div>
              <div style={statLabelStyle}>Products Delivered</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>25+</div>
              <div style={statLabelStyle}>Cities Reached</div>
            </div>
            <div style={statCardStyle}>
              <div style={statNumberStyle}>₹2M+</div>
              <div style={statLabelStyle}>Income Generated</div>
            </div>
          </div>
        </div>

        {/* Our Values */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>What We Stand For</h2>
          <p style={textStyle}>
            <span style={highlightStyle}>Fair Wages:</span> We ensure every woman receives fair compensation for her work, 
            recognizing the value of her skills and time.
          </p>
          <p style={textStyle}>
            <span style={highlightStyle}>Flexible Work:</span> We understand that women often balance multiple responsibilities. 
            Our model allows for flexible working hours and remote collaboration.
          </p>
          <p style={textStyle}>
            <span style={highlightStyle}>Quality & Hygiene:</span> We maintain the highest standards of food safety and quality, 
            ensuring every product meets FSSAI guidelines.
          </p>
          <p style={textStyle}>
            <span style={highlightStyle}>Community Support:</span> We foster a supportive community where women can share 
            knowledge, learn from each other, and grow together.
          </p>
        </div>

        {/* Dreams & Aspirations */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Dreams We're Building</h2>
          <p style={textStyle}>
            Every woman in our collective has dreams - dreams of <span style={highlightStyle}>financial independence</span>, 
            dreams of <span style={highlightStyle}>providing better education for their children</span>, dreams of 
            <span style={highlightStyle}> starting their own businesses</span>, and dreams of <span style={highlightStyle}>being recognized for their talents</span>.
          </p>
          <p style={textStyle}>
            We're not just selling food products; we're <span style={highlightStyle}>building bridges to these dreams</span>. 
            Every order you place directly contributes to making these dreams a reality.
          </p>
        </div>

        {/* Call to Action */}
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <button 
            style={backButtonStyle}
            onClick={() => navigate('/')}
            onMouseOver={(e) => {
              e.target.style.background = '#8B4513';
              e.target.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#8B4513';
            }}
          >
            ← Back to Home
          </button>
          <button 
            style={buttonStyle}
            onClick={() => navigate('/products')}
            onMouseOver={(e) => {
              e.target.style.background = '#6B3410';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#8B4513';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Support Our Mission - Shop Now
          </button>
        </div>
      </div>
    </div>
  );
}
