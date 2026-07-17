import React, { useState, useMemo } from "react";
import { Package, Search, ChevronRight, ChevronDown, ShoppingCart, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const LEAD_TIME_DAYS = 90;
const MS_DAY = 86400000;

function fmtDate(d) {
  if (!d) return "—";
  const s = String(d).split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
}

function fmtDateObj(dt) {
  if (!dt) return "—";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${day}/${m}/${y}`;
}

// coverage = days of stock available considering stock + open purchases
function analyze(item, openQty, consumoByProduto) {
  const consumo = consumoByProduto[String(item.produto)];
  const mensal = consumo?.consumo_mensal || 0;
  const daily = mensal / 30;
  const stock = item.quantidade || 0;
  const coverage = daily > 0 ? (stock + openQty) / daily : null;
  let status = "sem_consumo";
  if (coverage !== null) {
    if (coverage <= LEAD_TIME_DAYS) status = "critico";
    else if (coverage <= LEAD_TIME_DAYS + 30) status = "atencao";
    else status = "ok";
  }
  let ideal = null;
  if (coverage !== null) {
    ideal = new Date(Date.now() + Math.max(0, Math.round(coverage - LEAD_TIME_DAYS)) * MS_DAY);
  }
  return { mensal, daily, coverage, status, ideal };
}

const STATUS_BADGE = {
  critico: { label: "Crítico", cls: "bg-red-100 text-red-700", Icon: AlertTriangle },
  atencao: { label: "Atenção", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  ok: { label: "Ok", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  sem_consumo: { label: "Sem consumo", cls: "bg-stone-100 text-stone-500", Icon: Package },
};

export default function EstoqueListagem({ family, items, accent, comprasByProduto = {}, consumoByProduto = {} }) {
  const [search, setSearch] = useState("");
  const [openProd, setOpenProd] = useState(null);

  const aggregated = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      const key = String(i.produto);
      if (map.has(key)) {
        map.get(key).quantidade += i.quantidade || 0;
      } else {
        map.set(key, { ...i, quantidade: i.quantidade || 0 });
      }
    });
    return Array.from(map.values());
  }, [items]);

  const enriched = useMemo(() => {
    return aggregated.map((item) => {
      const comps = comprasByProduto[String(item.produto)] || [];
      const openQty = comps.reduce((a, c) => a + (c.qtd_aberto || 0), 0);
      const a = analyze(item, openQty, consumoByProduto);
      return { item, comps, openQty, ...a };
    });
  }, [aggregated, comprasByProduto, consumoByProduto]);

  const filtered = useMemo(() => {
    if (!search) return enriched;
    const q = search.toLowerCase();
    return enriched.filter(
      (e) =>
        (e.item.descricao || "").toLowerCase().includes(q) ||
        String(e.item.produto).includes(q)
    );
  }, [enriched, search]);

  // Sort: critical first
  const sorted = useMemo(() => {
    const order = { critico: 0, atencao: 1, sem_consumo: 2, ok: 3 };
    return [...filtered].sort((a, b) => order[a.status] - order[b.status]);
  }, [filtered]);

  const totalQty = items.reduce((s, i) => s + (i.quantidade || 0), 0);
  const uniqueProducts = new Set(items.map((i) => String(i.produto))).size;
  const totalOpen = enriched.reduce((s, e) => s + e.openQty, 0);
  const totalConsumo = enriched.reduce((s, e) => s + (e.mensal || 0), 0);
  const criticalCount = enriched.filter((e) => e.status === "critico").length;

  return (
    <div className="mt-8 rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
      {/* Listing header */}
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-4 border-b border-stone-200 bg-stone-50/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent }}>
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[11px] text-stone-500 font-medium uppercase tracking-wide">Família selecionada</p>
            <h3 className="text-lg font-bold text-stone-900 leading-tight">{family}</h3>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-wrap">
            <div className="bg-stone-900 rounded-lg px-3 py-1.5 text-center">
              <p className="text-sm font-bold text-white leading-none">{uniqueProducts}</p>
              <p className="text-[10px] text-stone-400">produtos</p>
            </div>
            <div className="bg-stone-900 rounded-lg px-3 py-1.5 text-center">
              <p className="text-sm font-bold text-white leading-none">{totalQty.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>
              <p className="text-[10px] text-stone-400">qtd. total</p>
            </div>
            <div className="bg-amber-700 rounded-lg px-3 py-1.5 text-center">
              <p className="text-sm font-bold text-white leading-none">{totalOpen.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>
              <p className="text-[10px] text-amber-100">compra aberto</p>
            </div>
            <div className="bg-blue-700 rounded-lg px-3 py-1.5 text-center">
              <p className="text-sm font-bold text-white leading-none">{totalConsumo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>
              <p className="text-[10px] text-blue-100">consumo/mês</p>
            </div>
            {criticalCount > 0 && (
              <div className="bg-red-600 rounded-lg px-3 py-1.5 text-center">
                <p className="text-sm font-bold text-white leading-none">{criticalCount}</p>
                <p className="text-[10px] text-red-100">críticos</p>
              </div>
            )}
          </div>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-stone-200 focus:border-stone-400 focus:outline-none text-sm text-stone-700 transition-all"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/40">
              <th className="w-8 px-3 py-3"></th>
              <th className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wide px-2 py-3">Produto</th>
              <th className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wide px-6 py-3">Descrição</th>
              <th className="text-right text-xs font-semibold text-stone-500 uppercase tracking-wide px-4 py-3">Estoque</th>
              <th className="text-right text-xs font-semibold text-stone-500 uppercase tracking-wide px-4 py-3">Compra</th>
              <th className="text-right text-xs font-semibold text-stone-500 uppercase tracking-wide px-4 py-3">Consumo/mês</th>
              <th className="text-right text-xs font-semibold text-stone-500 uppercase tracking-wide px-4 py-3">Cobertura</th>
              <th className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wide px-4 py-3">Compra ideal</th>
              <th className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wide px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, idx) => {
              const isOpen = openProd === idx;
              const hasComps = e.comps.length > 0;
              const badge = STATUS_BADGE[e.status];
              const IdealIcon = e.status === "critico" ? AlertTriangle : null;
              return (
                <React.Fragment key={idx}>
                  <tr
                    className={`border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors ${isOpen ? "bg-stone-50/80" : ""} ${hasComps ? "cursor-pointer" : ""} ${e.status === "critico" ? "bg-red-50/40" : ""}`}
                    onClick={() => hasComps && setOpenProd(isOpen ? null : idx)}
                  >
                    <td className="px-3 py-3">
                      {hasComps ? (
                        isOpen ? <ChevronDown className="w-4 h-4 text-stone-500" /> : <ChevronRight className="w-4 h-4 text-stone-300" />
                      ) : null}
                    </td>
                    <td className="px-2 py-3">
                      <span className="font-mono text-sm text-stone-700 bg-stone-100 px-2 py-1 rounded-md">{e.item.produto}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-stone-700">{e.item.descricao}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-stone-900">{e.item.quantidade?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasComps ? (
                        <span className="text-sm font-semibold text-amber-700 inline-flex items-center gap-1">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {e.openQty.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                        </span>
                      ) : (
                        <span className="text-sm text-stone-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.mensal > 0 ? (
                        <span className="text-sm text-stone-700">{e.mensal.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>
                      ) : (
                        <span className="text-sm text-stone-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.coverage !== null ? (
                        <span className={`text-sm font-semibold ${e.status === "critico" ? "text-red-600" : "text-stone-700"}`}>
                          {Math.round(e.coverage)} dias
                        </span>
                      ) : (
                        <span className="text-sm text-stone-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e.coverage === null ? (
                        <span className="text-sm text-stone-300">—</span>
                      ) : e.status === "critico" ? (
                        <span className="text-sm font-semibold text-red-600 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Comprar agora
                        </span>
                      ) : (
                        <span className="text-sm text-stone-700">{fmtDateObj(e.ideal)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${badge.cls}`}>
                        <badge.Icon className="w-3.5 h-3.5" /> {badge.label}
                      </span>
                    </td>
                  </tr>
                  {isOpen && hasComps && (
                    <tr className="bg-stone-50/50">
                      <td></td>
                      <td colSpan={8} className="px-6 pb-4 pt-1">
                        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-200 bg-amber-50/60">
                            <ShoppingCart className="w-4 h-4 text-amber-700" />
                            <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                              Ordens de compra • {e.comps.length} {e.comps.length === 1 ? "item" : "itens"}
                            </p>
                          </div>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-stone-100">
                                <th className="text-left text-[11px] font-semibold text-stone-500 uppercase px-4 py-2">OC</th>
                                <th className="text-left text-[11px] font-semibold text-stone-500 uppercase px-4 py-2">Emissão</th>
                                <th className="text-left text-[11px] font-semibold text-stone-500 uppercase px-4 py-2">Entrega</th>
                                <th className="text-right text-[11px] font-semibold text-stone-500 uppercase px-4 py-2">Qtd. Aberto</th>
                                <th className="text-right text-[11px] font-semibold text-stone-500 uppercase px-4 py-2">Vl. Unit.</th>
                                <th className="text-left text-[11px] font-semibold text-stone-500 uppercase px-4 py-2">Moeda</th>
                                <th className="text-left text-[11px] font-semibold text-stone-500 uppercase px-4 py-2">Situação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {e.comps.map((c, ci) => (
                                <tr key={ci} className="border-b border-stone-50 last:border-0">
                                  <td className="px-4 py-2 font-mono text-xs text-stone-700">{c.num_oc}</td>
                                  <td className="px-4 py-2 text-xs text-stone-600">{fmtDate(c.data_emissao)}</td>
                                  <td className="px-4 py-2 text-xs text-stone-600">{fmtDate(c.dt_entrega)}</td>
                                  <td className="px-4 py-2 text-right text-xs font-semibold text-amber-700">{c.qtd_aberto?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                                  <td className="px-4 py-2 text-right text-xs text-stone-700">{c.valor_unitario?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="px-4 py-2 text-xs text-stone-600">{c.desc_moeda}</td>
                                  <td className="px-4 py-2"><span className="text-[10px] font-medium text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">{c.situacao}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-stone-100">
        {sorted.map((e, idx) => {
          const isOpen = openProd === idx;
          const hasComps = e.comps.length > 0;
          const badge = STATUS_BADGE[e.status];
          return (
            <div key={idx} className={`px-5 py-4 ${e.status === "critico" ? "bg-red-50/40" : ""}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded">#{e.item.produto}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.cls}`}>
                  <badge.Icon className="w-3 h-3" /> {badge.label}
                </span>
              </div>
              <p className="text-sm text-stone-700 mb-2">{e.item.descricao}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-stone-400">Estoque</p>
                  <p className="font-bold text-stone-900">{e.item.quantidade?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>
                </div>
                <div>
                  <p className="text-stone-400">Consumo/mês</p>
                  <p className="font-semibold text-stone-700">{e.mensal > 0 ? e.mensal.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</p>
                </div>
                <div>
                  <p className="text-stone-400">Cobertura</p>
                  <p className={`font-semibold ${e.status === "critico" ? "text-red-600" : "text-stone-700"}`}>
                    {e.coverage !== null ? `${Math.round(e.coverage)}d` : "—"}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-stone-400">Compra ideal: </span>
                  {e.coverage === null ? (
                    <span className="text-stone-400">—</span>
                  ) : e.status === "critico" ? (
                    <span className="font-semibold text-red-600">Comprar agora</span>
                  ) : (
                    <span className="font-semibold text-stone-700">{fmtDateObj(e.ideal)}</span>
                  )}
                </div>
                {hasComps && (
                  <button
                    onClick={() => setOpenProd(isOpen ? null : idx)}
                    className="text-xs font-semibold text-amber-700 inline-flex items-center gap-1 bg-amber-50 px-2 py-1 rounded"
                  >
                    <ShoppingCart className="w-3 h-3" /> {e.openQty.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </button>
                )}
              </div>
              {isOpen && hasComps && (
                <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-stone-200 bg-amber-50/60">
                    <p className="text-[11px] font-semibold text-stone-700 uppercase">Ordens de compra</p>
                  </div>
                  {e.comps.map((c, ci) => (
                    <div key={ci} className="px-3 py-2 border-b border-stone-100 last:border-0 text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-mono text-stone-700">OC {c.num_oc}</span>
                        <span className="font-semibold text-amber-700">{c.qtd_aberto?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {c.un}</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>Entrega: {fmtDate(c.dt_entrega)}</span>
                        <span>{c.desc_moeda} {c.valor_unitario?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16">
          <p className="text-stone-400 text-sm">Nenhum produto encontrado para "{search}"</p>
        </div>
      )}

      <div className="px-6 py-3 border-t border-stone-200 bg-stone-50/60 text-[11px] text-stone-500">
        Lead-time de entrega considerado: <span className="font-semibold text-stone-700">90 dias</span>. Itens críticos = cobertura ≤ 90 dias.
      </div>
    </div>
  );
}