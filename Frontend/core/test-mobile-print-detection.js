// =================================================================
// TEST SCRIPT: Verificar detección de dispositivos móviles
// =================================================================
// Para probar este script, abre la consola del navegador y pégalo

console.log('🧪 === TEST DE DETECCIÓN DE DISPOSITIVOS ===\n');

// 1. Verificar User Agent
console.log('📱 User Agent:', navigator.userAgent);

// 2. Detectar si es móvil (misma lógica que printUtils.ts)
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log(`\n🎯 Dispositivo detectado: ${isMobile ? '📱 MÓVIL' : '🖥️ DESKTOP'}`);

// 3. Información adicional
console.log('\n📊 Información del dispositivo:');
console.log('- Ancho de pantalla:', window.innerWidth, 'px');
console.log('- Alto de pantalla:', window.innerHeight, 'px');
console.log('- Touch enabled:', 'ontouchstart' in window);
console.log('- Orientación:', window.innerWidth > window.innerHeight ? 'Horizontal' : 'Vertical');

// 4. Verificar soporte de impresión
console.log('\n🖨️ Soporte de impresión:');
console.log('- window.print:', typeof window.print === 'function' ? '✅' : '❌');
console.log('- window.open:', typeof window.open === 'function' ? '✅' : '❌');

// 5. Método de impresión que se usará
console.log(`\n✅ Método de impresión a usar: ${isMobile ? 'IFRAME (Móvil)' : 'WINDOW.OPEN (Desktop)'}`);

console.log('\n===========================================\n');

// PRUEBA OPCIONAL: Crear y limpiar iframe de prueba
if (isMobile) {
  console.log('🧪 Probando creación de iframe...');

  try {
    const testIframe = document.createElement('iframe');
    testIframe.style.position = 'fixed';
    testIframe.style.top = '-10000px';
    testIframe.style.width = '80mm';
    document.body.appendChild(testIframe);

    console.log('✅ Iframe creado exitosamente');
    console.log('- Documento accesible:', !!testIframe.contentWindow?.document ? '✅' : '❌');

    // Limpiar
    document.body.removeChild(testIframe);
    console.log('✅ Iframe eliminado exitosamente');
    console.log('\n✨ ¡La impresión móvil debería funcionar!');
  } catch (error) {
    console.error('❌ Error al probar iframe:', error);
  }
}

