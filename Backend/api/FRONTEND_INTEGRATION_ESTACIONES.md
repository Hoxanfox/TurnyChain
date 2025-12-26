# 🎨 Guía de Integración Frontend - Sistema de Estaciones

Esta guía muestra cómo integrar el sistema de estaciones e impresión de tickets en el frontend.

---

## 📋 Componentes Sugeridos

### 1. **Gestión de Estaciones** (Admin)

```typescript
// components/admin/StationManager.tsx

interface Station {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export const StationManager = () => {
  const [stations, setStations] = useState<Station[]>([]);
  
  useEffect(() => {
    fetchStations();
  }, []);
  
  const fetchStations = async () => {
    const res = await fetch('http://localhost:8080/api/stations');
    const data = await res.json();
    setStations(data);
  };
  
  const createStation = async (name: string, description: string) => {
    const res = await fetch('http://localhost:8080/api/stations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, description })
    });
    
    if (res.ok) {
      fetchStations(); // Refrescar lista
    }
  };
  
  return (
    <div>
      <h2>Gestión de Estaciones</h2>
      <button onClick={() => createStation('Nueva Estación', 'Descripción')}>
        Agregar Estación
      </button>
      
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {stations.map(station => (
            <tr key={station.id}>
              <td>{station.name}</td>
              <td>{station.description}</td>
              <td>{station.is_active ? '✅ Activa' : '❌ Inactiva'}</td>
              <td>
                <button onClick={() => editStation(station.id)}>Editar</button>
                <button onClick={() => deleteStation(station.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

### 2. **Gestión de Impresoras** (Admin)

```typescript
// components/admin/PrinterManager.tsx

interface Printer {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  printer_type: 'escpos' | 'pdf' | 'raw';
  station_id: string;
  station_name: string;
  is_active: boolean;
}

export const PrinterManager = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  
  useEffect(() => {
    fetchPrinters();
    fetchStations();
  }, []);
  
  const fetchPrinters = async () => {
    const res = await fetch('http://localhost:8080/api/printers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setPrinters(data);
  };
  
  const createPrinter = async (formData: {
    name: string;
    ip_address: string;
    port: number;
    printer_type: string;
    station_id: string;
  }) => {
    const res = await fetch('http://localhost:8080/api/printers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      fetchPrinters();
    }
  };
  
  return (
    <div>
      <h2>Gestión de Impresoras</h2>
      
      {/* Formulario de creación */}
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Nombre impresora" required />
        <input name="ip_address" placeholder="IP (ej: 192.168.1.101)" required />
        <input name="port" type="number" defaultValue={9100} required />
        <select name="printer_type" required>
          <option value="escpos">ESC/POS (Térmica)</option>
          <option value="pdf">PDF (Pruebas)</option>
          <option value="raw">Raw</option>
        </select>
        <select name="station_id" required>
          {stations.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button type="submit">Crear Impresora</button>
      </form>
      
      {/* Lista de impresoras */}
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>IP</th>
            <th>Puerto</th>
            <th>Tipo</th>
            <th>Estación</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {printers.map(printer => (
            <tr key={printer.id}>
              <td>{printer.name}</td>
              <td>{printer.ip_address}</td>
              <td>{printer.port}</td>
              <td>{printer.printer_type}</td>
              <td>{printer.station_name}</td>
              <td>{printer.is_active ? '🟢' : '🔴'}</td>
              <td>
                <button onClick={() => testPrinter(printer.id)}>Test</button>
                <button onClick={() => editPrinter(printer.id)}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

### 3. **Vista de Orden con Botones de Impresión** (Mesero)

```typescript
// components/waiter/OrderView.tsx

interface OrderViewProps {
  orderId: string;
}

export const OrderView = ({ orderId }: OrderViewProps) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [ticketPreview, setTicketPreview] = useState<KitchenTicket[] | null>(null);
  const [printing, setPrinting] = useState(false);
  
  // Vista previa de tickets
  const showTicketPreview = async () => {
    const res = await fetch(
      `http://localhost:8080/api/orders/${orderId}/kitchen-tickets/preview`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const data = await res.json();
    setTicketPreview(data.tickets);
  };
  
  // Imprimir tickets
  const printKitchenTickets = async (reprint: boolean = false) => {
    setPrinting(true);
    
    try {
      const res = await fetch(
        `http://localhost:8080/api/orders/${orderId}/kitchen-tickets/print`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reprint })
        }
      );
      
      const result = await res.json();
      
      if (result.success) {
        toast.success(`✅ Tickets enviados a ${result.tickets_sent} estaciones`);
      } else {
        toast.warning(
          `⚠️ ${result.tickets_sent} exitosos, ${result.failed_prints.length} fallidos`
        );
        
        // Mostrar errores
        result.failed_prints.forEach(fail => {
          toast.error(`Error en ${fail.station_name}: ${fail.error}`);
        });
      }
    } catch (error) {
      toast.error('Error al imprimir tickets');
    } finally {
      setPrinting(false);
    }
  };
  
  return (
    <div className="order-view">
      <h2>Orden #{order?.id.slice(0, 8)}</h2>
      
      <div className="order-info">
        <p>Mesa: {order?.table_number}</p>
        <p>Total: ${order?.total}</p>
        <p>Estado: {order?.status}</p>
      </div>
      
      {/* Botones de acción */}
      <div className="action-buttons">
        <button 
          onClick={() => showTicketPreview()}
          className="btn-secondary"
        >
          👁️ Vista Previa de Tickets
        </button>
        
        <button 
          onClick={() => printKitchenTickets(false)}
          disabled={printing}
          className="btn-primary"
        >
          {printing ? '⏳ Enviando...' : '🖨️ Enviar a Cocina'}
        </button>
        
        <button 
          onClick={() => printKitchenTickets(true)}
          disabled={printing}
          className="btn-warning"
        >
          🔄 Reimprimir
        </button>
      </div>
      
      {/* Modal de vista previa */}
      {ticketPreview && (
        <Modal onClose={() => setTicketPreview(null)}>
          <h3>Vista Previa de Tickets</h3>
          {ticketPreview.map((ticket, idx) => (
            <div key={idx} className="ticket-preview">
              <h4>📄 {ticket.station_name}</h4>
              <ul>
                {ticket.items.map((item, i) => (
                  <li key={i}>
                    {item.quantity}x {item.menu_item_name}
                    {item.notes && <span className="notes"> - {item.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button onClick={() => setTicketPreview(null)}>Cerrar</button>
        </Modal>
      )}
    </div>
  );
};
```

---

### 4. **Hook Personalizado para Tickets**

```typescript
// hooks/useKitchenTickets.ts

interface UseKitchenTicketsReturn {
  preview: KitchenTicket[] | null;
  printing: boolean;
  error: string | null;
  getPreview: (orderId: string) => Promise<void>;
  printTickets: (orderId: string, reprint?: boolean) => Promise<PrintResponse>;
}

export const useKitchenTickets = (): UseKitchenTicketsReturn => {
  const [preview, setPreview] = useState<KitchenTicket[] | null>(null);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  
  const getPreview = async (orderId: string) => {
    try {
      setError(null);
      const res = await fetch(
        `${API_URL}/api/orders/${orderId}/kitchen-tickets/preview`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!res.ok) throw new Error('Error al obtener vista previa');
      
      const data = await res.json();
      setPreview(data.tickets);
    } catch (err) {
      setError(err.message);
      setPreview(null);
    }
  };
  
  const printTickets = async (
    orderId: string, 
    reprint: boolean = false
  ): Promise<PrintResponse> => {
    setPrinting(true);
    setError(null);
    
    try {
      const res = await fetch(
        `${API_URL}/api/orders/${orderId}/kitchen-tickets/print`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reprint })
        }
      );
      
      const result = await res.json();
      
      if (!result.success && result.failed_prints.length > 0) {
        setError(`${result.failed_prints.length} impresiones fallaron`);
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setPrinting(false);
    }
  };
  
  return {
    preview,
    printing,
    error,
    getPreview,
    printTickets
  };
};
```

---

### 5. **Componente de Ticket Preview**

```typescript
// components/shared/TicketPreview.tsx

interface TicketPreviewProps {
  tickets: KitchenTicket[];
  onClose: () => void;
  onPrint: () => void;
}

export const TicketPreview = ({ tickets, onClose, onPrint }: TicketPreviewProps) => {
  return (
    <div className="ticket-preview-modal">
      <div className="modal-header">
        <h2>Vista Previa de Tickets</h2>
        <button onClick={onClose}>✕</button>
      </div>
      
      <div className="modal-body">
        {tickets.map((ticket, idx) => (
          <div key={idx} className="ticket-card">
            <div className="ticket-header">
              <h3>📄 {ticket.station_name}</h3>
              <span className="ticket-time">
                {new Date(ticket.created_at).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="ticket-info">
              <p><strong>Orden:</strong> {ticket.order_number}</p>
              <p><strong>Mesa:</strong> {ticket.table_number}</p>
              <p><strong>Mesero:</strong> {ticket.waiter_name}</p>
              <p><strong>Tipo:</strong> {ticket.order_type}</p>
            </div>
            
            <div className="ticket-items">
              <h4>Items:</h4>
              {ticket.items.map((item, i) => (
                <div key={i} className="ticket-item">
                  <div className="item-qty">{item.quantity}x</div>
                  <div className="item-details">
                    <p className="item-name">{item.menu_item_name}</p>
                    
                    {item.notes && (
                      <p className="item-notes">📝 {item.notes}</p>
                    )}
                    
                    {item.customizations && (
                      <div className="item-customizations">
                        {item.customizations.active_ingredients?.length > 0 && (
                          <p>
                            ✅ CON: {item.customizations.active_ingredients
                              .map(ing => ing.name)
                              .join(', ')}
                          </p>
                        )}
                        
                        {item.customizations.selected_accompaniments?.length > 0 && (
                          <p>
                            🍽️ Acompañamientos: {item.customizations.selected_accompaniments
                              .map(acc => acc.name)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {item.is_takeout && (
                      <span className="badge badge-warning">📦 Para llevar</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">
          Cerrar
        </button>
        <button onClick={onPrint} className="btn-primary">
          🖨️ Imprimir Tickets
        </button>
      </div>
    </div>
  );
};
```

---

### 6. **CSS Sugerido**

```css
/* styles/tickets.css */

.ticket-preview-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 1000;
}

.ticket-card {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: #f9f9f9;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #333;
  padding-bottom: 8px;
  margin-bottom: 12px;
}

.ticket-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.ticket-time {
  font-size: 14px;
  color: #666;
}

.ticket-info {
  background: white;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.ticket-info p {
  margin: 4px 0;
  font-size: 14px;
}

.ticket-items {
  margin-top: 12px;
}

.ticket-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 4px;
  margin-bottom: 8px;
}

.item-qty {
  font-size: 20px;
  font-weight: bold;
  min-width: 40px;
  color: #2563eb;
}

.item-details {
  flex: 1;
}

.item-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.item-notes {
  font-size: 14px;
  color: #dc2626;
  font-style: italic;
  margin: 4px 0;
}

.item-customizations {
  font-size: 13px;
  color: #059669;
  margin-top: 4px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge-warning {
  background: #fbbf24;
  color: #78350f;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin: 20px 0;
}

.btn-primary {
  background: #2563eb;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6b7280;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-warning {
  background: #f59e0b;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
```

---

## 📱 Flujo de Usuario

### Mesero tomando orden:
1. Selecciona items del menú
2. Clic en "Crear Orden"
3. Orden se crea exitosamente
4. **[NUEVO]** Botón "Enviar a Cocina" aparece
5. Mesero puede ver vista previa antes de enviar
6. Clic en "Enviar a Cocina"
7. Sistema genera y envía tickets a cada estación
8. Mesero recibe confirmación

### Si el papel se atascó:
1. Mesero abre la orden
2. Clic en "Reimprimir"
3. Los mismos tickets se vuelven a enviar

---

## 🎨 Mejoras de UX Sugeridas

1. **Animaciones**: Mostrar animación de "enviando" mientras se imprimen
2. **Sonidos**: Reproducir sonido de confirmación cuando se envían tickets
3. **Badges**: Mostrar badge en la orden indicando "Tickets enviados"
4. **Historial**: Guardar log de cuándo se enviaron/reimprimieron tickets
5. **Notificaciones**: WebSocket para notificar cuando un ticket se imprime

---

**¡Listo para integrar!** 🚀

