import { useState, useEffect, useMemo, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Minus, Trash2, TrendingUp, Package, AlertTriangle, Receipt, X, Wheat } from "lucide-react";
import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storeDocRef = doc(db, "padaria", "store");

const COLORS = {
  crust: "#3B2A1E",
  crustSoft: "#5A4331",
  wheat: "#C9974C",
  wheatSoft: "#E4C888",
  dough: "#FBF4E8",
  paper: "#F4ECDD",
  oven: "#A8402F",
  ovenSoft: "#C96B57",
  herb: "#5C7A52",
  herbSoft: "#8AA680",
  ink: "#2B1F16",
};

const defaultProducts = [
  { id: "p1", name: "Pão francês", category: "padaria", unit: "un", price: 0.75, stock: 60, minStock: 15, bulkQty: 4, bulkPrice: 2.0 },
  { id: "p2", name: "Pão de queijo", category: "padaria", unit: "un", price: 3.5, stock: 40, minStock: 10, bulkQty: 5, bulkPrice: 2.0 },
  { id: "p3", name: "Salgados", category: "padaria", unit: "un", price: 6.0, stock: 30, minStock: 10 },
  { id: "p4", name: "Bolo (fatia)", category: "padaria", unit: "un", price: 8.0, stock: 20, minStock: 5 },
  { id: "p5", name: "Hambúrguer", category: "padaria", unit: "un", price: 15.0, stock: 15, minStock: 5 },
  { id: "p6", name: "Tapioca", category: "padaria", unit: "un", price: 10.0, stock: 15, minStock: 5 },
  { id: "p7", name: "Cuscuz", category: "padaria", unit: "un", price: 8.0, stock: 15, minStock: 5 },
  { id: "m1", name: "Café (pacote 500g)", category: "mercearia", unit: "pct", price: 18.0, stock: 20, minStock: 5 },
  { id: "m2", name: "Açúcar (1kg)", category: "mercearia", unit: "pct", price: 6.0, stock: 20, minStock: 5 },
  { id: "m3", name: "Manteiga 500g", category: "mercearia", unit: "un", price: 22.0, stock: 15, minStock: 5 },
  { id: "m4", name: "Manteiga 250g", category: "mercearia", unit: "un", price: 12.0, stock: 15, minStock: 5 },
  { id: "m5", name: "Ovos (dúzia)", category: "mercearia", unit: "dz", price: 14.0, stock: 20, minStock: 5 },
  { id: "m6", name: "Leite (litro)", category: "mercearia", unit: "l", price: 6.5, stock: 30, minStock: 8 },
  { id: "m7", name: "Bolacha", category: "mercearia", unit: "pct", price: 7.0, stock: 20, minStock: 5 },
  { id: "m8", name: "Fatias (pão de forma)", category: "mercearia", unit: "pct", price: 9.0, stock: 15, minStock: 5 },
  { id: "b1", name: "Café (copo)", category: "bebidas", unit: "un", price: 4.0, stock: 999, minStock: 0 },
  { id: "b2", name: "Café com leite (copo)", category: "bebidas", unit: "un", price: 5.0, stock: 999, minStock: 0 },
  { id: "b3", name: "Suco (copo)", category: "bebidas", unit: "un", price: 7.0, stock: 999, minStock: 0 },
  { id: "b4", name: "Refrigerante 1L", category: "bebidas", unit: "un", price: 9.0, stock: 20, minStock: 5 },
  { id: "b5", name: "Refrigerante 2L", category: "bebidas", unit: "un", price: 14.0, stock: 15, minStock: 5 },
  { id: "b6", name: "Refrigerante 350ml", category: "bebidas", unit: "un", price: 5.0, stock: 30, minStock: 8 },
  { id: "b7", name: "Refrigerante 250ml", category: "bebidas", unit: "un", price: 4.0, stock: 30, minStock: 8 },
];

const CATEGORY_LABELS = { padaria: "Padaria", mercearia: "Mercearia", bebidas: "Bebidas" };

// Ícone genérico de referência por produto, usado até você cadastrar uma foto real
const PRODUCT_EMOJI = {
  p1: "🥖", p2: "🧀", p3: "🥟", p4: "🍰", p5: "🍔", p6: "🫓", p7: "🌽",
  m1: "☕", m2: "🍬", m3: "🧈", m4: "🧈", m5: "🥚", m6: "🥛", m7: "🍪", m8: "🍞",
  b1: "☕", b2: "☕", b3: "🧃", b4: "🥤", b5: "🥤", b6: "🥤", b7: "🥤",
};
function getEmoji(p) {
  if (PRODUCT_EMOJI[p.id]) return PRODUCT_EMOJI[p.id];
  if (p.category === "padaria") return "🥖";
  if (p.category === "bebidas") return "🥤";
  return "🛒";
}

function currency(n) {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Calcula o valor de uma venda quando o produto é vendido normalmente em
// pacote/quantidade fechada (ex: "4 pães por R$2,00" é o preço padrão, não uma
// promoção). O que passar do múltiplo do pacote é cobrado no preço avulso.
function calcSubtotal(product, qty) {
  if (product.bulkQty > 0 && product.bulkPrice > 0) {
    const bulks = Math.floor(qty / product.bulkQty);
    const remainder = qty - bulks * product.bulkQty;
    return bulks * product.bulkPrice + remainder * product.price;
  }
  return product.price * qty;
}

function TicketCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <div
      style={{ background: COLORS.paper, border: `1px solid ${COLORS.wheatSoft}`, borderRadius: "10px 10px 0 0", position: "relative", paddingBottom: "18px" }}
      className="flex-1 min-w-[200px] shadow-sm"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: "'Work Sans', sans-serif", color: COLORS.crustSoft, letterSpacing: "0.06em" }} className="text-xs uppercase font-medium">
            {label}
          </span>
          {Icon && <Icon size={16} color={accent || COLORS.wheat} />}
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent || COLORS.ink }} className="text-2xl font-semibold">
          {value}
        </div>
        {sub && (
          <div style={{ fontFamily: "'Work Sans', sans-serif", color: COLORS.crustSoft }} className="text-xs mt-1">
            {sub}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "10px",
          background: `radial-gradient(circle at 6px 0, transparent 6px, ${COLORS.paper} 6.5px)`,
          backgroundSize: "12px 12px",
          backgroundRepeat: "repeat-x",
        }}
      />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("visao");
  const [products, setProducts] = useState(defaultProducts);
  const [sales, setSales] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [cart, setCart] = useState([]);
  const [saleCategory, setSaleCategory] = useState("padaria");
  const [stockCategory, setStockCategory] = useState("padaria");
  const [newProduct, setNewProduct] = useState({ name: "", category: "padaria", unit: "un", price: "", stock: "", minStock: "5", bulkQty: "", bulkPrice: "" });
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Escuta o Firestore em tempo real: qualquer dispositivo que salvar,
  // todos os outros recebem a atualização automaticamente.
  useEffect(() => {
    const unsub = onSnapshot(
      storeDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProducts(data.products || defaultProducts);
          setSales(data.sales || []);
        } else {
          setDoc(storeDocRef, { products: defaultProducts, sales: [] });
        }
        setLoaded(true);
      },
      (err) => {
        console.error(err);
        setSyncError(
          "Não consegui conectar ao Firebase. Confira se as chaves em src/firebaseConfig.js estão certas e se o Firestore está ativado."
        );
        setLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  const pushState = useCallback((nextProducts, nextSales) => {
    setProducts(nextProducts);
    setSales(nextSales);
    setDoc(storeDocRef, { products: nextProducts, sales: nextSales }).catch((e) => {
      console.error(e);
      setSyncError("Não consegui salvar no Firebase agora. Verifique sua internet.");
    });
  }, []);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const todaySales = useMemo(() => sales.filter((s) => s.date === todayISO()), [sales]);
  const todayRevenue = useMemo(() => todaySales.reduce((sum, s) => sum + s.total, 0), [todaySales]);
  const stockValue = useMemo(() => products.reduce((sum, p) => sum + p.price * (p.stock < 900 ? p.stock : 0), 0), [products]);
  const lowStock = useMemo(() => products.filter((p) => p.minStock > 0 && p.stock <= p.minStock), [products]);

  const topProductsData = useMemo(() => {
    const counts = {};
    sales.forEach((s) => s.items.forEach((it) => { counts[it.name] = (counts[it.name] || 0) + it.qty; }));
    return Object.entries(counts).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [sales]);

  const addToCart = useCallback((productId) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (existing) return prev.map((c) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { productId, qty: 1 }];
    });
  }, []);

  const changeCartQty = useCallback((productId, delta) => {
    setCart((prev) => prev.map((c) => (c.productId === productId ? { ...c, qty: Math.max(1, c.qty + delta) } : c)).filter((c) => c.qty > 0));
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }, []);

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => {
      const p = productMap[c.productId];
      return sum + (p ? calcSubtotal(p, c.qty) : 0);
    }, 0),
    [cart, productMap]
  );

  const finalizeSale = useCallback(() => {
    if (cart.length === 0) return;
    const items = cart.map((c) => {
      const p = productMap[c.productId];
      return { productId: c.productId, name: p.name, qty: c.qty, unitPrice: p.price, subtotal: calcSubtotal(p, c.qty) };
    });
    const total = items.reduce((s, it) => s + it.subtotal, 0);
    const sale = { id: `s_${Date.now()}`, date: todayISO(), time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), items, total };

    const nextProducts = products.map((p) => {
      const inCart = cart.find((c) => c.productId === p.id);
      if (inCart && p.stock < 900) return { ...p, stock: Math.max(0, p.stock - inCart.qty) };
      return p;
    });
    pushState(nextProducts, [sale, ...sales]);
    setCart([]);
  }, [cart, productMap, products, sales, pushState]);

  const deleteSale = useCallback(
    (saleId) => {
      const sale = sales.find((s) => s.id === saleId);
      if (!sale) return;
      if (!window.confirm("Excluir esta venda? O estoque dos itens será devolvido.")) return;
      const nextProducts = products.map((p) => {
        const item = sale.items.find((it) => it.productId === p.id);
        if (item && p.stock < 900) return { ...p, stock: p.stock + item.qty };
        return p;
      });
      pushState(nextProducts, sales.filter((s) => s.id !== saleId));
    },
    [sales, products, pushState]
  );

  const updateProductFieldLocal = useCallback((id, field, value) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }, []);

  const commitProducts = useCallback(() => {
    pushState(products, sales);
  }, [products, sales, pushState]);

  const deleteProduct = useCallback(
    (id) => {
      if (!window.confirm("Remover este produto do estoque?")) return;
      pushState(products.filter((p) => p.id !== id), sales);
    },
    [products, sales, pushState]
  );

  const submitNewProduct = useCallback(() => {
    if (!newProduct.name.trim()) return;
    const id = `custom_${Date.now()}`;
    const next = [
      ...products,
      {
        id,
        name: newProduct.name.trim(),
        category: newProduct.category,
        unit: newProduct.unit || "un",
        price: parseFloat(newProduct.price) || 0,
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 0,
        bulkQty: parseInt(newProduct.bulkQty) || 0,
        bulkPrice: parseFloat(newProduct.bulkPrice) || 0,
      },
    ];
    pushState(next, sales);
    setNewProduct({ name: "", category: "padaria", unit: "un", price: "", stock: "", minStock: "5", bulkQty: "", bulkPrice: "" });
    setShowAddProduct(false);
  }, [newProduct, products, sales, pushState]);

  const tabs = [
    { id: "visao", label: "Visão geral" },
    { id: "vendas", label: "Registrar venda" },
    { id: "estoque", label: "Estoque" },
    { id: "historico", label: "Histórico" },
  ];

  if (!loaded) {
    return (
      <div style={{ background: COLORS.dough, fontFamily: "'Work Sans', sans-serif" }} className="min-h-screen flex items-center justify-center">
        <span style={{ color: COLORS.crustSoft }}>Carregando painel...</span>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.dough, minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }}>
      <div style={{ background: COLORS.crust }} className="px-4 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Wheat size={26} color={COLORS.wheat} />
            <div>
              <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.dough }} className="text-2xl font-semibold italic leading-tight">
                Painel da Padaria
              </h1>
              <p style={{ color: COLORS.wheatSoft }} className="text-xs">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
            </div>
          </div>
          <span style={{ color: syncError ? "#E88" : COLORS.herbSoft, fontFamily: "'Space Grotesk', sans-serif" }} className="text-xs max-w-xs text-right">
            {syncError ? syncError : "✓ sincronizado"}
          </span>
        </div>
      </div>

      <div style={{ background: COLORS.crustSoft }} className="px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ fontFamily: "'Work Sans', sans-serif", color: tab === t.id ? COLORS.crust : COLORS.wheatSoft, background: tab === t.id ? COLORS.wheat : "transparent", borderRadius: "8px 8px 0 0" }}
              className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {tab === "visao" && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <TicketCard label="Vendas hoje" value={todaySales.length} sub={`${currency(todayRevenue)} em receita`} icon={Receipt} accent={COLORS.oven} />
              <TicketCard label="Receita hoje" value={currency(todayRevenue)} icon={TrendingUp} accent={COLORS.herb} />
              <TicketCard label="Valor em estoque" value={currency(stockValue)} icon={Package} accent={COLORS.wheat} />
              <TicketCard
                label="Estoque baixo"
                value={lowStock.length}
                sub={lowStock.length ? lowStock.map((p) => p.name).slice(0, 3).join(", ") : "tudo certo"}
                icon={AlertTriangle}
                accent={lowStock.length ? COLORS.oven : COLORS.herb}
              />
            </div>

            {lowStock.length > 0 && (
              <div style={{ background: "#FBEAE6", border: `1px solid ${COLORS.ovenSoft}` }} className="rounded-lg p-4">
                <div style={{ color: COLORS.oven, fontFamily: "'Space Grotesk', sans-serif" }} className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} /> Produtos precisando de reposição
                </div>
                <div className="flex flex-wrap gap-2">
                  {lowStock.map((p) => (
                    <span key={p.id} style={{ background: "white", color: COLORS.crust }} className="text-xs px-2 py-1 rounded">
                      {p.name}: {p.stock} {p.unit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: "white", border: `1px solid ${COLORS.wheatSoft}` }} className="rounded-lg p-4">
              <h3 style={{ fontFamily: "'Fraunces', serif", color: COLORS.crust }} className="italic font-semibold mb-3">
                Mais vendidos (histórico)
              </h3>
              {topProductsData.length === 0 ? (
                <p style={{ color: COLORS.crustSoft }} className="text-sm">Registre vendas para ver o ranking aqui.</p>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={topProductsData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis type="number" tick={{ fontFamily: "Space Grotesk", fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontFamily: "Work Sans", fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="qty" fill={COLORS.wheat} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "vendas" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex gap-2 flex-wrap">
                {Object.keys(CATEGORY_LABELS).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSaleCategory(cat)}
                    style={{ background: saleCategory === cat ? COLORS.crust : "white", color: saleCategory === cat ? COLORS.dough : COLORS.crust, border: `1px solid ${COLORS.wheatSoft}` }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.filter((p) => p.category === saleCategory).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p.id)}
                    disabled={p.stock <= 0}
                    style={{ background: "white", border: `1px solid ${COLORS.wheatSoft}`, opacity: p.stock <= 0 ? 0.4 : 1, textAlign: "left" }}
                    className="rounded-lg p-3 hover:shadow-md transition-shadow disabled:cursor-not-allowed"
                  >
                    <div
                      style={{ background: COLORS.dough, borderRadius: 8, height: 56, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 6 }}
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span style={{ fontSize: 28 }}>{getEmoji(p)}</span>
                      )}
                    </div>
                    <div style={{ color: COLORS.crust, fontFamily: "'Work Sans', sans-serif" }} className="text-sm font-medium">{p.name}</div>
                    <div style={{ color: COLORS.oven, fontFamily: "'Space Grotesk', sans-serif" }} className="text-sm font-semibold mt-1">
                      {p.bulkQty > 0 && p.bulkPrice > 0 ? `${p.bulkQty}x por ${currency(p.bulkPrice)}` : currency(p.price)}
                    </div>
                    {p.bulkQty > 0 && p.bulkPrice > 0 && (
                      <div style={{ color: COLORS.crustSoft }} className="text-xs">avulso: {currency(p.price)}</div>
                    )}
                    <div style={{ color: COLORS.crustSoft }} className="text-xs mt-0.5">{p.stock < 900 ? `${p.stock} ${p.unit} em estoque` : "disponível"}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.wheatSoft}` }} className="rounded-lg p-4 h-fit sticky top-4">
              <h3 style={{ fontFamily: "'Fraunces', serif", color: COLORS.crust }} className="italic font-semibold mb-3 flex items-center gap-2">
                <Receipt size={18} /> Comanda
              </h3>
              {cart.length === 0 ? (
                <p style={{ color: COLORS.crustSoft }} className="text-sm">Toque em um produto para adicionar à venda.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {cart.map((c) => {
                    const p = productMap[c.productId];
                    if (!p) return null;
                    return (
                      <div key={c.productId} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <div style={{ color: COLORS.crust }} className="truncate">{p.name}</div>
                          <div style={{ color: COLORS.crustSoft }} className="text-xs">{currency(calcSubtotal(p, c.qty))} ({c.qty} un)</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => changeCartQty(c.productId, -1)} style={{ color: COLORS.crust }} className="p-1"><Minus size={14} /></button>
                          <span style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="w-5 text-center">{c.qty}</span>
                          <button onClick={() => changeCartQty(c.productId, 1)} style={{ color: COLORS.crust }} className="p-1"><Plus size={14} /></button>
                          <button onClick={() => removeFromCart(c.productId)} style={{ color: COLORS.oven }} className="p-1"><X size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ borderTop: `1px dashed ${COLORS.wheatSoft}` }} className="pt-3 mb-3 flex justify-between items-center">
                <span style={{ color: COLORS.crust, fontFamily: "'Fraunces', serif" }} className="italic font-semibold">Total</span>
                <span style={{ color: COLORS.oven, fontFamily: "'Space Grotesk', sans-serif" }} className="text-xl font-semibold">{currency(cartTotal)}</span>
              </div>
              <button
                onClick={finalizeSale}
                disabled={cart.length === 0}
                style={{ background: cart.length ? COLORS.herb : COLORS.herbSoft, color: "white" }}
                className="w-full py-2.5 rounded-lg font-medium disabled:cursor-not-allowed"
              >
                Finalizar venda
              </button>
            </div>
          </div>
        )}

        {tab === "estoque" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                {Object.keys(CATEGORY_LABELS).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setStockCategory(cat)}
                    style={{ background: stockCategory === cat ? COLORS.crust : "white", color: stockCategory === cat ? COLORS.dough : COLORS.crust, border: `1px solid ${COLORS.wheatSoft}` }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAddProduct((s) => !s)} style={{ background: COLORS.wheat, color: COLORS.crust }} className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1">
                <Plus size={14} /> Novo produto
              </button>
            </div>

            {showAddProduct && (
              <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.wheatSoft}` }} className="rounded-lg p-4 grid grid-cols-2 sm:grid-cols-6 gap-2">
                <input placeholder="Nome" value={newProduct.name} onChange={(e) => setNewProduct((n) => ({ ...n, name: e.target.value }))} className="col-span-2 sm:col-span-2 px-2 py-1.5 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft }} />
                <select value={newProduct.category} onChange={(e) => setNewProduct((n) => ({ ...n, category: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft }}>
                  {Object.keys(CATEGORY_LABELS).map((c) => (<option key={c} value={c}>{CATEGORY_LABELS[c]}</option>))}
                </select>
                <input placeholder="Unid. (un/kg/l)" value={newProduct.unit} onChange={(e) => setNewProduct((n) => ({ ...n, unit: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft }} />
                <input placeholder="Preço avulso" type="number" value={newProduct.price} onChange={(e) => setNewProduct((n) => ({ ...n, price: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft }} />
                <input placeholder="Qtd. pacote" type="number" value={newProduct.bulkQty} onChange={(e) => setNewProduct((n) => ({ ...n, bulkQty: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft }} />
                <input placeholder="Preço pacote" type="number" value={newProduct.bulkPrice} onChange={(e) => setNewProduct((n) => ({ ...n, bulkPrice: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft }} />
                <input placeholder="Estoque" type="number" value={newProduct.stock} onChange={(e) => setNewProduct((n) => ({ ...n, stock: e.target.value }))} className="px-2 py-1.5 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft }} />
                <button onClick={submitNewProduct} style={{ background: COLORS.herb, color: "white" }} className="col-span-2 sm:col-span-6 py-1.5 rounded text-sm font-medium">Adicionar produto</button>
              </div>
            )}

            <div style={{ background: "white", border: `1px solid ${COLORS.wheatSoft}` }} className="rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead style={{ background: COLORS.paper }}>
                  <tr>
                    <th style={{ color: COLORS.crustSoft }} className="text-left px-3 py-2 font-medium">Foto</th>
                    <th style={{ color: COLORS.crustSoft }} className="text-left px-3 py-2 font-medium">Produto</th>
                    <th style={{ color: COLORS.crustSoft }} className="text-left px-3 py-2 font-medium">Preço avulso</th>
                    <th style={{ color: COLORS.crustSoft }} className="text-left px-3 py-2 font-medium">Venda em pacote</th>
                    <th style={{ color: COLORS.crustSoft }} className="text-left px-3 py-2 font-medium">Estoque</th>
                    <th style={{ color: COLORS.crustSoft }} className="text-left px-3 py-2 font-medium">Mín.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter((p) => p.category === stockCategory).map((p) => (
                    <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.wheatSoft}`, background: p.minStock > 0 && p.stock <= p.minStock ? "#FBEAE6" : "white" }}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div style={{ background: COLORS.dough, borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <span style={{ fontSize: 16 }}>{getEmoji(p)}</span>}
                          </div>
                          <input
                            type="text"
                            placeholder="URL da foto"
                            value={p.imageUrl || ""}
                            onChange={(e) => updateProductFieldLocal(p.id, "imageUrl", e.target.value)}
                            onBlur={commitProducts}
                            className="w-24 px-1.5 py-1 rounded border text-xs"
                            style={{ borderColor: COLORS.wheatSoft }}
                          />
                        </div>
                      </td>
                      <td style={{ color: COLORS.crust }} className="px-3 py-2">
                        {p.name} <span style={{ color: COLORS.crustSoft }} className="text-xs ml-1">({p.unit})</span>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={p.price} onChange={(e) => updateProductFieldLocal(p.id, "price", parseFloat(e.target.value) || 0)} onBlur={commitProducts} className="w-20 px-1.5 py-1 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft, fontFamily: "'Space Grotesk', sans-serif" }} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input type="number" placeholder="qtd" value={p.bulkQty || ""} onChange={(e) => updateProductFieldLocal(p.id, "bulkQty", parseInt(e.target.value) || 0)} onBlur={commitProducts} className="w-14 px-1.5 py-1 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft, fontFamily: "'Space Grotesk', sans-serif" }} />
                          <span style={{ color: COLORS.crustSoft }} className="text-xs">por R$</span>
                          <input type="number" placeholder="preço" value={p.bulkPrice || ""} onChange={(e) => updateProductFieldLocal(p.id, "bulkPrice", parseFloat(e.target.value) || 0)} onBlur={commitProducts} className="w-16 px-1.5 py-1 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft, fontFamily: "'Space Grotesk', sans-serif" }} />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={p.stock < 900 ? p.stock : ""} placeholder={p.stock >= 900 ? "ilimitado" : ""} onChange={(e) => updateProductFieldLocal(p.id, "stock", parseInt(e.target.value) || 0)} onBlur={commitProducts} className="w-20 px-1.5 py-1 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft, fontFamily: "'Space Grotesk', sans-serif" }} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={p.minStock} onChange={(e) => updateProductFieldLocal(p.id, "minStock", parseInt(e.target.value) || 0)} onBlur={commitProducts} className="w-16 px-1.5 py-1 rounded border text-sm" style={{ borderColor: COLORS.wheatSoft, fontFamily: "'Space Grotesk', sans-serif" }} />
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => deleteProduct(p.id)} style={{ color: COLORS.oven }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "historico" && (
          <div style={{ background: "white", border: `1px solid ${COLORS.wheatSoft}` }} className="rounded-lg overflow-hidden">
            {sales.length === 0 ? (
              <p style={{ color: COLORS.crustSoft }} className="p-6 text-sm">Nenhuma venda registrada ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead style={{ background: COLORS.paper }}>
                  <tr>
                    <th style={{ color: COLORS.crustSoft }} className="text-left px-3 py-2 font-medium">Data</th>
                    <th style={{ color: COLORS.crustSoft }} className="text-left px-3 py-2 font-medium">Itens</th>
                    <th style={{ color: COLORS.crustSoft }} className="text-left px-3 py-2 font-medium">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id} style={{ borderTop: `1px solid ${COLORS.wheatSoft}` }}>
                      <td style={{ color: COLORS.crust }} className="px-3 py-2 whitespace-nowrap">{new Date(s.date + "T00:00").toLocaleDateString("pt-BR")} {s.time}</td>
                      <td style={{ color: COLORS.crustSoft }} className="px-3 py-2">{s.items.map((it) => `${it.qty}x ${it.name}`).join(", ")}</td>
                      <td style={{ color: COLORS.oven, fontFamily: "'Space Grotesk', sans-serif" }} className="px-3 py-2 font-semibold">{currency(s.total)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => deleteSale(s.id)} style={{ color: COLORS.oven }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
