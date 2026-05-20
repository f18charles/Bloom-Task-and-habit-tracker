import { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { useTaskStore } from "../store/useTaskStore.ts";
import { useHabitStore } from "../store/useHabitStore.ts";
import api from "../api/axios.ts";
import { motion } from "motion/react";

export default function Progress() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get("/users/stats").then(res => setStats(res.data.data));
  }, []);

  const habitData = [
    { day: "Mon", count: 3 },
    { day: "Tue", count: 4 },
    { day: "Wed", count: 2 },
    { day: "Thu", count: 5 },
    { day: "Fri", count: 4 },
    { day: "Sat", count: 3 },
    { day: "Sun", count: 5 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Task Completion Line Chart */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bloom-card p-6 sm:p-8"
      >
        <h3 className="text-xl font-bold text-slate-800 mb-8">Tasks Completed</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={habitData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#86efac" 
                strokeWidth={4} 
                dot={{ fill: '#86efac', strokeWidth: 2, r: 4 }} 
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Habit Consistency Bar Chart */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bloom-card p-6 sm:p-8"
      >
        <h3 className="text-xl font-bold text-slate-800 mb-8">Habit Consistency</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={habitData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="count" fill="#86efac" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
