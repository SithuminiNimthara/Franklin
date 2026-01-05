import { Droplets, Activity } from 'lucide-react';
import StatSummaryCard from '../../shared/components/ui/StatSummaryCard'; 
import TankVideoCard from '../../shared/components/ui/TankVideoCard'; 

export default function HatcheryPage() {
  
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hatchery Management</h1>
          <p className="text-gray-500 mt-1">Real-time AI monitoring for Tank A</p>
        </div>
      </div>

      {/* 2. Main Content: Video & Real-time Stats */}
      <div className="h-auto lg:h-[600px]">
         {/* We pass only one tank now */}
         <TankVideoCard tankId="tankA" tankLabel="Incubation Tank A" />
      </div>

      {/* 3. Bottom Stats Row (Optional Context) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatSummaryCard
          icon={Droplets}
          value="118"
          label="Total Hatchlings Count"
          colorTheme="blue"
        />
        <StatSummaryCard
          icon={Activity}
          value="98.5%"
          label="Est. Survival Rate"
          colorTheme="green"
        />
      </div>

    </div>
  );
}