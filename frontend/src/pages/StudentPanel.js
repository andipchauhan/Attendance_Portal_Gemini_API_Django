import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../utils/AuthContext';

// Profile update modal
function ProfileModal({ user, onClose, onUpdate }) {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(30,41,59,0.85)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:14,padding:'2em 2.5em',minWidth:340,boxShadow:'0 4px 32px #0003',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'#ef4444',color:'#fff',border:'none',borderRadius:6,padding:'0.4em 1em',fontWeight:'bold',fontSize:'1em'}}>Close</button>
        <h2 style={{textAlign:'center',color:'#2563eb',marginBottom:'1em'}}>Update Profile</h2>
        <form onSubmit={async e => {
          e.preventDefault();
          setLoading(true);
          setMessage('');
          try {
            await axios.post('/profile/update/', { username, password });
            setMessage('Profile updated!');
            onUpdate && onUpdate(username);
          } catch (err) {
            setMessage(err?.response?.data?.error || 'Error updating profile');
          }
          setLoading(false);
        }}>
          <div style={{marginBottom:'1em'}}>
            <label>Username</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} style={{width:'100%',padding:'0.6em',borderRadius:6,border:'1px solid #cbd5e1'}} />
          </div>
          <div style={{marginBottom:'1em'}}>
            <label>New Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:'0.6em',borderRadius:6,border:'1px solid #cbd5e1'}} />
          </div>
          {message && <div style={{marginBottom:'1em',color:message.includes('updated')?'#16a34a':'#dc2626',textAlign:'center'}}>{message}</div>}
          <button type="submit" style={{width:'100%',padding:'0.7em',borderRadius:6,background:'#2563eb',color:'#fff',fontWeight:'bold',fontSize:'1.1em',border:'none',marginTop:'0.5em',cursor:loading?'not-allowed':'pointer'}} disabled={loading}>Update</button>
        </form>
      </div>
    </div>
  );
}

function StudentPanel() {
  const { user, setUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [percent, setPercent] = useState(null);
  useEffect(() => {
    axios.get('/attendance/history/')
      .then(res => {
        setAttendance(res.data.attendance);
        const records = res.data.attendance || [];
        const total = records.length;
        const present = records.filter(a => a.status === 'Present').length;
        setPercent(total ? Math.round((present/total)*100) : 0);
      })
      .catch(() => { setAttendance([]); setPercent(null); });
  }, []);
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5em'}}>
        <h3 style={{margin:0}}>My Attendance History</h3>
        <button onClick={()=>setShowProfile(true)} style={{background:'#2563eb',color:'#fff',border:'none',borderRadius:6,padding:'0.5em 1.2em',fontWeight:'bold',fontSize:'1em'}}>Edit Profile</button>
      </div>
      {showProfile && <ProfileModal user={user} onClose={()=>setShowProfile(false)} onUpdate={uname=>{if(uname)setUser(u=>({...u,username:uname}));}} />}
      {percent !== null && percent < 75 && (
        <div style={{color:'#dc2626',fontWeight:'bold',marginBottom:'1em'}}>Warning: Your attendance is below 75% ({percent}%)</div>
      )}
      <table><thead><tr><th>Date</th><th>Status</th><th>Timestamp</th></tr></thead><tbody>
        {attendance.map((a, i) => (
          <tr key={i} style={{background: a.status === 'Present' ? '#d1fae5' : '#fee2e2'}}>
            <td>{a.date}</td>
            <td style={{color: a.status === 'Present' ? '#16a34a' : '#dc2626', fontWeight: 'bold'}}>{a.status}</td>
            <td>{a.timestamp}</td>
          </tr>
        ))}
      </tbody></table>
    </div>
  );
}
export default StudentPanel;
