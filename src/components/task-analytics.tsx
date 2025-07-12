"use client";

import { useEffect, useRef, useState } from 'react';

interface TaskAnalyticsProps {
  tasks: Array<{
    id: string;
    status: "todo" | "in-progress" | "done";
  }>;
}

export default function TaskAnalytics({ tasks }: TaskAnalyticsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });

  useEffect(() => {
    const updateCanvasSize = () => {
      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth < 1024;

      if (isMobile) {
        setCanvasSize({ width: 280, height: 200 });
      } else if (isTablet) {
        setCanvasSize({ width: 350, height: 250 });
      } else {
        setCanvasSize({ width: 400, height: 300 });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Calculate task counts
    const todoCount = tasks.filter(task => task.status === 'todo').length;
    const inProgressCount = tasks.filter(task => task.status === 'in-progress').length;
    const doneCount = tasks.filter(task => task.status === 'done').length;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    const padding = width < 400 ? 20 : 40; // Smaller padding on mobile
    const titleHeight = width < 400 ? 40 : 60; // Smaller title height on mobile
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding - titleHeight;

    // Colors for each status
    const colors = {
      todo: '#6B7280', // gray
      'in-progress': '#3B82F6', // blue
      done: '#10B981', // green
    };

    // Bar dimensions
    const barWidth = chartWidth / 3 - (width < 400 ? 10 : 20);
    const maxValue = Math.max(todoCount, inProgressCount, doneCount, 1);
    const barSpacing = width < 400 ? 10 : 20;

    // Draw bars
    const drawBar = (x: number, value: number, color: string, label: string) => {
      const barHeight = (value / maxValue) * chartHeight;
      const y = height - padding - barHeight;

      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw value text
      ctx.fillStyle = '#374151';
      ctx.font = width < 400 ? 'bold 12px Arial' : 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(value.toString(), x + barWidth / 2, y - 5);

      // Draw label
      ctx.fillStyle = '#6B7280';
      ctx.font = width < 400 ? '10px Arial' : '14px Arial';
      ctx.fillText(label, x + barWidth / 2, height - 5);
    };

    // Draw chart title
    ctx.fillStyle = '#111827';
    ctx.font = width < 400 ? 'bold 14px Arial' : 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Task Status Distribution', width / 2, width < 400 ? 15 : 25);

    // Draw bars
    const startX = padding + barSpacing;
    drawBar(startX, todoCount, colors.todo, 'To Do');
    drawBar(startX + barWidth + barSpacing, inProgressCount, colors['in-progress'], 'In Progress');
    drawBar(startX + 2 * (barWidth + barSpacing), doneCount, colors.done, 'Done');

    // Draw axis
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

  }, [tasks, canvasSize]);

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
        Task Analytics
      </h3>
      <div className="flex items-center justify-center mt-4 overflow-x-auto">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="border border-gray-200 rounded max-w-full"
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-center">
        <div>
          <div className="text-lg sm:text-2xl font-bold text-gray-600">
            {tasks.filter(task => task.status === 'todo').length}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">To Do</div>
        </div>
        <div>
          <div className="text-lg sm:text-2xl font-bold text-blue-600">
            {tasks.filter(task => task.status === 'in-progress').length}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">In Progress</div>
        </div>
        <div>
          <div className="text-lg sm:text-2xl font-bold text-green-600">
            {tasks.filter(task => task.status === 'done').length}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Done</div>
        </div>
      </div>
    </div>
  );
}
