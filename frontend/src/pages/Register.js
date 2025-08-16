import React from 'react';
import { useForm } from 'react-hook-form';
import axios from '../utils/axios';
import { useNavigate } from 'react-router-dom';

function Register() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setError(''); setSuccess('');
    try {
      await axios.post('/register/', data);
      setSuccess('Registration successful! Await admin approval.');
      setError('');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setSuccess('');
    }
  };

  return (
    <div className="register-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Username</label>
          <input {...register('username', { required: true })} />
          {errors.username && <span>Username required</span>}
        </div>
        <div>
          <label>Password</label>
          <input type="password" {...register('password', { required: true, minLength: 6 })} />
          {errors.password && <span>Password min 6 chars</span>}
        </div>
        <div>
          <label>Role</label>
          <select {...register('role', { required: true })}>
            <option value="">Select</option>
            <option value="Teacher">Teacher</option>
            <option value="Student">Student</option>
          </select>
          {errors.role && <span>Role required</span>}
        </div>
        <div>
          <label>Class (1-12)</label>
          <input type="number" {...register('class_assigned', { required: true, min: 1, max: 12 })} />
          {errors.class_assigned && <span>Class 1-12 required</span>}
        </div>
        {watch('role') === 'Student' && (
          <div>
            <label>Roll Number</label>
            <input type="number" {...register('roll_number', { required: true })} />
            {errors.roll_number && <span>Roll number required</span>}
          </div>
        )}
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <button type="submit">Register</button>
      </form>
      <div style={{ marginTop: '1em' }}>
        <span>Already have an account? <a href="/login">Login</a></span>
      </div>
    </div>
  );
}

export default Register;
