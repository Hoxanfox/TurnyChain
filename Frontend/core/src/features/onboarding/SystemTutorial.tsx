import React from 'react';
import { Joyride } from 'react-joyride';
import type { Step } from 'react-joyride';

interface SystemTutorialProps {
  run: boolean;
  onFinish: () => void;
}

export const SystemTutorial: React.FC<SystemTutorialProps> = ({ run, onFinish }) => {
  const steps: Step[] = [
    {
      target: 'body',
      content: '¡Bienvenido al panel principal! Aquí podrás gestionar todo. Vamos a dar un rápido recorrido.',
      placement: 'center',
    },
    {
      target: '.tutorial-sidebar',
      content: 'Este es tu menú de navegación lateral. Desde aquí accedes a todas las secciones del sistema.',
      placement: 'right',
    },
    {
      target: '.tutorial-tables',
      content: 'Aquí puedes ver el estado general de las mesas. Selecciona una para ver o gestionar sus comandas.',
      placement: 'bottom',
    },
    {
      target: '.tutorial-urgent',
      content: 'La Cola de Órdenes te permite filtrar rápidamente por estados como "Por Verificar" o "Por Cobrar".',
      placement: 'bottom',
    },
    {
      target: '.tutorial-settings',
      content: 'En la sección de herramientas puedes buscar órdenes pasadas o sacar tu Corte de Caja.',
      placement: 'right',
    }
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      onEvent={(data: any) => {
        if (data.status === 'finished' || data.status === 'skipped') {
          onFinish();
        }
      }}

      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
    />
  );
};
