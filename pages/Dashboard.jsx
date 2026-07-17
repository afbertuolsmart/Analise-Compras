const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Package, Boxes, Layers, TrendingUp, Search, ChevronDown, ShoppingCart, AlertTriangle, Check } from "lucide-react";
import FamiliaCores from "@/components/FamiliaCores";

const FAMILY_COLORS = {
  "COMFY": { accent: "#0a1849", bar: "bg-blue-950" },
  "FLEX": { accent: "#0d2266", bar: "bg-blue-900" },
  "GLITTER": { accent: "#102d7a", bar: "bg-indigo-950" },
  "PEQUIM": { accent: "#143682", bar: "bg-indigo-900" },
  "CEDRO": { accent: "#183a8a", bar: "bg-blue-900" },
  "SHANGHAI": { accent: "#1e40af", bar: "bg-indigo-950" },
  "SHENZEN": { accent: "#2346b8", bar: "bg-blue-800" },
  "SUPREME CHASSI": { accent: "#1d3a7a", bar: "bg-indigo-900" },
  "PELICA": { accent: "#0f1f5c", bar: "bg-blue-950" },
  "SARDENHA": { accent: "#15287a", bar: "bg-slate-900" },
  "WZ VITÓRIA": { accent: "#122a66", bar: "bg-indigo-950" },
  "TECIDOS": { accent: "#0a1234", bar: "bg-slate-950" },
};

const getColor = (name) => FAMILY_COLORS[name] || { accent: "#143682", bar: "bg-blue-900" };

export default function Dashboard() {
  const [items, setItems] = useState(null);
  const [compras, setCompras] = useState(null);
  const [consumoByProduto, setConsumoByProduto] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedFamilies, setSelectedFamilies] = useState([]);

  useEffect(() => {
    db.entities.EstoqueItem.list("-colecao", 500).then(setItems);
    db.entities.CompraItem.list("-num_oc", 500).then(setCompras);
    (async () => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 12);
      const map = {};
      let skip = 0;
      while (true) {
        const batch = await db.entities.ConsumoItem.list("-dt_movto", 500, skip);
        if (!batch || batch.length === 0) break;
        batch.forEach((m) => {
          if (new Date(m.dt_movto) < cutoff) return;
          const k = String(m.produto);
          if (!map[k]) map[k] = { produto: m.produto, consumo_mensal: 0 };
          map[k].consumo_mensal += m.qtd_movimentada || 0;
        });
        if (batch.length < 500) break;
        if (new Date(batch[batch.length - 1].dt_movto) < cutoff) break;
        skip += 500;
      }
      Object.values(map).forEach((v) => (v.consumo_mensal = v.consumo_mensal / 12));
      setConsumoByProduto(map);
    })();
  }, []);

  if (items === null || compras === null || consumoByProduto === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1234]">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-blue-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  const normalizeProduto = (p) => String(p);

  // Normaliza códigos dos itens de estoque para unificar produtos equivalentes
  const normItems = items.map((i) => ({ ...i, produto: Number(normalizeProduto(i.produto)) }));

  // Group by collection
  const groups = {};
  normItems.forEach((item) => {
    if (!groups[item.colecao]) groups[item.colecao] = [];
    groups[item.colecao].push(item);
  });

  // Map product code -> purchase orders
  const comprasByProduto = {};
  compras.forEach((c) => {
    const key = normalizeProduto(c.produto);
    if (!comprasByProduto[key]) comprasByProduto[key] = [];
    comprasByProduto[key].push(c);
  });

  // Itens com compra que não existem no estoque -> adicionados na família SHANGHAI
  const stockProdutos = new Set(normItems.map((i) => String(i.produto)));
  const orphanCodigos = Array.from(
    new Set(compras.map((c) => normalizeProduto(c.produto)).filter((k) => !stockProdutos.has(k)))
  );
  if (orphanCodigos.length > 0) {
    if (!groups["SHANGHAI"]) groups["SHANGHAI"] = [];
    orphanCodigos.forEach((codigo) => {
      const comp = compras.find((c) => normalizeProduto(c.produto) === codigo);
      const prefix = (comp.descricao_produto || "").toUpperCase();
      const sibling = normItems.find(
        (i) => i.colecao === "SHANGHAI" && i.descricao && i.descricao.toUpperCase().startsWith(prefix)
      );
      const virtual = {
        produto: Number(codigo),
        colecao: "SHANGHAI",
        descricao: (sibling && sibling.descricao) || comp.descricao_produto || `Produto ${comp.produto}`,
        quantidade: 0,
      };
      normItems.push(virtual);
      groups["SHANGHAI"].push(virtual);
      stockProdutos.add(codigo);
    });
  }

  const families = Object.keys(groups).sort();

  const toggleFamily = (f) =>
    setSelectedFamilies((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  const selectAll = () => setSelectedFamilies(families);
  const clearSelection = () => setSelectedFamilies([]);

  const activeItems = selectedFamilies.length > 0
    ? selectedFamilies.flatMap((f) => groups[f] || [])
    : normItems;
  const listingLabel =
    selectedFamilies.length === 0
      ? "Todas as famílias"
      : selectedFamilies.length === 1
        ? selectedFamilies[0]
        : `${selectedFamilies.length} famílias selecionadas`;
  const listingKey = selectedFamilies.length > 0 ? selectedFamilies.join("-") : "all";
  const listingAccent = selectedFamilies.length > 0 ? getColor(selectedFamilies[0]).accent : "#143682";

  const totalQty = normItems.reduce((sum, i) => sum + (i.quantidade || 0), 0);
  const totalProducts = new Set(normItems.map((i) => String(i.produto))).size;
  const comprasNoEstoque = compras.filter((c) => stockProdutos.has(normalizeProduto(c.produto)));
  const totalCompraAberto = comprasNoEstoque.reduce((sum, c) => sum + (c.qtd_aberto || 0), 0);
  const totalOCs = new Set(comprasNoEstoque.map((c) => c.num_oc)).size;

  // Estoque físico por produto (após alias)
  const stockByProduto = {};
  normItems.forEach((i) => {
    const k = String(i.produto);
    stockByProduto[k] = (stockByProduto[k] || 0) + (i.quantidade || 0);
  });

  // Itens críticos: cobertura (estoque + compra aberto) / consumo diário <= 90 dias
  const LEAD_TIME = 90;
  let criticalCount = 0;
  Object.values(consumoByProduto).forEach((c) => {
    const mensal = c.consumo_mensal || 0;
    if (mensal <= 0) return;
    const daily = mensal / 30;
    const k = String(c.produto);
    const stock = stockByProduto[k] || 0;
    const open = (comprasByProduto[k] || []).reduce((a, o) => a + (o.qtd_aberto || 0), 0);
    if ((stock + open) / daily <= LEAD_TIME) criticalCount++;
  });

  // Filter blocks by search
  const filteredFamilies = search
    ? families.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : families;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1234] via-[#0a1849] to-[#102d7a]">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a1234]/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shadow-md">
                <Boxes className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Dashboard de Estoque</h1>
                <p className="text-xs text-blue-200/70">Controle de famílias e produtos</p>
              </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/70" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar família..."
              className="pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-blue-400 focus:bg-white/10 focus:outline-none text-sm text-white placeholder:text-blue-200/50 w-64 transition-all"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-200/70 font-medium">Famílias</span>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{families.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-200/70 font-medium">Produtos únicos</span>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{totalProducts}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-200/70 font-medium">Qtd. total física</span>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{totalQty.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>
          </div>
          <div className="bg-amber-700 rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-100 font-medium">Compras em aberto</span>
              <div className="w-9 h-9 rounded-xl bg-amber-800/60 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{totalCompraAberto.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-amber-100 mt-1">{totalOCs} ordens de compra</p>
          </div>
          <div className="bg-red-700 rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-red-100 font-medium">Itens críticos</span>
              <div className="w-9 h-9 rounded-xl bg-red-800/60 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{criticalCount}</p>
            <p className="text-xs text-red-100 mt-1">cobertura ≤ 90 dias</p>
          </div>
        </div>

        {/* Section title */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-white">Blocos por Família</h2>
            <span className="text-sm text-blue-200/70">({filteredFamilies.length})</span>
            {selectedFamilies.length > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-200 bg-amber-500/20 px-2.5 py-1 rounded-full">
                {selectedFamilies.length} {selectedFamilies.length === 1 ? "família selecionada" : "famílias selecionadas"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              Selecionar Todas
            </button>
            <button
              onClick={clearSelection}
              disabled={selectedFamilies.length === 0}
              className="text-xs font-semibold text-blue-200/80 hover:text-white bg-transparent border border-white/15 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Limpar Seleção
            </button>
          </div>
        </div>

        {/* Family blocks grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredFamilies.map((family) => {
            const famItems = groups[family];
            const qty = famItems.reduce((s, i) => s + (i.quantidade || 0), 0);
            const uniqueProducts = new Set(famItems.map((i) => String(i.produto))).size;
            const openQty = Array.from(new Set(famItems.map((i) => String(i.produto)))).reduce(
              (s, p) => s + (comprasByProduto[p] || []).reduce((a, c) => a + (c.qtd_aberto || 0), 0),
              0
            );
            const color = getColor(family);
            return (
              <button
                key={family}
                onClick={() => toggleFamily(family)}
                className={`group relative overflow-hidden rounded-xl bg-white p-5 border text-left transition-all duration-300 ${
                  selectedFamilies.includes(family)
                    ? "border-blue-700 shadow-lg ring-2 ring-blue-700/30"
                    : "border-white/20 shadow-md hover:shadow-xl hover:-translate-y-1"
                }`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${color.bar}`}></div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: color.accent }}>
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  {selectedFamilies.includes(family) ? (
                    <Check className="w-5 h-5 text-blue-700" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-stone-300 group-hover:text-stone-400 transition-colors" />
                  )}
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-1 leading-tight">{family}</h3>
                <div className="flex items-center gap-1.5 mb-4">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.accent }}></span>
                  <span className="text-xs text-stone-500 font-medium">{uniqueProducts} {uniqueProducts === 1 ? "produto" : "produtos"}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-stone-900">{qty.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>
                    <p className="text-xs text-stone-500">estoque</p>
                  </div>
                  {openQty > 0 && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-700">{openQty.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>
                      <p className="text-xs text-stone-500">compra aberto</p>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {filteredFamilies.length === 0 && (
          <div className="text-center py-20">
            <p className="text-blue-200/70">Nenhuma família encontrada para "{search}"</p>
          </div>
        )}

        {/* Inline listing for selected families (or all when none selected) */}
        <FamiliaCores
          key={listingKey}
          family={listingLabel}
          items={activeItems}
          accent={listingAccent}
          comprasByProduto={comprasByProduto}
          consumoByProduto={consumoByProduto}
        />
      </main>
    </div>
  );
}