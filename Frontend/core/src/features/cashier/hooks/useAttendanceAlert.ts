import { useState, useEffect } from 'react';
import { attendanceApi } from '../api/attendanceApi';

export const useAttendanceAlert = (enabled: boolean = true) => {
  const [unmarkedAttendanceCount, setUnmarkedAttendanceCount] = useState(0);
  const [absentAttendanceCount, setAbsentAttendanceCount] = useState(0);

  const checkAttendance = async () => {
    if (!enabled) return;
    try {
      const employees = await attendanceApi.getTodayStatus();
      const unmarked = employees.filter(e => e.current_state === 'SALIDA' || !e.current_state).length;
      const absent = employees.filter(e => e.current_state === 'FALTA').length;
      
      setUnmarkedAttendanceCount(unmarked);
      setAbsentAttendanceCount(absent);
    } catch (err) {
      console.error('Failed to check attendance', err);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    
    checkAttendance();
    const interval = setInterval(checkAttendance, 15000);
    
    const handleUpdate = () => checkAttendance();
    window.addEventListener('attendance_updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('attendance_updated', handleUpdate);
    };
  }, [enabled]);

  return {
    unmarkedAttendanceCount,
    absentAttendanceCount,
    refreshAttendance: checkAttendance
  };
};
