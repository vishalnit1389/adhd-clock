import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Coffee, BookOpen, Briefcase, Dumbbell, Bed, Utensils, ShoppingCart, Music, Plane, Heart, BrainCircuit, Tv, Gamepad2, Sun, ArrowLeft } from 'lucide-react';

// --- Icon Component ---
// A simple component to render the correct Lucide icon based on its name.
const Icon = ({ name, ...props }) => {
  const icons = {
    Coffee, BookOpen, Briefcase, Dumbbell, Bed, Utensils, ShoppingCart, Music, Plane, Heart, BrainCircuit, Tv, Gamepad2, Sun,
  };
  const LucideIcon = icons[name];
  return LucideIcon ? <LucideIcon {...props} /> : null;
};

// --- Available Icons List ---
// This list is used for the dropdown in the task form.
const availableIcons = [
  'Coffee', 'BookOpen', 'Briefcase', 'Dumbbell', 'Bed', 'Utensils', 'ShoppingCart', 'Music', 'Plane', 'Heart', 'BrainCircuit', 'Tv', 'Gamepad2', 'Sun'
];

// --- Helper Functions ---
// Converts "HH:MM" string to total minutes from midnight.
const timeToMinutes = (timeStr) => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Converts an angle in degrees to SVG coordinates.
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  };
};

// Describes an SVG arc path.
const describeArc = (x, y, radius, startAngle, endAngle) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  // Correct the largeArcFlag logic for a full circle
  const arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, arcSweep, 0, end.x, end.y
  ].join(" ");
};


// --- Focus View Component ---
const FocusView = ({ task, currentTime, onExit }) => {
  const size = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.6, 500);
  const strokeWidth = 40;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  
  const progress = useMemo(() => {
    if (!task) return { remainingPercentage: 100, timeLeft: 0 };
    const start = timeToMinutes(task.startTime);
    const end = timeToMinutes(task.endTime);
    const duration = end - start;
    if (duration <= 0) return { remainingPercentage: 100, timeLeft: 0 };

    const nowInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
    const elapsed = nowInMinutes - start;
    const elapsedPercentage = Math.min(Math.max((elapsed / duration) * 100, 0), 100);
    return {
      remainingPercentage: 100 - elapsedPercentage,
      timeLeft: Math.ceil(duration - elapsed),
    };
  }, [task, currentTime]);
  
  const endAngle = progress.remainingPercentage / 100 * 359.99; // 359.99 to avoid SVG closing the circle

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
       <button onClick={onExit} className="absolute top-4 left-4 flex items-center gap-2 text-gray-600 hover:text-indigo-600">
           <ArrowLeft size={20}/> Back to dashboard
       </button>
       <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">{task.name}</h1>
            <p className="text-xl text-gray-500">{task.startTime} - {task.endTime}</p>
       </div>
       <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background full arc (greyed out) */}
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
                {/* Foreground remaining time arc */}
                <path
                  d={describeArc(center, center, radius, 0, endAngle)}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                 />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                 <Icon name={task.icon} className="text-indigo-500" size={60} />
                 <p className="font-bold text-6xl text-indigo-600 mt-4">{Math.round(progress.remainingPercentage)}%</p>
                 <p className="text-lg text-gray-500">{progress.timeLeft} minutes remaining</p>
            </div>
       </div>
    </div>
  );
};


// --- Clock Component ---
const Clock = ({ tasks, currentTime, onFocusTask }) => {
  const size = 320;
  const center = size / 2;
  const maxStroke = 45; // Max possible thickness for an arc
  const trackRadius = center - (maxStroke / 2) - 5; // Centerline for all arcs

  const tasksForCurrentHour = useMemo(() => {
    const currentHour = currentTime.getHours();
    return tasks.filter(task => {
      const taskStartHour = parseInt(task.startTime.split(':')[0], 10);
      return taskStartHour === currentHour;
    }).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [tasks, currentTime]);

  const totalTaskMinutes = useMemo(() => {
    return tasksForCurrentHour.reduce((sum, task) => {
        const start = timeToMinutes(task.startTime);
        const end = timeToMinutes(task.endTime);
        return sum + (end - start);
    }, 0);
  }, [tasksForCurrentHour]);

  const dynamicStrokeWidth = useMemo(() => {
    const minStroke = 15; // Min thickness for a packed hour
    if (totalTaskMinutes <= 0) return minStroke;
    const percentage = Math.min(totalTaskMinutes / 60, 1.0);
    return maxStroke - (percentage * (maxStroke - minStroke));
  }, [totalTaskMinutes]);
  
  const currentMinuteInHour = currentTime.getMinutes() + currentTime.getSeconds() / 60;
  const timeHandAngle = (currentMinuteInHour / 60) * 360;

  const activeTask = useMemo(() => {
      const nowInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      return tasks.find(task => {
          const start = timeToMinutes(task.startTime);
          const end = timeToMinutes(task.endTime);
          return nowInMinutes >= start && nowInMinutes < end;
      });
  }, [tasks, currentTime]);

  const taskProgress = useMemo(() => {
    if (!activeTask) return null;
    const start = timeToMinutes(activeTask.startTime);
    const end = timeToMinutes(activeTask.endTime);
    const duration = end - start;
    if(duration <= 0) return null;

    const nowInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
    const elapsed = nowInMinutes - start;
    const remainingPercentage = 100 - ((elapsed / duration) * 100);
    
    return {
        name: activeTask.name,
        remainingPercentage: remainingPercentage.toFixed(0),
        timeLeft: Math.round(duration - elapsed)
    };
  }, [activeTask, currentTime]);

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={trackRadius} fill="none" stroke="#e0e0e0" strokeWidth={15} />
          {tasksForCurrentHour.map((task, index) => {
            const startMinute = parseInt(task.startTime.split(':')[1], 10);
            const endMinute = parseInt(task.endTime.split(':')[1], 10);
            const startAngle = (startMinute / 60) * 360;
            const endAngle = (endMinute / 60) * 360;
            const colors = ['#818cf8', '#fb923c', '#4ade80', '#f87171', '#60a5fa', '#a78bfa'];
            const color = colors[index % colors.length];
            const iconAngle = startAngle + (endAngle - startAngle) / 2;
            const iconPos = polarToCartesian(center, center, trackRadius, iconAngle);
            
            return (
              <g key={task.id}>
                <path
                  d={describeArc(center, center, trackRadius, startAngle, endAngle)}
                  fill="none"
                  stroke={color}
                  strokeWidth={dynamicStrokeWidth}
                />
                <foreignObject x={iconPos.x - 12} y={iconPos.y - 12} width="24" height="24">
                   <Icon name={task.icon} className="text-white" size={20} />
                </foreignObject>
              </g>
            );
          })}
           <line x1={center} y1={center} x2={polarToCartesian(center, center, trackRadius - (maxStroke / 2) - 5, timeHandAngle).x} y2={polarToCartesian(center, center, trackRadius - (maxStroke / 2) - 5, timeHandAngle).y} stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
           <line x1={center} y1={center} x2={polarToCartesian(center, center, -20, timeHandAngle).x} y2={polarToCartesian(center, center, -20, timeHandAngle).y} stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
           <circle cx={center} cy={center} r="5" fill="#1e293b" />
        </svg>
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center text-center ${activeTask ? 'cursor-pointer hover:bg-gray-50/50 rounded-full' : ''}`}
          onClick={() => activeTask && onFocusTask(activeTask)}
        >
            {taskProgress ? (
                 <div className="px-2">
                    <p className="text-gray-500 text-sm font-medium truncate">{taskProgress.name}</p>
                    <p className="font-bold text-5xl text-blue-600 mt-1">{taskProgress.remainingPercentage}%</p>
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="text-gray-600 mt-2 text-sm">{taskProgress.timeLeft} min left</p>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                   <Sun size={40} className="text-yellow-500 mb-2"/>
                   <p className="text-gray-600">Free Time!</p>
                </div>
            )}
        </div>
      </div>
       <div className="text-center font-sans">
            <p className="text-5xl font-bold text-gray-800 tracking-tight">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
            <p className="text-lg text-gray-500">
              {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>
    </div>
  );
};

// --- Task Form Component ---
const TaskForm = ({ onAddTask }) => {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [icon, setIcon] = useState(availableIcons[0]);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !startTime || !endTime || !icon) {
      setError('Please fill out all fields.');
      return;
    }
    
    const startHour = parseInt(startTime.split(':')[0], 10);
    const endHour = parseInt(endTime.split(':')[0], 10);
    if(startHour !== endHour) {
      setError('Tasks must start and end within the same hour.');
      return;
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      setError('End time must be after start time.');
      return;
    }

    const success = onAddTask({ name, startTime, endTime, icon });
    if(success) {
      setName('');
      setStartTime('');
      setEndTime('');
      setIcon(availableIcons[0]);
      setError('');
    } else {
        setError('This task overlaps with an existing one.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md space-y-4 w-full max-w-sm">
      <h3 className="text-lg font-semibold text-gray-700">Add New Task</h3>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input type="text" placeholder="Task Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-400" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
          <input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-indigo-400 min-h-[42px]" />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
          <input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-indigo-400 min-h-[42px]" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-600">Icon:</span>
        <select value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-400">
          {availableIcons.map(iconName => (<option key={iconName} value={iconName}>{iconName}</option>))}
        </select>
         <Icon name={icon} className="text-indigo-500" />
      </div>
      <button type="submit" className="w-full bg-indigo-500 text-white p-2 rounded-md hover:bg-indigo-600 flex items-center justify-center gap-2">
        <Plus size={18} /> Add Task
      </button>
    </form>
  );
};


// --- Task List Component ---
const TaskList = ({ tasks, onDeleteTask }) => (
  <div className="p-4 bg-white rounded-lg shadow-md w-full max-w-sm">
    <h3 className="text-lg font-semibold text-gray-700 mb-3">Today's Tasks</h3>
    <div className="space-y-3 max-h-60 overflow-y-auto">
      {tasks.length === 0 ? (<p className="text-gray-500">No tasks scheduled yet.</p>) : (
        tasks.map(task => (
          <div key={task.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
            <div className="flex items-center gap-3">
              <Icon name={task.icon} className="text-indigo-500" size={20} />
              <div>
                <p className="font-medium text-gray-800">{task.name}</p>
                <p className="text-sm text-gray-500">{task.startTime} - {task.endTime}</p>
              </div>
            </div>
            <button onClick={() => onDeleteTask(task.id)} className="text-gray-400 hover:text-red-500">
              <Trash2 size={18} />
            </button>
          </div>
        ))
      )}
    </div>
  </div>
);

// --- Main Dashboard View ---
const MainDashboard = ({ tasks, currentTime, onAddTask, onDeleteTask, onFocusTask }) => (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <BrainCircuit className="text-indigo-500" size={32}/>
          <h1 className="text-2xl font-bold text-gray-800">Time Awareness Clock</h1>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
          <div className="w-full lg:w-auto flex justify-center">
            <Clock tasks={tasks} currentTime={currentTime} onFocusTask={onFocusTask} />
          </div>
          <div className="w-full lg:w-auto flex flex-col items-center gap-8">
            <TaskForm onAddTask={onAddTask} />
            <TaskList tasks={tasks} onDeleteTask={onDeleteTask} />
          </div>
        </div>
      </main>
    </div>
);


// --- Main App Component ---
export default function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'focus'
  const [focusedTask, setFocusedTask] = useState(null);
  const [tasks, setTasks] = useState([
      { id: 1, name: 'Morning Coffee', startTime: '08:00', endTime: '08:10', icon: 'Coffee' },
      { id: 2, name: 'Team Standup', startTime: '09:15', endTime: '09:30', icon: 'Briefcase' },
      { id: 3, name: 'Read a Chapter', startTime: '08:30', endTime: '08:55', icon: 'BookOpen' }
  ]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const handleAddTask = (newTask) => {
    const newStartTime = timeToMinutes(newTask.startTime);
    const newEndTime = timeToMinutes(newTask.endTime);
    const isOverlapping = tasks.some(task => {
        const existingStartTime = timeToMinutes(task.startTime);
        const existingEndTime = timeToMinutes(task.endTime);
        return (newStartTime < existingEndTime) && (newEndTime > existingStartTime);
    });

    if (isOverlapping) {
      console.error("Overlap detected!");
      return false;
    }
    
    setTasks(prevTasks => [{ ...newTask, id: Date.now() }, ...prevTasks]);
    return true;
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleFocusTask = (task) => {
    setFocusedTask(task);
    setView('focus');
  };

  const handleExitFocus = () => {
    setFocusedTask(null);
    setView('dashboard');
  };

  if (view === 'focus' && focusedTask) {
    return <FocusView task={focusedTask} currentTime={currentTime} onExit={handleExitFocus} />;
  }

  return (
    <MainDashboard 
        tasks={tasks}
        currentTime={currentTime}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
        onFocusTask={handleFocusTask}
    />
  );
}
