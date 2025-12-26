// =================================================================
// UTILIDADES PARA IMPORTACIÓN/EXPORTACIÓN DE EXCEL
// =================================================================
import * as XLSX from 'xlsx';
import type { MenuItem } from '../types/menu';
import type { Category } from '../types/categories';
import type { Ingredient } from '../types/ingredients';
import type { Accompaniment } from '../types/accompaniments';

// ============= TIPOS DE VALIDACIÓN =============
export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult<T = unknown> {
  success: boolean;
  data: T[];
  errors: ValidationError[];
  totalRows: number;
  validRows: number;
}

// Tipos específicos para los datos importados
export interface ImportedMenuItem {
  id?: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  ingredient_ids: string[];
  accompaniment_ids: string[];
}

export interface ImportedCategory {
  id?: string;
  name: string;
}

export interface ImportedIngredient {
  id?: string;
  name: string;
}

export interface ImportedAccompaniment {
  id?: string;
  name: string;
  price?: number;
}

// ============= EXPORTAR A EXCEL =============

export const exportMenuToExcel = (items: MenuItem[], filename = 'menu_export.xlsx') => {
  const data = items.map(item => ({
    'ID': item.id,
    'Nombre': item.name,
    'Descripción': item.description,
    'Precio': item.price,
    'Categoría ID': item.category_id,
    'Ingredientes (IDs separados por coma)': item.ingredients?.map(i => i.id).join(',') || '',
    'Acompañantes (IDs separados por coma)': item.accompaniments?.map(a => a.id).join(',') || '',
    'Activo': item.is_active ? 'Sí' : 'No',
  }));

  exportToExcel(data, filename, 'Menú');
};

export const exportCategoriesToExcel = (categories: Category[], filename = 'categorias_export.xlsx') => {
  const data = categories.map(cat => ({
    'ID': cat.id,
    'Nombre': cat.name,
  }));

  exportToExcel(data, filename, 'Categorías');
};

export const exportIngredientsToExcel = (ingredients: Ingredient[], filename = 'ingredientes_export.xlsx') => {
  const data = ingredients.map(ing => ({
    'ID': ing.id,
    'Nombre': ing.name,
  }));

  exportToExcel(data, filename, 'Ingredientes');
};

export const exportAccompanimentsToExcel = (accompaniments: Accompaniment[], filename = 'acompañantes_export.xlsx') => {
  const data = accompaniments.map(acc => ({
    'ID': acc.id,
    'Nombre': acc.name,
  }));

  exportToExcel(data, filename, 'Acompañantes');
};

// Función genérica para exportar
const exportToExcel = (data: any[], filename: string, sheetName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Ajustar ancho de columnas
  const maxWidth = 50;
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.min(Math.max(key.length, 10), maxWidth)
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, filename);
};

// ============= IMPORTAR DESDE EXCEL =============

export const importMenuFromExcel = (file: File): Promise<ImportResult<ImportedMenuItem>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const result = validateMenuData(jsonData);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
};

export const importCategoriesFromExcel = (file: File): Promise<ImportResult<ImportedCategory>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const result = validateCategoryData(jsonData);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
};

export const importIngredientsFromExcel = (file: File): Promise<ImportResult<ImportedIngredient>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const result = validateIngredientData(jsonData);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
};

export const importAccompanimentsFromExcel = (file: File): Promise<ImportResult<ImportedAccompaniment>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const result = validateAccompanimentData(jsonData);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
};

// ============= FUNCIONES DE VALIDACIÓN =============

const validateMenuData = (data: unknown[]): ImportResult<ImportedMenuItem> => {
  const errors: ValidationError[] = [];
  const validData: ImportedMenuItem[] = [];

  data.forEach((row: unknown, index: number) => {
    const rowNum = index + 2; // +2 porque Excel empieza en 1 y hay header
    const rowData = row as Record<string, unknown>;

    // Validar campos requeridos
    if (!rowData['Nombre'] || typeof rowData['Nombre'] !== 'string') {
      errors.push({ row: rowNum, field: 'Nombre', message: 'Nombre es requerido y debe ser texto' });
    }

    if (!rowData['Precio'] || isNaN(parseFloat(rowData['Precio'] as string))) {
      errors.push({ row: rowNum, field: 'Precio', message: 'Precio es requerido y debe ser un número' });
    }

    if (!rowData['Categoría ID']) {
      errors.push({ row: rowNum, field: 'Categoría ID', message: 'Categoría ID es requerido' });
    }

    // Si no hay errores críticos, añadir a datos válidos
    if (errors.filter(e => e.row === rowNum).length === 0) {
      validData.push({
        id: rowData['ID'] as string | undefined,
        name: rowData['Nombre'] as string,
        description: (rowData['Descripción'] as string) || '',
        price: parseFloat(rowData['Precio'] as string),
        category_id: rowData['Categoría ID'] as string,
        ingredient_ids: rowData['Ingredientes (IDs separados por coma)']
          ? (rowData['Ingredientes (IDs separados por coma)'] as string).toString().split(',').map((id: string) => id.trim()).filter(Boolean)
          : [],
        accompaniment_ids: rowData['Acompañantes (IDs separados por coma)']
          ? (rowData['Acompañantes (IDs separados por coma)'] as string).toString().split(',').map((id: string) => id.trim()).filter(Boolean)
          : [],
      });
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors,
    totalRows: data.length,
    validRows: validData.length,
  };
};

const validateCategoryData = (data: unknown[]): ImportResult<ImportedCategory> => {
  const errors: ValidationError[] = [];
  const validData: ImportedCategory[] = [];

  data.forEach((row: unknown, index: number) => {
    const rowNum = index + 2;
    const rowData = row as Record<string, unknown>;

    if (!rowData['Nombre'] || typeof rowData['Nombre'] !== 'string') {
      errors.push({ row: rowNum, field: 'Nombre', message: 'Nombre es requerido y debe ser texto' });
    }

    if (errors.filter(e => e.row === rowNum).length === 0) {
      validData.push({
        id: rowData['ID'] as string | undefined,
        name: rowData['Nombre'] as string,
      });
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors,
    totalRows: data.length,
    validRows: validData.length,
  };
};

const validateIngredientData = (data: unknown[]): ImportResult<ImportedIngredient> => {
  const errors: ValidationError[] = [];
  const validData: ImportedIngredient[] = [];

  data.forEach((row: unknown, index: number) => {
    const rowNum = index + 2;
    const rowData = row as Record<string, unknown>;

    if (!rowData['Nombre'] || typeof rowData['Nombre'] !== 'string') {
      errors.push({ row: rowNum, field: 'Nombre', message: 'Nombre es requerido y debe ser texto' });
    }

    if (errors.filter(e => e.row === rowNum).length === 0) {
      validData.push({
        id: rowData['ID'] as string | undefined,
        name: rowData['Nombre'] as string,
      });
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors,
    totalRows: data.length,
    validRows: validData.length,
  };
};

const validateAccompanimentData = (data: unknown[]): ImportResult<ImportedAccompaniment> => {
  const errors: ValidationError[] = [];
  const validData: ImportedAccompaniment[] = [];

  data.forEach((row: unknown, index: number) => {
    const rowNum = index + 2;
    const rowData = row as Record<string, unknown>;

    if (!rowData['Nombre'] || typeof rowData['Nombre'] !== 'string') {
      errors.push({ row: rowNum, field: 'Nombre', message: 'Nombre es requerido y debe ser texto' });
    }

    if (errors.filter(e => e.row === rowNum).length === 0) {
      validData.push({
        id: rowData['ID'] as string | undefined,
        name: rowData['Nombre'] as string,
      });
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors,
    totalRows: data.length,
    validRows: validData.length,
  };
};

// ============= GENERAR PLANTILLAS =============

export const downloadMenuTemplate = () => {
  const template = [
    {
      'ID': '(dejar vacío para nuevos items)',
      'Nombre': 'Ejemplo Item',
      'Descripción': 'Descripción del item',
      'Precio': 25.00,
      'Categoría ID': 'uuid-de-categoria',
      'Ingredientes (IDs separados por coma)': 'uuid1,uuid2,uuid3',
      'Acompañantes (IDs separados por coma)': 'uuid1,uuid2',
      'Activo': 'Sí',
    }
  ];

  exportToExcel(template, 'plantilla_menu.xlsx', 'Menú');
};

export const downloadCategoryTemplate = () => {
  const template = [
    {
      'ID': '(dejar vacío para nuevas categorías)',
      'Nombre': 'Ejemplo Categoría',
    }
  ];

  exportToExcel(template, 'plantilla_categorias.xlsx', 'Categorías');
};

export const downloadIngredientTemplate = () => {
  const template = [
    {
      'ID': '(dejar vacío para nuevos ingredientes)',
      'Nombre': 'Ejemplo Ingrediente',
    }
  ];

  exportToExcel(template, 'plantilla_ingredientes.xlsx', 'Ingredientes');
};

export const downloadAccompanimentTemplate = () => {
  const template = [
    {
      'ID': '(dejar vacío para nuevos acompañantes)',
      'Nombre': 'Ejemplo Acompañante',
    }
  ];

  exportToExcel(template, 'plantilla_acompañantes.xlsx', 'Acompañantes');
};

// ============= EXPORTACIÓN/IMPORTACIÓN UNIFICADA =============

/**
 * Exporta todos los datos del sistema en un solo archivo Excel con múltiples hojas
 */
export interface UnifiedExportData {
  menu?: MenuItem[];
  categories?: Category[];
  ingredients?: Ingredient[];
  accompaniments?: Accompaniment[];
}

export const exportAllDataToExcel = (data: UnifiedExportData, filename = 'turnychain_data.xlsx') => {
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Categorías (debe ir primero porque el menú las referencia)
  if (data.categories && data.categories.length > 0) {
    const categoriesData = data.categories.map(cat => ({
      'ID': cat.id,
      'Nombre': cat.name,
    }));
    const wsCategories = XLSX.utils.json_to_sheet(categoriesData);
    XLSX.utils.book_append_sheet(workbook, wsCategories, 'Categorías');
  }

  // Hoja 2: Ingredientes
  if (data.ingredients && data.ingredients.length > 0) {
    const ingredientsData = data.ingredients.map(ing => ({
      'ID': ing.id,
      'Nombre': ing.name,
    }));
    const wsIngredients = XLSX.utils.json_to_sheet(ingredientsData);
    XLSX.utils.book_append_sheet(workbook, wsIngredients, 'Ingredientes');
  }

  // Hoja 3: Acompañantes
  if (data.accompaniments && data.accompaniments.length > 0) {
    const accompanimentsData = data.accompaniments.map(acc => ({
      'ID': acc.id,
      'Nombre': acc.name,
    }));
    const wsAccompaniments = XLSX.utils.json_to_sheet(accompanimentsData);
    XLSX.utils.book_append_sheet(workbook, wsAccompaniments, 'Acompañantes');
  }

  // Hoja 4: Menú (va al final porque referencia a las otras hojas)
  if (data.menu && data.menu.length > 0) {
    const menuData = data.menu.map(item => ({
      'ID': item.id,
      'Nombre': item.name,
      'Descripción': item.description,
      'Precio': item.price,
      'Categoría ID': item.category_id,
      'Ingredientes (IDs separados por coma)': item.ingredients?.map(i => i.id).join(',') || '',
      'Acompañantes (IDs separados por coma)': item.accompaniments?.map(a => a.id).join(',') || '',
      'Activo': item.is_active ? 'Sí' : 'No',
    }));
    const wsMenu = XLSX.utils.json_to_sheet(menuData);
    XLSX.utils.book_append_sheet(workbook, wsMenu, 'Menú');
  }

  // Ajustar ancho de columnas para todas las hojas
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    worksheet['!cols'] = [
      { wch: 15 }, // ID
      { wch: 30 }, // Nombre
      { wch: 40 }, // Descripción
      { wch: 10 }, // Precio
      { wch: 15 }, // Otros
      { wch: 30 }, // Ingredientes
      { wch: 30 }, // Acompañantes
      { wch: 10 }, // Activo
    ];
  });

  XLSX.writeFile(workbook, filename);
};

/**
 * Importa todos los datos desde un archivo Excel unificado
 */
export interface UnifiedImportResult {
  success: boolean;
  categories: ImportResult<ImportedCategory>;
  ingredients: ImportResult<ImportedIngredient>;
  accompaniments: ImportResult<ImportedAccompaniment>;
  menu: ImportResult<ImportedMenuItem>;
  globalErrors: string[];
}

export const importAllDataFromExcel = (file: File): Promise<UnifiedImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const result: UnifiedImportResult = {
          success: true,
          categories: { success: true, data: [], errors: [], totalRows: 0, validRows: 0 },
          ingredients: { success: true, data: [], errors: [], totalRows: 0, validRows: 0 },
          accompaniments: { success: true, data: [], errors: [], totalRows: 0, validRows: 0 },
          menu: { success: true, data: [], errors: [], totalRows: 0, validRows: 0 },
          globalErrors: [],
        };

        // Validar que existan las hojas necesarias
        const requiredSheets = ['Categorías', 'Ingredientes', 'Acompañantes', 'Menú'];
        const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));

        if (missingSheets.length > 0) {
          result.globalErrors.push(`Faltan las siguientes hojas: ${missingSheets.join(', ')}`);
        }

        // Importar Categorías
        if (workbook.Sheets['Categorías']) {
          const categoriesJson = XLSX.utils.sheet_to_json(workbook.Sheets['Categorías']);
          result.categories = validateCategoryData(categoriesJson);
          if (!result.categories.success) result.success = false;
        }

        // Importar Ingredientes
        if (workbook.Sheets['Ingredientes']) {
          const ingredientsJson = XLSX.utils.sheet_to_json(workbook.Sheets['Ingredientes']);
          result.ingredients = validateIngredientData(ingredientsJson);
          if (!result.ingredients.success) result.success = false;
        }

        // Importar Acompañantes
        if (workbook.Sheets['Acompañantes']) {
          const accompanimentsJson = XLSX.utils.sheet_to_json(workbook.Sheets['Acompañantes']);
          result.accompaniments = validateAccompanimentData(accompanimentsJson);
          if (!result.accompaniments.success) result.success = false;
        }

        // Importar Menú
        if (workbook.Sheets['Menú']) {
          const menuJson = XLSX.utils.sheet_to_json(workbook.Sheets['Menú']);
          result.menu = validateMenuData(menuJson);
          if (!result.menu.success) result.success = false;
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Descarga plantilla unificada con todas las hojas
 */
export const downloadUnifiedTemplate = () => {
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Categorías
  const categoriesTemplate = [
    {
      'ID': '(dejar vacío para nuevas)',
      'Nombre': 'Ejemplo Categoría',
    }
  ];
  const wsCategories = XLSX.utils.json_to_sheet(categoriesTemplate);
  XLSX.utils.book_append_sheet(workbook, wsCategories, 'Categorías');

  // Hoja 2: Ingredientes
  const ingredientsTemplate = [
    {
      'ID': '(dejar vacío para nuevos)',
      'Nombre': 'Ejemplo Ingrediente',
    }
  ];
  const wsIngredients = XLSX.utils.json_to_sheet(ingredientsTemplate);
  XLSX.utils.book_append_sheet(workbook, wsIngredients, 'Ingredientes');

  // Hoja 3: Acompañantes
  const accompanimentsTemplate = [
    {
      'ID': '(dejar vacío para nuevos)',
      'Nombre': 'Ejemplo Acompañante',
    }
  ];
  const wsAccompaniments = XLSX.utils.json_to_sheet(accompanimentsTemplate);
  XLSX.utils.book_append_sheet(workbook, wsAccompaniments, 'Acompañantes');

  // Hoja 4: Menú
  const menuTemplate = [
    {
      'ID': '(dejar vacío para nuevos)',
      'Nombre': 'Ejemplo Plato',
      'Descripción': 'Descripción del plato',
      'Precio': 25.00,
      'Categoría ID': '(usar ID de la hoja Categorías)',
      'Ingredientes (IDs separados por coma)': 'uuid1,uuid2',
      'Acompañantes (IDs separados por coma)': 'uuid1,uuid2',
      'Activo': 'Sí',
    }
  ];
  const wsMenu = XLSX.utils.json_to_sheet(menuTemplate);
  XLSX.utils.book_append_sheet(workbook, wsMenu, 'Menú');

  XLSX.writeFile(workbook, 'turnychain_plantilla_completa.xlsx');
};

