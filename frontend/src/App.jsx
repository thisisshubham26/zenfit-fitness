import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { 
    Zap, Calculator, Scale, TrendingUp, 
    Dumbbell, Calendar as CalendarIcon, Apple,
    ChevronLeft, ChevronRight, User, LogOut, ShieldCheck
} from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:5001/api' 
    : '/api';

const fitnessData = {
    foodItems: [
        { name: "Apple", calories: 52, protein: 0.3, carbs: 14, fats: 0.2 },
        { name: "Banana", calories: 89, protein: 1.1, carbs: 23, fats: 0.3 },
        { name: "Chicken Breast (Cooked)", calories: 165, protein: 31, carbs: 0, fats: 3.6 },
        { name: "Egg (Large)", calories: 155, protein: 13, carbs: 1.1, fats: 11 },
        { name: "Oats", calories: 389, protein: 16.9, carbs: 66, fats: 6.9 },
        { name: "Peanut Butter", calories: 588, protein: 25, carbs: 20, fats: 50 },
        { name: "Greek Yogurt", calories: 59, protein: 10, carbs: 3.6, fats: 0.4 },
        { name: "Broccoli", calories: 34, protein: 2.8, carbs: 7, fats: 0.4 },
        { name: "Rice (White, Cooked)", calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
        { name: "Almonds", calories: 579, protein: 21, carbs: 22, fats: 49 }
    ],
    exerciseSplits: {
        weightloss: {
            title: "Fat Loss Focus (High Intensity)",
            description: "Burn maximum calories while maintaining muscle mass.",
            workouts: ["Monday: Full Body Strength + 15m HIIT", "Tuesday: Active Recovery (Walking/Yoga)", "Wednesday: Upper Body Push + 20m Cardio", "Thursday: Lower Body + Core focus", "Friday: Upper Body Pull + 15m HIIT", "Saturday: Long duration steady state cardio", "Sunday: Rest Day"]
        },
        weightgain: {
            title: "Mass Builder (Hypertrophy)",
            description: "Maximum stimulus for muscle growth with progressive overload.",
            workouts: ["Monday: Chest & Triceps (Heavy)", "Tuesday: Back & Biceps (Heavy)", "Wednesday: Rest or Light Cardio", "Thursday: Shoulders & Abs", "Friday: Legs & Glutes (Focus on Squats)", "Saturday: Full Body (Hypertrophy range)", "Sunday: Rest & High Protein Intake"]
        },
        maintenance: {
            title: "Balanced Maintenance",
            description: "Sustainability and overall health maintenance.",
            workouts: ["Monday: Upper Body Push/Pull", "Tuesday: Cardio (30 mins)", "Wednesday: Lower Body & Core", "Thursday: Rest", "Friday: Upper Body + Mobility", "Saturday: Outdoor Activity / Sport", "Sunday: Rest"]
        }
    }
};

function App() {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [authMode, setAuthMode] = useState('login');
    const [weightHistory, setWeightHistory] = useState([]);
    const [newWeight, setNewWeight] = useState('');
    const [consistency, setConsistency] = useState({});
    const [goal, setGoal] = useState('weightloss');
    const [calorieResult, setCalorieResult] = useState(null);
    const [bmi, setBmi] = useState({ value: '--', status: 'Enter data', rotation: -90 });
    const [viewDate, setViewDate] = useState(new Date());
    const [adminData, setAdminData] = useState(null);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['x-auth-token'] = token;
            fetchData();
            if (user?.role === 'admin') fetchAdminData();
        } else {
            delete axios.defaults.headers.common['x-auth-token'];
        }
    }, [token]);

    const fetchData = async () => {
        try {
            const [wRes, cRes] = await Promise.all([
                axios.get(`${API_BASE}/weight`),
                axios.get(`${API_BASE}/consistency`)
            ]);
            setWeightHistory(wRes.data);
            const cMap = {};
            cRes.data.forEach(d => cMap[d.date] = d.status);
            setConsistency(cMap);
        } catch (err) { 
            console.error("Fetch Error:", err);
            if (err.response?.status === 401) logout();
        }
    };

    const fetchAdminData = async () => {
        try {
            const res = await axios.get(`${API_BASE}/admin/members`);
            setAdminData(res.data);
        } catch (err) { console.error("Admin Fetch Error:", err); }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const email = data.get('email');
        const password = data.get('password');
        const role = data.get('role') || 'member';

        try {
            if (authMode === 'signup') {
                await axios.post(`${API_BASE}/register`, { email, password, role });
                setAuthMode('login');
                alert('Success! Please login.');
            } else {
                const res = await axios.post(`${API_BASE}/login`, { email, password });
                setToken(res.data.token);
                setUser(res.data.user);
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
            }
        } catch (err) { alert(err.response?.data?.msg || 'Auth failed'); }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const toggleConsistency = async (day) => {
        const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const status = !consistency[dateKey];
        await axios.post(`${API_BASE}/consistency`, { date: dateKey, status });
        fetchData();
    };

    if (!token) {
        return (
            <div className="dark-theme auth-wrapper">
                <div className="card glass auth-card" style={{zIndex:1000}}>
                    <div className="logo" style={{justifyContent:'center', marginBottom:'1.5rem'}}><Zap className="logo-icon" /> <span>ZenFit</span></div>
                    <h2 style={{textAlign:'center', marginBottom:'1.5rem'}}>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                    <form onSubmit={handleAuth}>
                        <div className="input-field"><label>Email</label><input name="email" type="email" placeholder="example@fit.com" required /></div>
                        <div className="input-field"><label>Password</label><input name="password" type="password" placeholder="••••••••" required /></div>
                        {authMode === 'signup' && (
                            <div className="input-field"><label>Join as</label><select name="role"><option value="member">Member</option><option value="admin">Admin</option></select></div>
                        )}
                        <button className="btn-primary" style={{marginTop:'1rem'}}>{authMode === 'login' ? 'Sign In' : 'Sign Up'}</button>
                    </form>
                    <p style={{marginTop:'1.5rem', textAlign:'center', fontSize:'0.9rem'}}>{authMode === 'login' ? 'New here? ' : 'Have account? '} <span style={{color:'var(--accent-color)', cursor:'pointer', fontWeight:'600'}} onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>{authMode === 'login' ? 'Create one' : 'Sign in'}</span></p>
                </div>
            </div>
        );
    }

    return (
        <div className="dark-theme">
            <nav className="navbar"><div className="nav-container"><div className="logo"><Zap className="logo-icon" /> <span>ZenFit</span></div><ul className="nav-links"><li><a href="#calculators">Calculators</a></li><li><a href="#stats">Stats</a></li><li><a href="#splits">Workouts</a></li><li><a href="#nutrition">Nutrition</a></li></ul><div className="nav-auth"><div className="user-badge">{user.role === 'admin' ? <ShieldCheck size={16} color="#f59e0b" /> : <User size={16} />}<span>{user.email}</span></div><button onClick={logout} className="btn-secondary" style={{padding:'5px 10px'}}><LogOut size={16}/></button></div></div></nav>
            <main className="container">
                {user.role === 'admin' && adminData && (
                    <section className="card glass admin-panel" style={{border:'1px solid #f59e0b', marginBottom:'2rem'}}><div className="card-header"><ShieldCheck color="#f59e0b" /> <h2>Admin: User Progress View</h2></div><div className="table-container"><table className="food-table"><thead><tr><th>User</th><th>Logs</th><th>Latest</th><th>Date</th></tr></thead><tbody>{adminData.allUsers.map(m => { const w = adminData.allWeights.filter(x => x.userId === m._id || x.userId === m.id); const l = w[w.length-1]; return <tr key={m.id||m._id}><td>{m.email}</td><td>{w.length}</td><td>{l?`${l.weight}kg`:'-'}</td><td>{l?l.date:'-'}</td></tr>})}</tbody></table></div></section>
                )}
                <header className="hero"><h1>Elevate Your <span>Fitness</span></h1><p>Welcome back, {user.email}.</p></header>
                <div className="grid grid-2">
                    <section id="calculators" className="card glass">
                        <div className="card-header"><Calculator /> <h2>Calorie Calculator</h2></div>
                        <div className="card-body"><form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.target); const w = parseFloat(d.get('weight')); const h = parseFloat(d.get('height')); const a = parseInt(d.get('age')); const act = parseFloat(d.get('activity')); const g = d.get('gender'); let bmr = g === 'male' ? 10*w + 6.25*h - 5*a + 5 : 10*w + 6.25*h - 5*a - 161; setCalorieResult(Math.round(bmr*act)); const bmiV = (w/((h/100)**2)).toFixed(1); setBmi({ value: bmiV, status: bmiV<18.5?"Underweight":bmiV<25?"Normal":bmiV<30?"Overweight":"Obese", rotation: bmiV<18.5?-70:bmiV<25?-30:bmiV<30?30:70 }); }}>
                            <div className="radio-group" style={{marginBottom:'1rem'}}><label><input type="radio" name="gender" value="male" defaultChecked /> M</label><label><input type="radio" name="gender" value="female" /> F</label></div>
                            <div className="grid grid-2"><div className="input-field"><label>Weight</label><input name="weight" type="number" required /></div><div className="input-field"><label>Height</label><input name="height" type="number" required /></div></div>
                            <div className="grid grid-2"><div className="input-field"><label>Age</label><input name="age" type="number" required /></div><div className="input-field"><label>Activity</label><select name="activity" defaultValue="1.2"><option value="1.2">Sedentary</option><option value="1.55">Moderate</option><option value="1.9">Elite</option></select></div></div>
                            <button className="btn-primary">Calculate</button></form>{calorieResult && <div className="result-display" style={{marginTop:'1rem'}}><p>Maintenance: <span className="highlight">{calorieResult} kcal</span></p></div>}</div>
                    </section>
                    <section id="bmi" className="card glass">
                        <div className="card-header"><Scale /> <h2>BMI Meter</h2></div>
                        <div className="card-body"><div className="bmi-display"><div className="gauge"><div className="gauge-bar"></div><div className="gauge-needle" style={{transform: `translateX(-50%) rotate(${bmi.rotation}deg)`}}></div></div><div className="bmi-info"><h3>{bmi.value}</h3><p>{bmi.status}</p></div></div><div className="bmi-legend"><span className="legend-item under">Under</span><span className="legend-item normal">Normal</span><span className="legend-item over">Over</span><span className="legend-item obese">Obese</span></div></div>
                    </section>
                </div>
                <section id="stats" className="card glass" style={{marginTop:'2rem'}}>
                    <div className="card-header"><TrendingUp /> <h2>Weight Progress</h2><div style={{display:'flex', gap:'10px', marginLeft:'auto'}}><input value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="kg" style={{width:'80px'}}/><button onClick={async () => { if (!newWeight) return; await axios.post(`${API_BASE}/weight`, { date: new Date().toISOString().split('T')[0], weight: parseFloat(newWeight) }); setNewWeight(''); fetchData(); }} className="btn-secondary">Add</button></div></div>
                    <div className="card-body" style={{height:'300px'}}><Line data={{ labels: weightHistory.length>0 ? weightHistory.map(w=>w.date) : ['No Data'], datasets: [{ label: 'kg', data: weightHistory.map(w=>w.weight), borderColor: '#3b82f6', tension: 0.4, fill: true }] }} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                </section>
                <div className="grid grid-2" style={{marginTop:'2rem'}}>
                    <section id="splits" className="card glass"><div className="card-header"><Dumbbell /> <h2>Workouts</h2></div><div className="card-body"><select value={goal} onChange={e=>setGoal(e.target.value)} className="input-field"><option value="weightloss">Loss</option><option value="weightgain">Gain</option><option value="maintenance">Main</option></select><div className="split-content"><h3>{fitnessData.exerciseSplits[goal].title}</h3><ul>{fitnessData.exerciseSplits[goal].workouts.map((w,i)=><li key={i}>{w}</li>)}</ul></div></div></section>
                    <section id="tracker" className="card glass"><div className="card-header"><CalendarIcon /> <h2>Consistency</h2><div style={{display:'flex', gap:'10px', marginLeft:'auto'}}><button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1))} className="btn-secondary"><ChevronLeft size={16}/></button><span>{viewDate.toLocaleString('default', { month: 'short', year: 'numeric' })}</span><button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1))} className="btn-secondary"><ChevronRight size={16}/></button></div></div><div className="card-body"><div className="calendar-grid">{[...Array(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0).getDate())].map((_, i) => { const d=i+1; const k=`${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; return <div key={d} className={`calendar-day ${consistency[k] ? 'active' : ''}`} onClick={() => toggleConsistency(d)}>{d}</div>; })}</div></div></section>
                </div>
                <section id="nutrition" className="card glass" style={{marginTop:'3rem', marginBottom:'2rem'}}>
                    <div className="card-header"><Apple /> <h2>Food Calorie Table (Per 100g)</h2></div>
                    <div className="card-body">
                        <div className="table-container">
                            <table className="food-table">
                                <thead><tr><th>Food Item</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th></tr></thead>
                                <tbody>
                                    {fitnessData.foodItems.map((f, i) => (
                                        <tr key={i}><td>{f.name}</td><td>{f.calories} kcal</td><td>{f.protein}g</td><td>{f.carbs}g</td><td>{f.fats}g</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
export default App;
