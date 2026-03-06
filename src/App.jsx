import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function App() {
  const [data, setData] = useState({});
  const [rutaSeleccionada, setRutaSeleccionada] = useState("NL-NL");
  const [kiloSeleccionado, setKiloSeleccionado] = useState("1kg");
  const [modoOrden, setModoOrden] = useState("default"); 
  const [utilidadExtra, setUtilidadExtra] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const empresas = ["dhl", "fedex", "estafeta"];
      const tipos = ["terrestre", "aereo"];
      const rutas = ["NL-NL", "NL-CDMX", "TIJ-MED"];
      let result = {};

      for (let empresa of empresas) {
        result[empresa] = {};
        for (let tipo of tipos) {
          result[empresa][tipo] = {};
          for (let ruta of rutas) {
            result[empresa][tipo][ruta] = [];

            const kilosSnapshot = await getDocs(collection(db, `${empresa}/${tipo}/${ruta}`));
            const kilosOrdenados = kilosSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .sort((a, b) => parseInt(a.id) - parseInt(b.id));

            result[empresa][tipo][ruta] = kilosOrdenados;
          }
        }
      }

      setData(result);
    };

    fetchData();
  }, []);

  const kilosDisponibles = data.dhl?.terrestre?.[rutaSeleccionada]?.map(k => k.id) || [];

  // Orden natural: terrestre → aéreo
  const filasDefault = Object.keys(data).flatMap(empresa =>
    ["terrestre", "aereo"].map(tipo => {
      const kiloData = data[empresa]?.[tipo]?.[rutaSeleccionada]?.find(k => k.id === kiloSeleccionado);
      return kiloData ? { empresa, tipo, costo: Number(kiloData.costo) } : null;
    }).filter(Boolean)
  );

  // Aplicar orden según modo
  let filasOrdenadas = [...filasDefault];
  if (modoOrden === "asc") {
    filasOrdenadas.sort((a, b) => a.costo - b.costo);
  } else if (modoOrden === "desc") {
    filasOrdenadas.sort((a, b) => b.costo - a.costo);
  }

  // Exportar a Excel visual
const exportarExcel = () => {
  const rutas = ["NL-NL", "NL-CDMX", "TIJ-MED"];
  const empresas = ["dhl", "fedex", "estafeta"];

  const workbook = XLSX.utils.book_new();

  rutas.forEach(ruta => {
    let hojaData = [];

    empresas.forEach(empresa => {
      hojaData.push([`${empresa.toUpperCase()} (${ruta})`]);
      hojaData.push(["KG", "Terrestre", "Utilidad T.", "Aéreo", "Utilidad A."]);

      const kilosTerrestre = data[empresa]?.terrestre?.[ruta] || [];
      const kilosAereo = data[empresa]?.aereo?.[ruta] || [];
      const maxFilas = Math.max(kilosTerrestre.length, kilosAereo.length);

      for (let i = 0; i < maxFilas; i++) {
        const terrestre = kilosTerrestre[i];
        const aereo = kilosAereo[i];
        hojaData.push([
          terrestre?.id || aereo?.id || "",
          terrestre ? terrestre.costo : "",
          terrestre ? terrestre.costo + utilidadExtra : "",
          aereo ? aereo.costo : "",
          aereo ? aereo.costo + utilidadExtra : ""
        ]);
      }

      hojaData.push([]); // fila vacía para separar empresas
    });

    const worksheet = XLSX.utils.aoa_to_sheet(hojaData);

    // Merge para cada título de empresa (ej. A1:E1)
    const merges = [];
    hojaData.forEach((fila, idx) => {
      if (fila.length === 1 && fila[0].includes("(")) {
        merges.push({ s: { r: idx, c: 0 }, e: { r: idx, c: 4 } });
        const cellAddress = XLSX.utils.encode_cell({ r: idx, c: 0 });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
    });
    worksheet["!merges"] = merges;

    XLSX.utils.book_append_sheet(workbook, worksheet, ruta);
  });

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, "Cotizador.xlsx");
};

  return (
  <div className="min-h-screen bg-gray-100">
    {/* Navbar */}
    <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow">
      <h1 className="text-xl font-bold">Cotizador</h1>
      <div className="flex gap-6 items-center">
        <label className="text-white font-semibold">Zonas:</label>
        <select
          value={rutaSeleccionada}
          onChange={e => setRutaSeleccionada(e.target.value)}
          className="px-3 py-2 rounded bg-white text-black shadow"
        >
          {["NL-NL", "NL-CDMX", "TIJ-MED"].map(ruta => (
            <option key={ruta} value={ruta}>{ruta}</option>
          ))}
        </select>

        <label className="text-white font-semibold">Peso:</label>
        <select
          value={kiloSeleccionado}
          onChange={e => setKiloSeleccionado(e.target.value)}
          className="px-3 py-2 rounded bg-white text-black shadow"
        >
          {kilosDisponibles.map(kilo => (
            <option key={kilo} value={kilo}>{kilo}</option>
          ))}
        </select>

        <label className="text-white font-semibold">Utilidad:</label>
        <input
          type="text"
          value={utilidadExtra}
          onChange={e => setUtilidadExtra(Number(e.target.value))}
          className="px-3 py-2 rounded bg-white text-black shadow"
          placeholder="15.ej"
        />
      </div>
    </nav>

    {/* Tabla en la web */}
    <div className="max-w-5xl mx-auto mt-8 bg-white shadow rounded p-6">
      <h2 className="text-2xl font-semibold mb-4">
        Resultados para {rutaSeleccionada} - {kiloSeleccionado}
      </h2>

      {/* Botón de orden */}
      <div className="mb-4">
        <button
          onClick={() =>
            setModoOrden(
              modoOrden === "default" ? "asc" : modoOrden === "asc" ? "desc" : "default"
            )
          }
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          {modoOrden === "default" && "Orden por defecto (Terrestre → Aéreo)"}
          {modoOrden === "asc" && "Ordenar de más barato a más costoso"}
          {modoOrden === "desc" && "Ordenar de más costoso a más barato"}
        </button>
      </div>

      <table className="table-auto border-collapse border border-gray-300 w-full">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">Empresa</th>
            <th className="border px-4 py-2">Tipo</th>
            <th className="border px-4 py-2">Costo</th>
            <th className="border px-4 py-2">Utilidad</th>
          </tr>
        </thead>
        <tbody>
          {filasOrdenadas.map(fila => (
            <tr key={`${fila.empresa}-${fila.tipo}`} className="hover:bg-gray-100">
              <td className="border px-4 py-2 flex items-center gap-2">
                <img
                  src={`/tarifario/images/${fila.empresa}.png`}
                  alt={fila.empresa}
                  className="w-5 h-5"
                />
                {fila.empresa.toUpperCase()}
              </td>
              <td className="border px-4 py-2 capitalize">{fila.tipo}</td>
              <td className="border px-4 py-2 font-semibold">${fila.costo}</td>
              <td className="border px-4 py-2 font-semibold">${fila.costo + utilidadExtra}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Botón exportar */}
      <button
        onClick={exportarExcel}
        className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Exportar a Excel
      </button>
    </div>
  </div>
);
}

export default App;
