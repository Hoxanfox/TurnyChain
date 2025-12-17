// =================================================================
// 🧪 SCRIPT DE DEPURACIÓN - Copiar y pegar en la consola del navegador
// =================================================================

// Ejecuta este script en la consola del navegador (F12 > Console)
// después de abrir el detalle de una orden

console.log('🔍 === INICIANDO DEPURACIÓN DE ORDEN ===');

// 1. Verificar el estado de Redux
const state = window.__REDUX_DEVTOOLS_EXTENSION__ ?
  window.__REDUX_DEVTOOLS_EXTENSION__.store.getState() :
  null;

if (state) {
  console.log('✅ Redux State encontrado');

  const orderDetails = state.orders?.selectedOrderDetails;

  if (orderDetails) {
    console.log('✅ Detalle de orden encontrado:', orderDetails.id);
    console.log('📊 Total de items:', orderDetails.items.length);

    orderDetails.items.forEach((item, index) => {
      console.log(`\n📦 Item ${index + 1}: ${item.menu_item_name}`);
      console.log('  - Cantidad:', item.quantity);
      console.log('  - Precio:', item.price_at_order);
      console.log('  - Notas:', item.notes || '(ninguna)');

      // Verificar customizations
      if (item.customizations) {
        console.log('  🎨 Customizations:');
        console.log('    - removed_ingredients:', item.customizations.removed_ingredients?.length || 0);
        console.log('    - selected_accompaniments:', item.customizations.selected_accompaniments?.length || 0);
        console.log('    - all_ingredients:', item.customizations.all_ingredients?.length || 0);
        console.log('    - all_accompaniments:', item.customizations.all_accompaniments?.length || 0);

        // Mostrar listas completas
        if (item.customizations.all_ingredients && item.customizations.all_ingredients.length > 0) {
          console.log('    ✅ all_ingredients presente:');
          item.customizations.all_ingredients.forEach(ing => {
            const isRemoved = item.customizations.removed_ingredients?.find(r => r.id === ing.id);
            console.log(`      ${isRemoved ? '✗' : '✓'} ${ing.name}`);
          });
        } else {
          console.log('    ⚠️  all_ingredients NO presente o vacío');
        }

        if (item.customizations.all_accompaniments && item.customizations.all_accompaniments.length > 0) {
          console.log('    ✅ all_accompaniments presente:');
          item.customizations.all_accompaniments.forEach(acc => {
            const isSelected = item.customizations.selected_accompaniments?.find(s => s.id === acc.id);
            console.log(`      ${isSelected ? '✓' : '✗'} ${acc.name}`);
          });
        } else {
          console.log('    ⚠️  all_accompaniments NO presente o vacío');
        }
      } else {
        console.log('  ⚠️  No hay customizations');
      }

      // Verificar campos directos en item
      if (item.all_ingredients && item.all_ingredients.length > 0) {
        console.log('  ✅ all_ingredients en item (nivel superior):', item.all_ingredients.length);
      }
      if (item.all_accompaniments && item.all_accompaniments.length > 0) {
        console.log('  ✅ all_accompaniments en item (nivel superior):', item.all_accompaniments.length);
      }
    });

    console.log('\n📋 === RESUMEN ===');
    console.log('Si ves "⚠️  NO presente o vacío" arriba, significa que el backend NO está enviando los datos completos.');
    console.log('Verifica que el backend esté devolviendo all_ingredients y all_accompaniments en el JSON.');

  } else {
    console.log('❌ No hay orden seleccionada. Abre el detalle de una orden primero.');
  }
} else {
  console.log('❌ No se puede acceder al estado de Redux.');
  console.log('Intenta acceder manualmente: window.store?.getState()');
}

console.log('\n🔍 === FIN DE DEPURACIÓN ===');

