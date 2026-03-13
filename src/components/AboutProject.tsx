import React from 'react';
import { Card } from '@/components/ui/card';
import { Cpu, FileText, Wrench, GraduationCap, Satellite } from 'lucide-react';

type Member = {
  name: string;
  role: string;
  contribution: string;
};

const members: Member[] = [
  {
    name: 'Jay Patwa',
    role: 'Founder, Dashboard and ML Lead',
    contribution:
      'Led the complete project direction, designed the dashboard experience, and developed the AQI prediction and machine learning workflow.',
  },
  {
    name: 'Hitanshu Khatri',
    role: 'Drone Support and Integration',
    contribution:
      'Supported drone-side integration and helped align sensing flow between drone hardware and dashboard features.',
  },
  {
    name: 'Parva Sheth',
    role: 'Web Support and Drone Hardware',
    contribution:
      'Contributed to web implementation support and assisted in drone hardware setup and testing.',
  },
  {
    name: 'Jaival Acharya',
    role: 'Reporting and Documentation',
    contribution:
      'Managed project reporting, structured documentation, and maintained clear technical records for progress and review.',
  },
  {
    name: 'Krutik Lakhani',
    role: 'Hardware and Field Experience',
    contribution:
      'Provided practical real-world hardware support, field-level insights, and testing experience for reliable deployment.',
  },
];

export const AboutProject: React.FC = () => {
  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="glass-card p-5 md:p-7">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center">
              <Satellite className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">About This Project</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Smart AQI Monitoring Drone System
              </p>
            </div>
          </div>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            This project is an air quality monitoring platform that connects drone-assisted sensing with a live dashboard and
            machine learning prediction. The system captures environmental readings, streams them to the web dashboard, stores
            historical records, and generates AQI forecasts to support awareness and planning.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Cpu className="h-4 w-4 text-cyan-300" />
                Dashboard and Analytics
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time values, trends, metrics, and prediction view for air quality data.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4 text-emerald-300" />
                Drone and Hardware
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sensor integration, hardware setup, and practical field operation support.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-amber-300" />
                Reporting and Documentation
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Structured reports and technical documentation for academic and project review.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs md:text-sm">
            <GraduationCap className="h-4 w-4 text-violet-300" />
            Team: Computer Engineering students from InUs University, same department and same batch.
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((member) => (
          <Card
            key={member.name}
            className="glass-card p-4 md:p-5 border border-white/10"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center bg-white/10">
                <Cpu className="h-4 w-4 text-slate-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold">{member.name}</h3>
                <p className="text-xs font-medium text-cyan-200">{member.role}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{member.contribution}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
