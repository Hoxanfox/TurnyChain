import React, { useState } from 'react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useManagerSummary } from './application/useManagerSummary';
import type { ManagerModule } from './domain/managerModules';
import { ManagerDashboardDesktop } from './presentation/ManagerDashboardDesktop';
import { ManagerDashboardMobile } from './presentation/ManagerDashboardMobile';

const ManagerDashboard: React.FC = () => {
  const isDesktop = useIsDesktop();
  const [activeModule, setActiveModule] = useState<ManagerModule>('overview');
  const { reports } = useManagerSummary();

  const props = { activeModule, onModuleChange: setActiveModule, reports };
  return isDesktop ? <ManagerDashboardDesktop {...props} /> : <ManagerDashboardMobile {...props} />;
};

export default ManagerDashboard;
