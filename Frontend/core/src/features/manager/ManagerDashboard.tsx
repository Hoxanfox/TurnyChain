import React, { useEffect, useState } from 'react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useManagerSummary } from './application/useManagerSummary';
import type { ManagerModule } from './domain/managerModules';
import { ManagerDashboardDesktop } from './presentation/ManagerDashboardDesktop';
import { ManagerDashboardMobile } from './presentation/ManagerDashboardMobile';
import { useModuleAccess } from '../../app/moduleAccess';

const ManagerDashboard: React.FC = () => {
  const isDesktop = useIsDesktop();
  const [activeModule, setActiveModule] = useState<ManagerModule>('reports');
  const { reports } = useManagerSummary();
  const { isEnabled } = useModuleAccess();

  useEffect(() => {
    if (activeModule !== 'overview' && !isEnabled(activeModule)) {
      setActiveModule('overview');
    }
  }, [activeModule, isEnabled]);

  const props = { activeModule, onModuleChange: setActiveModule, reports };
  return isDesktop ? <ManagerDashboardDesktop {...props} /> : <ManagerDashboardMobile {...props} />;
};

export default ManagerDashboard;
