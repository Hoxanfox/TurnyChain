# 🍔 API de Menú - Guía de Integración Frontend

## 📌 Campos Nuevos en MenuItem

```typescript
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  category_name: string;        // ✨ NUEVO
  is_available: boolean;
  order_count: number;           // ✨ NUEVO
  ingredients?: Ingredient[];
  accompaniments?: Accompaniment[];
}
```

---

## 🔥 Casos de Uso

### 1. **Filtrar por Categoría**

```typescript
// Obtener todos los items del menú
const response = await fetch('/api/menu', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const menuItems: MenuItem[] = await response.json();

// Filtrar por categoría (sin necesidad de hacer otra petición)
const burgers = menuItems.filter(item => item.category_name === "Hamburguesas");
const drinks = menuItems.filter(item => item.category_name === "Bebidas");
```

### 2. **Mostrar Items Más Populares**

```typescript
// Los items ya vienen ordenados por popularidad (order_count DESC)
// Solo necesitas tomar los primeros N elementos

const topItems = menuItems.slice(0, 10); // Top 10 más populares

// O puedes crear una sección especial
const mostOrdered = menuItems
  .filter(item => item.order_count > 0)
  .slice(0, 5);
```

### 3. **Badge de Popularidad**

```tsx
function MenuItemCard({ item }: { item: MenuItem }) {
  const isPopular = item.order_count > 50;
  const isTrending = item.order_count > 100;

  return (
    <div className="menu-item">
      {isTrending && <Badge variant="gold">🔥 Trending</Badge>}
      {isPopular && !isTrending && <Badge variant="silver">⭐ Popular</Badge>}
      
      <h3>{item.name}</h3>
      <p className="category">{item.category_name}</p>
      <p className="price">${item.price}</p>
      <p className="orders">{item.order_count} pedidos</p>
    </div>
  );
}
```

### 4. **Búsqueda con Filtros**

```typescript
function searchMenu(
  items: MenuItem[], 
  query: string, 
  category?: string
) {
  return items.filter(item => {
    const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase()) ||
                         item.description.toLowerCase().includes(query.toLowerCase());
    
    const matchesCategory = !category || item.category_name === category;
    
    return matchesQuery && matchesCategory;
  });
}

// Uso
const results = searchMenu(menuItems, "hamburguesa", "Platos Fuertes");
```

### 5. **Obtener Lista de Categorías Únicas**

```typescript
// Extraer todas las categorías sin duplicados
const categories = [...new Set(menuItems.map(item => item.category_name))];

// Crear un selector de categorías
function CategoryFilter({ categories, onSelect }: Props) {
  return (
    <div className="category-filter">
      <button onClick={() => onSelect(null)}>Todas</button>
      {categories.map(cat => (
        <button key={cat} onClick={() => onSelect(cat)}>
          {cat}
        </button>
      ))}
    </div>
  );
}
```

### 6. **Ordenar por Popularidad (Manual)**

```typescript
// Si necesitas reordenar en el frontend
const sortedByPopularity = [...menuItems].sort((a, b) => 
  b.order_count - a.order_count
);

const sortedByName = [...menuItems].sort((a, b) => 
  a.name.localeCompare(b.name)
);

const sortedByPrice = [...menuItems].sort((a, b) => 
  a.price - b.price
);
```

---

## 🎨 Componentes de Ejemplo

### **MenuGrid con Filtros**

```tsx
function MenuGrid() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    const response = await fetch('/api/menu', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setMenuItems(data);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_name === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [...new Set(menuItems.map(item => item.category_name))];

  return (
    <div>
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      
      <CategoryFilter 
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <div className="grid">
        {filteredItems.map(item => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
```

### **Sección de Populares**

```tsx
function PopularItems() {
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    fetchMenu().then(items => {
      // Los items ya vienen ordenados por popularidad
      setPopularItems(items.slice(0, 6));
    });
  }, []);

  return (
    <section className="popular-section">
      <h2>🔥 Los Más Pedidos</h2>
      <div className="horizontal-scroll">
        {popularItems.map(item => (
          <CompactMenuCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
```

---

## 🎯 Tips de Performance

### 1. **Cachear la respuesta del menú**

```typescript
const CACHE_KEY = 'menu-items';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function fetchMenuWithCache() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }

  const response = await fetch('/api/menu', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();

  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }));

  return data;
}
```

### 2. **WebSocket para actualizaciones en tiempo real**

```typescript
// Escuchar cambios en el menú
wsClient.on('MENU_ITEM_UPDATED', (updatedItem: MenuItem) => {
  setMenuItems(prev => 
    prev.map(item => item.id === updatedItem.id ? updatedItem : item)
  );
});

// Cuando se aprueba una orden, el contador se actualiza automáticamente
wsClient.on('ORDER_STATUS_UPDATED', (order) => {
  if (order.status === 'aprobado') {
    // Los contadores ya fueron actualizados en el backend
    // Puedes refrescar el menú o esperar al siguiente fetch
    invalidateMenuCache();
  }
});
```

---

## 🚨 Errores Comunes

### 1. **Category Name Undefined**
```typescript
// ❌ Mal
<p>{item.category_name}</p>

// ✅ Bien
<p>{item.category_name || 'Sin categoría'}</p>
```

### 2. **Order Count Negativo**
```typescript
// Siempre valida
const displayCount = Math.max(0, item.order_count);
```

---

## 📊 Análisis y Métricas

```typescript
function getMenuStats(items: MenuItem[]) {
  return {
    totalItems: items.length,
    totalOrders: items.reduce((sum, item) => sum + item.order_count, 0),
    averageOrders: items.reduce((sum, item) => sum + item.order_count, 0) / items.length,
    topCategory: getMostPopularCategory(items),
    itemsNeverOrdered: items.filter(item => item.order_count === 0).length
  };
}

function getMostPopularCategory(items: MenuItem[]) {
  const categoryStats = items.reduce((acc, item) => {
    if (!acc[item.category_name]) {
      acc[item.category_name] = 0;
    }
    acc[item.category_name] += item.order_count;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categoryStats)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
}
```

---

## 🔗 Endpoints Relacionados

```typescript
// GET - Obtener menú completo con category_name y order_count
GET /api/menu

// POST - Incrementar contador manualmente (admin)
POST /api/menu/items/{id}/increment-order-count

// El contador se incrementa automáticamente cuando:
// - Se aprueba una orden (status: pendiente_aprobacion -> aprobado)
```

---

## 💡 Ideas de UX

1. **Ordenamiento Dinámico**: Permitir al usuario elegir entre popularidad, precio, nombre
2. **Badges Visuales**: Mostrar íconos especiales para items trending
3. **Recomendaciones**: "Clientes que pidieron X también pidieron Y"
4. **Filtro Rápido**: Chips de categorías para filtrado rápido
5. **Animaciones**: Highlight cuando se actualiza un contador en tiempo real

---

## ✅ Checklist de Integración

- [ ] Actualizar interface `MenuItem` con nuevos campos
- [ ] Implementar filtro por categoría
- [ ] Crear sección de items populares
- [ ] Agregar badges de popularidad
- [ ] Implementar búsqueda con filtros
- [ ] Configurar cache de menú
- [ ] Conectar WebSocket para actualizaciones
- [ ] Testing con datos reales
- [ ] Validar edge cases (items sin pedidos, etc.)

---

**¿Necesitas más ejemplos?** Consulta la documentación completa en `MEJORAS_MENU.md`

