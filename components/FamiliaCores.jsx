import React, { useState, useMemo } from "react";
import { Palette, Package, ChevronRight, ArrowLeft, ShoppingCart, AlertTriangle } from "lucide-react";
import EstoqueListagem from "@/components/EstoqueListagem";

// Lista de cores conhecidas (frases primeiro, depois palavras simples)
const COLOR_KEYWORDS = [
  "OFF WHITE", "WHITE", "BLACK", "BEGE", "BEIGE", "CREME", "CINZA", "GRAY", "GREY",
  "CASTANHO", "MARROM", "BROWN", "PRETO", "BRANCO", "VERMELHO", "RED", "AZUL", "BLUE",
  "MARINHO", "NAVY", "VERDE", "GREEN", "AMARELO", "YELLOW", "LARANJA", "ORANGE",
  "ROXO", "PURPLE", "ROSA", "PINK", "GRAFITE", "GRAFIT", "CAMEL", "TERRACOTA",
  "CARAMELO", "TABACO", "AREIA", "SAND", "NUDE", "CHAMPAGNE", "DOURADO", "GOLD",
  "PRATA", "SILVER", "PETROLEO", "PETRÓLEO", "FENDI", "CHUMBO", "COGNAC", "COGNAQUE",
  "TURQUESA", "TURQUOISE", "BORDÔ", "BORDO", "VINHO", "WINE", "COBRE", "COPPER",
];
const SORTED_KEYWORDS = [...COLOR_KEYWORDS].sort((a, b) => b.length - a.length);

const COLOR_SWATCH = {
  WHITE: "#eef2f6", "OFF WHITE": "#f4f1ea", BRANCO: "#eef2f6",
  BLACK: "#1c1917", PRETO: "#1c1917", MARINHO: "#1e3a8a", NAVY: "#1e3a8a",
  GRAFITE: "#475569", GRAFIT: "#475569", CHUMBO: "#6b7280", CINZA: "#9aa6b8",
  GRAY: "#9aa6b8", GREY: "#9aa6b8", PRATA: "#c0c6cf", SILVER: "#c0c6cf",
  BEGE: "#e7d8c4", BEIGE: "#e7d8c4", CREME: "#f3ead3", AREIA: "#d6c4a8",
  SAND: "#d6c4a8", NUDE: "#e8d5c4", CAMEL: "#c69a5a", FENDI: "#caa472",
  CHAMPAGNE: "#e8d9b8", CARAMELO: "#b07d4a", TABACO: "#7a5230", COGNAC: "#9c5a2a",
  COGNAQUE: "#9c5a2a", CASTANHO: "#6b4226", MARROM: "#6b4226", BROWN: "#6b4226",
  TERRACOTA: "#c2410c", LARANJA: "#f97316", ORANGE: "#f97316", COBRE: "#b87333",
  COPPER: "#b87333", DOURADO: "#d4af37", GOLD: "#d4af37",
  VERMELHO: "#dc2626", RED: "#dc2626", BORDÔ: "#7f1d1d", BORDO: "#7f1d1d",
  VINHO: "#7f1d1d", WINE: "#7f1d1d", ROSA: "#ec4899", PINK: "#ec4899",
  ROXO: "#7c3aed", PURPLE: "#7c3aed", AZUL: "#2563eb", BLUE: "#2563eb",
  VERDE: "#16a34a", GREEN: "#16a34a", TURQUESA: "#14b8a6", TURQUOISE: "#14b8a6",
  AMARELO: "#eab308", YELLOW: "#eab308", PETROLEO: "#0f766e", "PETRÓLEO": "#0f766e",
};

function extractColor(desc) {
  if (!desc) return "OUTROS";
  const upper = desc.toUpperCase();
  for (const c of SORTED_KEYWORDS) {
    const cu = c.toUpperCase();
    const idx = upper.indexOf(cu);
    if (idx < 0) continue;
    const before = idx === 0 || /[\s\-\/]/.test(upper[idx - 1]);
    const afterEnd = idx + cu.length;
    const after = afterEnd >= upper.length || /[\s\-\/]/.test(upper[afterEnd]);
    if (before && after) return cu;
  }
  const parts = desc.split(/\s*[-–]\s*/);
  const last = parts[parts.length - 1]
    .trim()
    .replace(/\s*\(COM MARCA D'?AGUA\)\s*$/i, "")
    .replace(/\s*COM MARCA D'?AGUA\s*$/i, "")
    .trim();
  return (last || "OUTROS").toUpperCase();
}

export default function FamiliaCores({ family, items, accent, comprasByProduto = {}, consumoByProduto = {}, onBack }) {
  const [selectedColor, setSelectedColor] = useState(null);

  const colorGroups = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      const cor = extractColor(i.descricao);
      if (!map.has(cor)) map.set(cor, []);
      map.get(cor).push(i);
    });
    return Array.from(map.entries()).map(([cor, itens]) => {
      const produtosSet = new Set(itens.map((i) => String(i.produto)));
      let open = 0;
      let consumoTotal = 0;
      let critical = 0;
      produtosSet.forEach((p) => {
        open += (comprasByProduto[p] || []).reduce((a, c) => a + (c.qtd_aberto || 0), 0);
        const cons = consumoByProduto[p];
        const mensal = cons?.consumo_mensal || 0;
        consumoTotal += mensal;
        if (mensal > 0) {
          const stock = itens.filter((i) => String(i.produto) === p).reduce((s, i) => s + (i.quantidade || 0), 0);
          const daily = mensal / 30;
          if ((stock + (comprasByProduto[p] || []).reduce((a, c) => a + (c.qtd_aberto || 0), 0)) / daily <= 90) critical++;
        }
      });
      const stockTotal = itens.reduce((s, i) => s + (i.quantidade || 0), 0);
      const daily = consumoTotal / 30;
      const cobertura = daily > 0 ? (stockTotal + open) / daily : null;
      return {
        cor,
        itens,
        qty: stockTotal,
        produtos: produtosSet.size,
        open,
        consumoTotal,
        cobertura,
        critical,
        swatch: COLOR_SWATCH[cor] || "#9aa6b8",
      };
    }).sort((a, b) => b.qty - a.qty);
  }, [items, comprasByProduto, consumoByProduto]);

  if (selectedColor) {
    const grp = colorGroups.find((g) => g.cor === selectedColor);
    return (
      <div className="mt-8">
        <button
          onClick={() => setSelectedColor(null)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-200/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para cores
        </button>
        <EstoqueListagem
          family={`${family} • ${selectedColor}`}
          items={grp.itens}
          accent={accent}
          comprasByProduto={comprasByProduto}
          consumoByProduto={consumoByProduto}
        />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-200/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para famílias
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">
            {family} <span className="text-blue-200/70 text-sm">• escolha a cor</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {colorGroups.map((g) => (
          <button
            key={g.cor}
            onClick={() => setSelectedColor(g.cor)}
            className="group relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm p-5 border border-white/15 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left"
          >
            <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: g.swatch }}></div>
            <div className="flex items-start justify-between mb-4 mt-1">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center ring-2 ring-white/10 shadow-inner" style={{ backgroundColor: g.swatch }}>
                <Palette className="w-5 h-5 text-white/90 drop-shadow" />
              </div>
              <ChevronRight className="w-5 h-5 text-blue-200/50 group-hover:text-blue-200 transition-colors" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 leading-tight">{g.cor}</h3>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.swatch }}></span>
              <span className="text-xs text-blue-200/70 font-medium">
                {g.produtos} {g.produtos === 1 ? "produto" : "produtos"}
              </span>
              {g.cobertura !== null && (
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-md ${g.cobertura <= 90 ? "text-red-200 bg-red-500/20" : g.cobertura <= 120 ? "text-amber-200 bg-amber-500/20" : "text-emerald-200 bg-emerald-500/20"}`}>
                  {Math.round(g.cobertura)} dias
                </span>
              )}
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-2xl font-bold text-white">
                  {(g.qty + g.open).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                </p>
                <p className="text-xs text-blue-200/70">estoque + compra</p>
              </div>
              <div className="flex items-center gap-1.5">
                {g.open > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200 bg-amber-500/20 px-2 py-1 rounded-md">
                    <ShoppingCart className="w-3 h-3" />
                    {g.open.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </span>
                )}
                {g.critical > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-200 bg-red-500/20 px-2 py-1 rounded-md">
                    <AlertTriangle className="w-3 h-3" />
                    {g.critical}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}