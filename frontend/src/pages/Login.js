import React from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../utils/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState('');

  const onSubmit = async (data) => {
    setError('');
    try {
      await login(data.username, data.password);
      setError('Login successful!');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect username or password');
    }
  };

  return (
    <div className="login-container" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#f3f4f6'}}>
      <div style={{background:'#fff',padding:'2em 2.5em',borderRadius:'12px',boxShadow:'0 2px 16px #0001',minWidth:340}}>
        <h1 style={{textAlign:'center',color:'#2563eb',marginBottom:'0.5em',fontWeight:'bold',fontSize:'2.2em',letterSpacing:'-1px'}}>Attendance Portal</h1>
        <h2 style={{textAlign:'center',color:'#334155',marginBottom:'1.5em',fontWeight:'500'}}>Login</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{marginBottom:'1em'}}>
            <label style={{display:'block',marginBottom:4}}>Username</label>
            <input {...register('username', { required: true })} style={{width:'100%',padding:'0.6em',borderRadius:6,border:'1px solid #cbd5e1'}} />
            {errors.username && <span style={{color:'#dc2626'}}>Username required</span>}
          </div>
          <div style={{marginBottom:'1em'}}>
            <label style={{display:'block',marginBottom:4}}>Password</label>
            <input type="password" {...register('password', { required: true })} style={{width:'100%',padding:'0.6em',borderRadius:6,border:'1px solid #cbd5e1'}} />
            {errors.password && <span style={{color:'#dc2626'}}>Password required</span>}
          </div>
          {error && <div className={error.includes('success') || error.includes('successful') ? 'success' : 'error'} style={{marginBottom:'1em',color:error.includes('success')?'#16a34a':'#dc2626',textAlign:'center'}}>{error}</div>}
          <button type="submit" style={{width:'100%',padding:'0.7em',borderRadius:6,background:'#2563eb',color:'#fff',fontWeight:'bold',fontSize:'1.1em',border:'none',marginTop:'0.5em',cursor:'pointer'}}>Login</button>
        </form>
        <div style={{ marginTop: '1.5em',textAlign:'center',color:'#64748b' }}>
          <span>Don't have an account? <Link to="/register" style={{color:'#2563eb',fontWeight:'bold'}}>Register</Link></span>
        </div>
      </div>
    </div>
  );
}

export default Login;
