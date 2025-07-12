"use client";

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    role: string;
  }>;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "done";
  createdAt: string;
  updatedAt: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface ExportProjectProps {
  project: Project;
  tasks: Task[];
}

export default function ExportProject({ project, tasks }: ExportProjectProps) {
  const handleExport = () => {
    // Prepare export data
    const exportData = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        owner: project.owner,
        members: project.members,
      },
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignedTo: task.assignedTo,
      })),
      exportInfo: {
        exportedAt: new Date().toISOString(),
        totalTasks: tasks.length,
        taskStatusCounts: {
          todo: tasks.filter(task => task.status === 'todo').length,
          inProgress: tasks.filter(task => task.status === 'in-progress').length,
          done: tasks.filter(task => task.status === 'done').length,
        },
        totalMembers: project.members.length + 1, // +1 for owner
      }
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 cursor-pointer flex items-center space-x-2"
      title="Export project data to JSON"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>Export Project</span>
    </button>
  );
}
