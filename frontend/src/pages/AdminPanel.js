import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';

function AdminPanel() {
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('pending');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [studentPercent, setStudentPercent] = useState({});
  // Fetch attendance percentage for all students
  useEffect(() => {
    if (students.length > 0) {
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
    }
  }, [students]);

  const fetchPendingTeachers = async () => {
    try {
      const res = await axios.get('/users/?role=Teacher');
      setPendingTeachers(res.data.users.filter(u => !u.is_approved && u.role === 'Teacher'));
    } catch (e) { setError('Failed to load pending teachers'); }
  };
  const fetchPendingStudents = async () => {
    try {
      const res = await axios.get('/users/?role=Student');
      setPendingStudents(res.data.users.filter(u => !u.is_approved && u.role === 'Student'));
    } catch (e) { setError('Failed to load pending students'); }
  };
  const fetchTeachers = async () => {
    try {
      const res = await axios.get('/users/?role=Teacher');
      setTeachers(res.data.users.filter(u => u.is_approved && u.role === 'Teacher'));
    } catch (e) { setError('Failed to load teachers'); }
  };
  const fetchStudents = async () => {
    try {
      const res = await axios.get('/users/?role=Student');
      setStudents(res.data.users.filter(u => u.is_approved && u.role === 'Student'));
    } catch (e) { setError('Failed to load students'); }
  };
  useEffect(() => { fetchPendingTeachers(); fetchPendingStudents(); fetchTeachers(); fetchStudents(); }, []);

  const handleApprove = async (user_id, approve) => {
    try {
      await axios.post('/approve_user/', { user_id, approve });
      setSuccess(approve ? 'User approved' : 'User rejected');
      fetchPendingTeachers(); fetchPendingStudents(); fetchTeachers(); fetchStudents();
    } catch (e) { setError('Approval failed'); }
  };

  const handleDelete = async (user_id) => {
    try {
      await axios.post('/delete_user/', { user_id });
      setSuccess('User deleted');
      fetchPendingTeachers(); fetchPendingStudents(); fetchTeachers(); fetchStudents();
    } catch (e) { setError('Delete failed'); }
  };

  // Group teachers/students by class
  const groupByClass = (users) => {
    const grouped = {};
    users.forEach(u => {
      if (!grouped[u.class_assigned]) grouped[u.class_assigned] = [];
      grouped[u.class_assigned].push(u);
    });
    return grouped;
  };

  return (
    <div className="admin-panel matte-bg">
      <div className="admin-tabs">
        <button className={tab==='pending' ? 'active' : ''} onClick={()=>setTab('pending')}>Pending Requests</button>
        <button className={tab==='teachers' ? 'active' : ''} onClick={()=>setTab('teachers')}>Teachers</button>
        <button className={tab==='students' ? 'active' : ''} onClick={()=>setTab('students')}>Students</button>
      </div>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      {tab === 'pending' && (
        <>
          <h3>Pending Teacher Requests</h3>
          {pendingTeachers.length === 0 ? <div>No pending teachers</div> : (
            <table><thead><tr><th>Username</th><th>Class</th><th>Action</th></tr></thead><tbody>
              {pendingTeachers.map(u => (
                <tr key={u.id}>
                  <td>{u.username}</td><td>{u.class_assigned}</td>
                  <td style={{whiteSpace:'nowrap'}}>
                    <button onClick={() => handleApprove(u.id, true)}>Approve</button>
                    {/* <button onClick={() => handleApprove(u.id, false)} style={{marginLeft:'0.5em'}}>Reject</button> */}
                    <button onClick={() => handleDelete(u.id)} style={{marginLeft:'0.5em',background:'#dc2626'}}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody></table>
          )}
          <h3 style={{marginTop:'2em'}}>Pending Student Requests</h3>
          {pendingStudents.length === 0 ? <div>No pending students</div> : (
            <table><thead><tr><th>Username</th><th>Class</th><th>Roll</th><th>Action</th></tr></thead><tbody>
              {pendingStudents.map(u => (
                <tr key={u.id}>
                  <td>{u.username}</td><td>{u.class_assigned}</td><td>{u.roll_number}</td>
                  <td style={{whiteSpace:'nowrap'}}>
                    <button onClick={() => handleApprove(u.id, true)}>Approve</button>
                    <button onClick={() => handleApprove(u.id, false)} style={{marginLeft:'0.5em'}}>Reject</button>
                    <button onClick={() => handleDelete(u.id)} style={{marginLeft:'0.5em',background:'#dc2626'}}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody></table>
          )}
        </>
      )}
      {tab === 'teachers' && (
        <>
          <h3>Teachers (Classwise)</h3>
          {Object.entries(groupByClass(teachers)).map(([cls, tlist]) => (
            <div key={cls} style={{marginBottom:'1.5em'}}>
              <strong>Class {cls}</strong>
              <table><thead><tr><th>Username</th><th>Action</th></tr></thead><tbody>
                {tlist.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td><button onClick={() => handleDelete(u.id)} style={{background:'#dc2626'}}>Remove</button></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          ))}
        </>
      )}
      {tab === 'students' && (
        <>
          <h3>Students (Classwise)</h3>
          {Object.entries(groupByClass(students)).map(([cls, slist]) => (
            <div key={cls} style={{marginBottom:'1.5em'}}>
              <strong>Class {cls}</strong>
              <table><thead><tr><th>Username</th><th>Roll</th><th>Action</th></tr></thead><tbody>
                {slist.map(u => {
                  const percent = studentPercent[u.id];
                  const isLow = percent !== undefined && percent < 75;
                  return (
                    <tr key={u.id}>
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
                          setSelectedStudent(u);
                          axios.get(`/attendance/history/?student_id=${u.id}`)
                            .then(r => setStudentHistory(r.data.attendance || []))
                            .catch(() => setStudentHistory([]));
                        }}>
                          {u.username}
                          {isLow && <span title="Below 75%" style={{color:'#dc2626',marginLeft:6,fontWeight:'bold'}}>⚠️</span>}
                        </button>
                      </td>
                      <td>{u.roll_number}</td>
                      <td><button onClick={() => handleDelete(u.id)} style={{background:'#dc2626'}}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
          ))}
        </>
      )}
      {selectedStudent && (
        <div style={{marginTop:'2em',border:'1px solid #ccc',padding:'1em',borderRadius:'8px',background:'#f9f9f9', position:'fixed', left:0, right:0, top:0, bottom:0, zIndex:1000, maxWidth:600, margin:'auto'}}>
          <h4>Attendance History for {selectedStudent.username}</h4>
          <button style={{float:'right'}} onClick={()=>{setSelectedStudent(null);setStudentHistory([]);}}>Close</button>
          <table style={{marginTop:'1em', width:'100%'}}><thead><tr><th>Date</th><th>Status</th><th>Timestamp</th></tr></thead><tbody>
            {studentHistory.map((a,i) => (
              <tr key={i} style={{background: a.status === 'Present' ? '#d1fae5' : '#fee2e2'}}>
                <td>{a.date}</td>
                <td style={{color: a.status === 'Present' ? '#16a34a' : '#dc2626', fontWeight: 'bold'}}>{a.status}</td>
                <td>{a.timestamp}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}
    </div>
  );
}
export default AdminPanel;
