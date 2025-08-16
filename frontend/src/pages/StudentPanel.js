import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';

function StudentPanel() {
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
      <h3>My Attendance History</h3>
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
