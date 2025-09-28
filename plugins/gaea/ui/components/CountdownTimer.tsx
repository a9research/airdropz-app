'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Target } from 'lucide-react';

interface CountdownTimerProps {
  title: string;
  targetHour: number; // UTC时间的目标小时 (0-23)
  icon: React.ReactNode;
  className?: string;
}

export function CountdownTimer({ title, targetHour, icon, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      
      // 计算今天的目标时间 (UTC)
      const today = new Date();
      today.setUTCHours(targetHour, 0, 0, 0);
      
      // 如果今天的目标时间已经过了，计算明天的时间
      if (now >= today) {
        today.setUTCDate(today.getUTCDate() + 1);
      }
      
      const timeDiff = today.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setIsExpired(true);
        return { hours: 0, minutes: 0, seconds: 0 };
      }
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      return { hours, minutes, seconds };
    };

    const updateTimer = () => {
      const timeLeft = calculateTimeLeft();
      setTimeLeft(timeLeft);
      setIsExpired(timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0);
    };

    // 立即更新一次
    updateTimer();
    
    // 每秒更新
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [targetHour]);

  const formatTime = (value: number) => {
    return value.toString().padStart(2, '0');
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {icon}
      <span className="text-sm font-medium text-gray-700">{title}:</span>
      {isExpired ? (
        <span className="text-sm font-bold text-green-600">已到达</span>
      ) : (
        <span className="text-sm font-bold text-blue-600">
          {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
        </span>
      )}
      <span className="text-xs text-gray-500">(UTC {targetHour}:00)</span>
    </div>
  );
}

// 深度训练结果倒计时器 (UTC 0点)
export function DeepTrainingCountdown() {
  return (
    <CountdownTimer
      title="深度训练结果"
      targetHour={0}
      icon={<Target className="w-4 h-4 text-purple-600" />}
    />
  );
}

// 决策结果倒计时器 (UTC 12点)
export function DecisionCountdown() {
  return (
    <CountdownTimer
      title="决策结果"
      targetHour={12}
      icon={<Clock className="w-4 h-4 text-orange-600" />}
    />
  );
}
