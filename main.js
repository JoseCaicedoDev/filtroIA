// main.js
// Código JS separado de index.html para lógica de mapa y filtros

// Initialize map
const map = L.map('map').setView([4.5709, -74.2973], 6); // Colombia center

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let currentMarkers = [];
let selectedFeatures = [];

// Wrapper para compatibilidad con llamadas existentes
async function processNaturalLanguage(instruction) {
  // delega al procesador que usa la IA y devuelve su resultado
  return await procesarInstruccionConOpenAI(instruction);
}

// Clear current selection
function clearSelection() {
  // No markers to clear
  selectedFeatures = [];
  document.getElementById('resultsPanel').classList.add('hidden');
  updateStatus('Selección limpiada', 'success');
}

// Update status
function updateStatus(message, type = 'info') {
  const statusPanel = document.getElementById('statusPanel');
  // Si no existe el elemento statusPanel (fue removido en el HTML), no intentamos modificarlo
  if (!statusPanel) {
    console.warn('updateStatus: elemento #statusPanel no encontrado. Mensaje:', message);
    return;
  }
  const colors = {
    success: 'bg-green-500/20 border-green-500/30',
    error: 'bg-red-500/20 border-red-500/30',
    processing: 'bg-yellow-500/20 border-yellow-500/30',
    info: 'bg-blue-500/20 border-blue-500/30'
  };

  const dotColors = {
    success: 'bg-green-400',
    error: 'bg-red-400',
    processing: 'bg-yellow-400',
    info: 'bg-blue-400'
  };

  statusPanel.className = `mt-6 p-3 rounded-lg border ${colors[type]}`;
  statusPanel.innerHTML = `
        <div class="flex items-center">
            <div class="w-2 h-2 ${dotColors[type]} rounded-full mr-2"></div>
            <span class="text-sm text-gray-300">${message}</span>
        </div>
    `;
}

// Show results
function showResults(result) {
  const resultsPanel = document.getElementById('resultsPanel');
  const resultsContent = document.getElementById('resultsContent');

  let content = `<div class="space-y-3">`;

  if (result.tipo === 'filtro') {
    content += `<div class="bg-black/20 p-3 rounded-lg">`;
    content += `<h4 class="font-medium text-white mb-2">Filtros Aplicados:</h4>`;
    result.filtros.forEach(filtro => {
      content += `<div class="text-sm"><span class="text-blue-400">${filtro.campo}:</span> ${filtro.valor}</div>`;
    });
    content += `</div>`;

    if (result.results) {
      content += `<div class="bg-black/20 p-3 rounded-lg">`;
      content += `<h4 class="font-medium text-white mb-2">Resultados (${result.results.length}):</h4>`;
      result.results.forEach(item => {
        content += `<div class="text-sm py-1 border-b border-white/10 last:border-b-0">${item.name} - ${item.depto}</div>`;
      });
      content += `</div>`;
    }
  } else if (result.tipo === 'coordenada') {
    content += `<div class="bg-black/20 p-3 rounded-lg">`;
    content += `<h4 class="font-medium text-white mb-2">Selección por Coordenada:</h4>`;
    content += `<div class="text-sm">X: ${result.x}</div>`;
    content += `<div class="text-sm">Y: ${result.y}</div>`;
    content += `<div class="text-sm">EPSG: ${result.epsg}</div>`;
    content += `</div>`;
  }

  content += `</div>`;
  resultsContent.innerHTML = content;
  resultsPanel.classList.remove('hidden');
}

// Process instruction
async function processInstruction() {
  const instruction = document.getElementById('naturalLanguageInput').value.trim();

  if (!instruction) {
    updateStatus('Por favor ingrese una instrucción', 'error');
    return;
  }

  // Show loading
  document.getElementById('loadingModal').classList.remove('hidden');
  updateStatus('Procesando instrucción...', 'processing');

  try {
    const result = await processNaturalLanguage(instruction);

    // Hide loading
    document.getElementById('loadingModal').classList.add('hidden');

    // Apply results to map
    if (result.tipo === 'filtro' && result.results) {
      // No markers or popups to highlight
      selectedFeatures = result.results;
      updateStatus(`${result.results.length} elementos seleccionados`, 'success');
    } else if (result.tipo === 'coordenada') {
      // No marker or popup for coordinates
      map.setView([result.y, result.x], 10);
      updateStatus('Vista centrada en la coordenada', 'success');
    }

    showResults(result);

  } catch (error) {
    document.getElementById('loadingModal').classList.add('hidden');
    updateStatus('Error al procesar instrucción', 'error');
    console.error('Error:', error);
  }
}

// Agregar mensajes de depuración y manejo robusto para la respuesta de OpenAI
async function procesarInstruccionConOpenAI(instruccion) {
  const prompt = `Estás trabajando con información geográfica oficial del DANE (Colombia), basada en la división político-administrativa nacional (DIVIPOLA).

Los campos disponibles para filtrar en esta capa son:
- DPTO_CCDGO
- MPIO_CCDGO
- DEPTO
- MPIO_CNMBR

# Contexto de campos DANE:
- "DPTO_CCDGO": código de departamento (2 dígitos).
- "MPIO_CCDGO": código de municipio (3 dígitos).
- Combinación DPTO_CCDGO + MPIO_CCDGO identifica un municipio único.
- "DEPTO": nombre del departamento.
- "MPIO_CNMBR": nombre del municipio.

# Sobre coordenadas:
- Si el usuario escribe coordenadas, debes devolver un objeto JSON con:
  {"tipo": "coordenada", "x": ..., "y": ..., "epsg": 4326}
- La coordenada X (longitud) debe estar en el hemisferio occidental: **negativa**. Corrige si el usuario la da como positiva.
- Si se usa coma (",") como decimal, interprétalo como punto (".").

Con base en la instrucción del usuario:
"${instruccion}"

Devuelve ÚNICAMENTE uno de los siguientes formatos JSON (sin explicación):

1. {"tipo": "filtro", "filtros": [{"campo": "CAMPO", "valor": "VALOR"}]}
2. {"tipo": "coordenada", "x": -74.05, "y": 4.65, "epsg": 4326}

# Reglas:
- Solo usa los campos disponibles.
- Usa comillas dobles.
- Escribe todos los valores en MAYÚSCULAS.
- Sin comentarios ni explicaciones, solo el JSON.`;

  try {
    console.log('Enviando instrucción a OpenRouter:', instruccion);
    const respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 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`
      },
      body: JSON.stringify({
        model: 'amazon/nova-lite-v1',
        messages: [
          { role: 'system', content: 'Devuelve solo JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    const datos = await respuesta.json();
    console.log('Respuesta de OpenAI:', datos, 'status:', respuesta.status);

    if (!respuesta.ok) {
      console.error('OpenAI API returned non-OK status', respuesta.status, datos);
      return { error: true, status: respuesta.status, body: datos };
    }

    // extraer texto seguro (completions puede devolver choices[0].text o choices[0].message.content)
    const rawText = datos && datos.choices && datos.choices[0]
      ? (datos.choices[0].text || (datos.choices[0].message && datos.choices[0].message.content) || null)
      : null;

    if (!rawText) {
      console.error('OpenAI response missing text content:', datos);
      return { error: true, reason: 'missing_text', body: datos };
    }

    let resultado;
    try {
      // Limpiar posibles fences de markdown o backticks que envuelve la respuesta
      let cleaned = rawText.trim();
      // Remove leading ```json or ``` and trailing ```
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      // Remove wrapping single or triple backticks if any remain
      cleaned = cleaned.replace(/^`+|`+$/g, '').trim();
      // Si no comienza con {, intentar extraer el primer bloque JSON que aparezca
      if (!cleaned.startsWith('{')) {
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) cleaned = m[0];
      }

      resultado = JSON.parse(cleaned);
    } catch (err) {
      console.error('No se pudo parsear JSON desde la respuesta de OpenRouter. Raw:', rawText);
      console.error('Versión limpiada antes de parsear:', cleaned);
      console.error('Error de parseo:', err);
      return { error: true, reason: 'parse_error', rawText };
    }

    console.log('Resultado procesado:', resultado);

    if (resultado.tipo === 'filtro') {
      const municipiosFiltrados = municipio.features.filter(feature => {
        return resultado.filtros.every(filtro => feature.properties[filtro.campo] === filtro.valor);
      });

      const nuevaCapa = {
        ...municipio,
        features: municipiosFiltrados
      };

      map.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
          map.removeLayer(layer);
        }
      });

      L.geoJSON(nuevaCapa, {
        style: { color: '#2232c5', weight: 1, fillOpacity: 0.2 }
      }).addTo(map);

    } else if (resultado.tipo === 'coordenada') {
      map.setView([resultado.y, resultado.x], 10);
    }

    console.log('Capa actualizada según la instrucción:', instruccion);
    return resultado;
  } catch (error) {
    console.error('Error al procesar la instrucción con OpenAI:', error);
    return { error: true, message: error.message || String(error) };
  }
}

// Cargar capa municipio desde municipio.js al inicializar el mapa
const municipioStyle = { color: '#22c55e', weight: 1, fillOpacity: 0.2 };

const geojsonLayer = L.geoJSON(municipio, {
  style: municipioStyle
}).addTo(map);

const bounds = geojsonLayer.getBounds();
if (bounds.isValid()) map.fitBounds(bounds);

updateStatus('Capa municipio cargada desde municipio.js', 'success');

// Event listeners
document.getElementById('processBtn').addEventListener('click', processInstruction);
document.getElementById('clearBtn').addEventListener('click', clearSelection);

// Enter key support for textarea
document.getElementById('naturalLanguageInput').addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'Enter') {
    processInstruction();
  }
});

// Event listener para la caja de instrucciones
const cajaInstrucciones = document.getElementById('naturalLanguageInput');
cajaInstrucciones.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const instruccion = cajaInstrucciones.value.trim();
    if (instruccion) {
      procesarInstruccionConOpenAI(instruccion);
    }
  }
});

// Asegurar que el evento se configure después de que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function () {
  const botonProcesar = document.getElementById('processBtn');
  if (botonProcesar) {
    console.log('Botón identificado correctamente:', botonProcesar);
    botonProcesar.addEventListener('click', function () {
      console.log('Evento de clic disparado');
      const cajaInstrucciones = document.getElementById('naturalLanguageInput');
      if (cajaInstrucciones) {
        console.log('Caja de instrucciones identificada:', cajaInstrucciones);
        const instruccion = cajaInstrucciones.value.trim();
        console.log('Instrucción obtenida:', instruccion);
        if (instruccion) {
          procesarInstruccionConOpenAI(instruccion);
        } else {
          console.warn('No se ingresó ninguna instrucción');
        }
      } else {
        console.error('No se pudo identificar la caja de instrucciones en el DOM');
      }
    });
  } else {
    console.error('No se pudo identificar el botón processBtn en el DOM');
  }
});
