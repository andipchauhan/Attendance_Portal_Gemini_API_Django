import { renderMarkdown } from '../utils/markdown';
import axios from '../utils/axios';
import { useAuth } from '../utils/AuthContext';
// Removed unused recharts imports
import React, { useEffect, useState } from 'react';
  // Download attendance report
  const handleDownloadReport = async (format) => {
    try {
      const res = await axios.get(`/attendance/report/?format=${format}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report.${format === 'xlsx' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Error downloading report');
    }
  };
// Student Attendance History Modal
function StudentHistoryModal({ student, history, onClose }) {
  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(30,41,59,0.85)',zIndex:2100,display:'flex',alignItems:'center',justifyContent:'center'}}>
      {/* <div style={{background:'#fff',borderRadius:14,padding:'2em 2.5em',minWidth:340,maxWidth:500,boxShadow:'0 4px 32px #0003',position:'relative'}}> */}
      <div style={{marginTop:'2em',border:'1px solid #ccc',padding:'1em',borderRadius:'8px',background:'#f9f9f9', position:'fixed', left:0, right:0, top:0, bottom:0, zIndex:1000, maxWidth:600, margin:'auto'}}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'#ef4444',color:'#fff',border:'none',borderRadius:6,padding:'0.4em 1em',fontWeight:'bold',fontSize:'1em'}}>Close</button>
        <h3 style={{textAlign:'center',color:'#2563eb',marginBottom:'1em'}}>Attendance History for {student.username}</h3>
        <div style={{maxHeight:550,overflowY:'auto'}}>
          <table style={{width:'100%',marginTop:'1em',fontSize:'1em'}}>
            <thead><tr><th>Date</th><th>Status</th><th>Timestamp</th></tr></thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={3} style={{textAlign:'center',color:'#888'}}>No attendance records.</td></tr>
              )}
              {history.map((a,i) => (
                <tr key={i} style={{background: a.status === 'Present' ? '#d1fae5' : '#fee2e2'}}>
                  <td>{a.date}</td>
                  <td style={{color: a.status === 'Present' ? '#16a34a' : '#dc2626', fontWeight: 'bold'}}>{a.status}</td>
                  <td>{a.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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

function TeacherPanel() {
  // ...existing code...
  const [showChatFullscreen, setShowChatFullscreen] = useState(false);
  const { user, setUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [message, setMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [studentPercent, setStudentPercent] = useState({});
  // GenAI chat state
  const [genaiInput, setGenaiInput] = useState("");
  const [genaiResponse, setGenaiResponse] = useState("");
  const [genaiLoading, setGenaiLoading] = useState(false);
  const [genaiError, setGenaiError] = useState("");
  const [genaiHistory, setGenaiHistory] = useState([]);
  const [genaiDate, setGenaiDate] = useState(() => new Date().toISOString().slice(0,10));
  const [genaiHistoryDates, setGenaiHistoryDates] = useState([]);
  const [attendanceMarked, setAttendanceMarked] = useState(false);


  // Fetch students, attendance, GenAI chat history dates, and check if attendance is already marked
  useEffect(() => {
    if (user?.class_assigned) {
      axios.get('/my_students/')
        .then(res => {
          setStudents(res.data.users || []);
          (res.data.users || []).forEach(s => {
            axios.get(`/attendance/history/?student_id=${s.id}`)
              .then(r => {
                const records = r.data.attendance || [];
                const total = records.length;
                const present = records.filter(a => a.status === 'Present').length;
                setStudentPercent(prev => ({ ...prev, [s.id]: total ? Math.round((present/total)*100) : 0 }));
              })
              .catch(() => setStudentPercent(prev => ({ ...prev, [s.id]: 0 }))); 
          });
        })
        .catch(() => setStudents([]));
  // Removed unused trends fetching
      // Check if attendance is already marked for today
      axios.get('/attendance/marked_today/')
        .then(res => setAttendanceMarked(res.data.marked))
        .catch(() => setAttendanceMarked(false));
    }
    // Fetch only available GenAI chat dates for dropdown
    axios.get('/genai/chat_dates/')
      .then(res => {
        const today = new Date().toISOString().slice(0,10);
        let dates = res.data.dates || [];
        if (!dates.includes(today)) {
          dates = [today, ...dates];
        }
        setGenaiHistoryDates(dates);
        setGenaiDate(today);
      })
      .catch(() => {
        const today = new Date().toISOString().slice(0,10);
        setGenaiHistoryDates([today]);
        setGenaiDate(today);
      });
  }, [user]);

  // Fetch GenAI chat history for selected date
  useEffect(() => {
    if (!user) return;
    axios.get(`/genai/ask/?date=${genaiDate}`)
      .then(res => setGenaiHistory(res.data.history || []))
      .catch(() => setGenaiHistory([]));
  }, [user, genaiDate, genaiResponse]);

  const handleChange = (id, status) => {
    setAttendance(a => ({ ...a, [id]: status }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const records = students.map(s => ({ student_id: s.id, status: attendance[s.id] || 'Absent' }));
    try {
      await axios.post('/attendance/mark/', { records });
      setMessage('Attendance marked!');
      setAttendanceMarked(true);
      // Refetch attendance percentage for each student
      students.forEach(s => {
        axios.get(`/attendance/history/?student_id=${s.id}`)
          .then(r => {
            const records = r.data.attendance || [];
            const total = records.length;
            const present = records.filter(a => a.status === 'Present').length;
            setStudentPercent(prev => ({ ...prev, [s.id]: total ? Math.round((present/total)*100) : 0 }));
          })
          .catch(() => setStudentPercent(prev => ({ ...prev, [s.id]: 0 })));
      });
    } catch {
      setMessage('Error marking attendance');
    }
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5em'}}>
        <h2 style={{margin:0,color:'#2563eb',fontWeight:'bold',fontSize:'2em',letterSpacing:'-1px'}}>Teacher Dashboard</h2>
        <div style={{display:'flex',gap:'1em',alignItems:'center'}}>
          <button onClick={()=>setShowProfile(true)} style={{background:'#2563eb',color:'#fff',border:'none',borderRadius:6,padding:'0.5em 1.2em',fontWeight:'bold',fontSize:'1em'}}>Edit Profile</button>
          <button onClick={()=>handleDownloadReport('pdf')} style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:6,padding:'0.5em 1.2em',fontWeight:'bold',fontSize:'1em'}}>Download PDF Report</button>
          <button onClick={()=>handleDownloadReport('xlsx')} style={{background:'#2563eb',color:'#fff',border:'none',borderRadius:6,padding:'0.5em 1.2em',fontWeight:'bold',fontSize:'1em'}}>Download XLSX Report</button>
        </div>
      </div>
      {showProfile && <ProfileModal user={user} onClose={()=>setShowProfile(false)} onUpdate={uname=>{if(uname)setUser(u=>({...u,username:uname}));}} />}
      {/* GenAI Chat Panel */}
  <div style={{margin:'2em 0',padding:'1em',border:'1px solid #e5e7eb',borderRadius:'8px',background:'#f3f4f6',position:'relative'}}>
        <h3 style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span>GenAI Chat (Ask Gemini 2.5 Flash)</span>
          <button type="button" style={{fontSize:'0.95em',padding:'0.4em 1em',background:'#2563eb',color:'#fff',border:'none',borderRadius:6,marginLeft:'1em'}} onClick={()=>setShowChatFullscreen(true)}>Full Screen</button>
        </h3>
      {showChatFullscreen && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(30,41,59,0.92)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'linear-gradient(120deg,#f1f5ff 0%,#e0e7ff 100%)',borderRadius:18,padding:'2.5em 2em',maxWidth:'1200px',width:'98vw',maxHeight:'96vh',overflowY:'auto',boxShadow:'0 12px 48px #0007',position:'relative',border:'1.5px solid #2563eb'}}>
            <button onClick={()=>setShowChatFullscreen(false)} style={{position:'absolute',top:44,right:44,background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:'0.6em 1.4em',fontWeight:'bold',fontSize:'1.1em',zIndex:10,boxShadow:'0 2px 8px #0002'}}>Close</button>
            <h2 style={{textAlign:'center',color:'#2563eb',marginBottom:'1.5em',fontWeight:'bold',fontSize:'2em',letterSpacing:'-1px'}}>GenAI Chat History ({genaiDate})</h2>
            <div style={{maxHeight: '70vh', overflowY: 'auto', background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:12,padding:'2em'}}>
              {genaiHistory.length === 0 && <div style={{color:'#888'}}>No chat history for this date.</div>}
              {genaiHistory.map((c,i) => (
                <div key={i} style={{marginBottom:'1.5em'}}>
                  <div style={{fontWeight:'bold',color:'#2563eb'}}>You <span style={{fontSize:'0.9em',color:'#888'}}>({c.timestamp})</span>:</div>
                  <div style={{marginBottom:'0.3em'}}>{c.prompt}</div>
                  <div style={{fontWeight:'bold',color:'#16a34a'}}>GenAI:</div>
                  <div style={{marginBottom:'0.5em'}} dangerouslySetInnerHTML={{__html: renderMarkdown(c.response)}}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        <div style={{marginBottom:'1em',display:'flex',alignItems:'center',gap:'1em'}}>
          <label htmlFor="genai-date">Chat Date:</label>
          <select id="genai-date" value={genaiDate} onChange={e=>setGenaiDate(e.target.value)}>
            {genaiHistoryDates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>
        <div style={{maxHeight:300,overflowY:'auto',background:'#fff',border:'1px solid #e5e7eb',borderRadius:6,padding:'1em',marginBottom:'1em'}}>
          {genaiHistory.length === 0 && <div style={{color:'#888'}}>No chat history for this date.</div>}
          {genaiHistory.map((c,i) => (
            <div key={i} style={{marginBottom:'1em'}}>
              <div style={{fontWeight:'bold',color:'#2563eb'}}>You <span style={{fontSize:'0.9em',color:'#888'}}>({c.timestamp})</span>:</div>
              <div style={{marginBottom:'0.3em'}}>{c.prompt}</div>
              <div style={{fontWeight:'bold',color:'#16a34a'}}>GenAI:</div>
              <div style={{marginBottom:'0.5em'}} dangerouslySetInnerHTML={{__html: renderMarkdown(c.response)}}></div>
            </div>
          ))}
        </div>
        <form onSubmit={async e => {
          e.preventDefault();
          setGenaiLoading(true);
          setGenaiError("");
          setGenaiResponse("");
          try {
            const res = await axios.post('/genai/ask/', { prompt: genaiInput });
            setGenaiResponse(res.data.response);
            setGenaiInput(""); // Clear input after answer
          } catch (err) {
            setGenaiError(err?.response?.data?.error || 'Error contacting GenAI');
          }
          setGenaiLoading(false);
        }} style={{display:'flex',gap:'1em',alignItems:'center',marginBottom:'1em'}}>
          <textarea
            value={genaiInput}
            onChange={e => setGenaiInput(e.target.value)}
            placeholder="Ask a question..."
            style={{flex:1,padding:'0.5em',borderRadius:'4px',border:'1px solid #ccc',minHeight:'3em',resize:'vertical'}}
            rows={3}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!genaiLoading && genaiInput.trim()) {
                  e.target.form.requestSubmit();
                }
              }
            }}
          />
          <button type="submit" disabled={genaiLoading || !genaiInput.trim()} style={{padding:'0.5em 1.2em',borderRadius:'4px',background:'#2563eb',color:'white',border:'none',fontWeight:'bold',cursor:genaiLoading?'not-allowed':'pointer'}}>Ask</button>
        </form>
        {genaiLoading && <div>Loading...</div>}
        {genaiError && <div style={{color:'#dc2626'}}>{genaiError}</div>}
        {genaiResponse && (
          <div style={{marginTop:'1em',background:'#fff',padding:'1em',borderRadius:'6px',border:'1px solid #e5e7eb'}}>
            <strong>GenAI:</strong>
            <div style={{marginTop:'0.5em'}} dangerouslySetInnerHTML={{__html: renderMarkdown(genaiResponse)}}></div>
          </div>
        )}
      </div>
      {/* Attendance Panel */}
      <h3>Mark Attendance for Class {user?.class_assigned}</h3>
      <form onSubmit={handleSubmit}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Roll</th>
              <th>Status</th>
              <th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const percent = studentPercent[s.id];
              const isLow = percent !== undefined && percent < 75;
              return (
                <tr key={s.id}>
                  <td>
                    <button type="button" style={{
                      background:'none',
                      border:'none',
                      color: isLow ? '#dc2626' : '#2563eb',
                      textDecoration:'underline',
                      cursor:'pointer',
                      fontWeight: isLow ? 'bold' : 'normal',
                      position:'relative'
                    }} onClick={() => {
                      setSelectedStudent(s);
                      axios.get(`/attendance/history/?student_id=${s.id}`)
                        .then(r => setStudentHistory(r.data.attendance || []))
                        .catch(() => setStudentHistory([]));
                    }}>
                      {s.username}
                      {isLow && <span title="Below 75%" style={{color:'#dc2626',marginLeft:6,fontWeight:'bold'}}>⚠️</span>}
                    </button>
                  </td>
                  <td>{s.roll_number}</td>
                  <td>
                    <button
                      type="button"
                      style={{
                        background: (attendance[s.id] || 'Absent') === 'Present' ? (attendanceMarked ? '#bbf7d0' : '#22c55e') : '#e5e7eb',
                        color: (attendance[s.id] || 'Absent') === 'Present' ? (attendanceMarked ? '#16a34a' : 'white') : '#111',
                        border: '1px solid #22c55e',
                        borderRadius: '5px',
                        marginRight: '0.5em',
                        padding: '0.3em 0.8em',
                        cursor: attendanceMarked ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        outline: 'none',
                        opacity: attendanceMarked ? 0.7 : 1,
                      }}
                      onClick={() => !attendanceMarked && handleChange(s.id, 'Present')}
                      disabled={attendanceMarked}
                    >Present</button>
                    <button
                      type="button"
                      style={{
                        background: (attendance[s.id] || 'Absent') === 'Absent' ? (attendanceMarked ? '#f3f4f6' : '#ef4444') : '#e5e7eb',
                        color: (attendance[s.id] || 'Absent') === 'Absent' ? (attendanceMarked ? '#dc2626' : 'white') : '#111',
                        border: '1px solid #ef4444',
                        borderRadius: '5px',
                        padding: '0.3em 0.8em',
                        cursor: attendanceMarked ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        outline: 'none',
                        opacity: attendanceMarked ? 0.7 : 1,
                      }}
                      onClick={() => !attendanceMarked && handleChange(s.id, 'Absent')}
                      disabled={attendanceMarked}
                    >Absent</button>
                  </td>
                  <td>{percent !== undefined ? percent + '%' : '...'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="submit" style={{marginTop:'1em', opacity: attendanceMarked ? 0.7 : 1, cursor: attendanceMarked ? 'not-allowed' : 'pointer',}} disabled={attendanceMarked}>Submit Attendance</button>
      </form>
      {message && <div>{message}</div>}
      {selectedStudent && (
        <StudentHistoryModal
          student={selectedStudent}
          history={studentHistory}
          onClose={() => { setSelectedStudent(null); setStudentHistory([]); }}
        />
      )}
    </div>
  );
}
export default TeacherPanel;
