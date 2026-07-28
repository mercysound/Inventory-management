// src/pages/tenant/TenantShop.jsx
// Public shop for a specific tenant at /shop/:slug
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Search, Package, Heart, Star, X, LogIn, UserPlus, Minus, Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";
import axios from "axios";

const BASE_URL  = import.meta.env.VITE_API_URL || "/api";
const CART_KEY  = (slug) => `tenant-cart-${slug}`;
const TOKEN_KEY = (slug) => `tenant-user-token-${slug}`;

const readCart  = (slug) => { try { return JSON.parse(localStorage.getItem(CART_KEY(slug)) || "[]"); } catch { return []; } };
const writeCart = (slug, items) => { try { localStorage.setItem(CART_KEY(slug), JSON.stringify(items)); } catch {} };

const Stars = ({ avg=0, count=0 }) => !count ? null : (
  <div className="flex items-center gap-1">
    <div className="flex">{[1,2,3,4,5].map(n=>(
      <Star key={n} size={10} className={n<=Math.round(avg)?"text-amber-400 fill-amber-400":"text-gray-200 fill-gray-200"} />
    ))}</div>
    <span className="text-[10px] text-gray-400">({count})</span>
  </div>
);

const TenantShop = () => {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("");
  const [cartOpen,   setCartOpen]   = useState(false);
  const [cart,       setCart]       = useState(() => readCart(slug));

  useEffect(() => { writeCart(slug, cart); }, [cart, slug]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/t/${slug}/products/public`);
      if (res.data.success) {
        setProducts(res.data.products || []);
        setCategories(res.data.categories || []);
        setTenantInfo(res.data.tenant);
      }
    } catch (err) {
      if (err?.response?.status === 404) toast.error("Store not found");
      else toast.error("Failed to load store");
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const getQty = (id) => cart.find(i => i.productId === id)?.quantity || 0;

  const handleAdd = (p) => {
    const existing = cart.find(i => i.productId === p._id);
    if (existing) {
      if (existing.quantity >= p.stock) { toast.warning("Max stock reached"); return; }
      setCart(prev => prev.map(i => i.productId===p._id ? {...i,quantity:i.quantity+1} : i));
    } else {
      setCart(prev => [...prev, { productId:p._id, quantity:1, name:p.name, price:p.price,
        image:p.images?.[0]||p.image||null, stock:p.stock, categoryName:p.categoryId?.name||"" }]);
    }
    toast.success(`${p.name} added`, { autoClose: 1200 });
  };

  const handleInc = (p) => {
    const cur = getQty(p._id);
    if (cur >= p.stock) { toast.warning("Max stock"); return; }
    setCart(prev => prev.map(i => i.productId===p._id ? {...i,quantity:i.quantity+1} : i));
  };

  const handleDec = (id) => setCart(prev => {
    const item = prev.find(i=>i.productId===id);
    if (!item) return prev;
    if (item.quantity<=1) return prev.filter(i=>i.productId!==id);
    return prev.map(i => i.productId===id ? {...i,quantity:i.quantity-1} : i);
  });

  const handleRemove = (id) => setCart(prev => prev.filter(i=>i.productId!==id));

  const filtered = products
    .filter(p => !catFilter || (p.categoryId?._id||p.categoryId)===catFilter)
    .filter(p => !search   || p.name.toLowerCase().includes(search.toLowerCase()));

  const cartCount = cart.reduce((s,i) => s+i.quantity, 0);
  const cartTotal = cart.reduce((s,i) => s+(i.price||0)*i.quantity, 0);

  const storeName = tenantInfo?.name || slug;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to={`/shop/${slug}`} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow">
              <ShoppingCart size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm tracking-tight truncate max-w-[140px]">{storeName}</span>
          </Link>
          <div className="flex-1 max-w-sm relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e=>{setSearch(e.target.value);}}
              placeholder="Search products…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
            {search && <button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={12} className="text-gray-400"/></button>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={()=>setCartOpen(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition">
              <ShoppingCart size={13} /><span className="hidden sm:inline">Cart</span>
              {cartCount>0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{cartCount>9?"9+":cartCount}</span>}
            </button>
            <Link to={`/shop/${slug}/login`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              <LogIn size={12} /><span className="hidden sm:inline">Sign In</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Category filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <button onClick={()=>setCatFilter("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${!catFilter?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
            All
          </button>
          {categories.map(c => (
            <button key={c._id} onClick={()=>setCatFilter(c._id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${catFilter===c._id?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length===0 ? (
          <div className="flex flex-col items-center py-20">
            <Package size={40} className="text-gray-200 mb-3"/>
            <p className="text-gray-400">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(p => {
              const qty  = getQty(p._id);
              const oos  = p.stock===0;
              const thumb = p.images?.[0]||p.image||null;
              return (
                <motion.div key={p._id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col overflow-hidden">
                  <div className="relative h-36 bg-gray-50">
                    {thumb ? <img src={thumb} alt={p.name} className="w-full h-full object-contain p-1"/> : <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-gray-200"/></div>}
                    {p.isBonanza && <span className="absolute top-2 left-2 text-[9px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">🎉 DEAL</span>}
                    {!p.isBonanza && p.isNewArrival && <span className="absolute top-2 left-2 text-[9px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">✨ NEW</span>}
                    {oos && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">Out of stock</span></div>}
                  </div>
                  <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full w-fit truncate uppercase">{p.categoryId?.name||"—"}</span>
                    <p className="font-bold text-gray-900 text-sm line-clamp-2">{p.name}</p>
                    <Stars avg={p.ratingAvg} count={p.ratingCount} />
                    <div className="mt-auto pt-1.5 border-t border-gray-50 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-extrabold text-gray-900 text-sm">₦{Number(p.price).toLocaleString()}</p>
                        <span className="text-[9px] font-bold text-indigo-500">RTP</span>
                      </div>
                      {qty>0 ? (
                        <div className="flex items-center gap-1">
                          <button onClick={()=>handleDec(p._id)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Minus size={10}/></button>
                          <span className="text-sm font-bold w-4 text-center">{qty}</span>
                          <button onClick={()=>handleInc(p)} disabled={qty>=p.stock} className="w-7 h-7 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white flex items-center justify-center"><Plus size={10}/></button>
                        </div>
                      ) : (
                        <motion.button onClick={()=>handleAdd(p)} disabled={oos} whileTap={{scale:0.9}}
                          className="w-9 h-9 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white text-xl font-bold flex items-center justify-center shadow-sm transition">+</motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* CTA banner */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
          className="mt-10 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-center text-white shadow-lg">
          <h3 className="text-lg font-bold mb-1">Ready to order?</h3>
          <p className="text-indigo-200 text-sm mb-4">Sign in or create an account to place orders.</p>
          <div className="flex gap-3 justify-center">
            <Link to={`/shop/${slug}/login`} className="px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition shadow">Sign In</Link>
            <Link to={`/shop/${slug}/login`} className="px-5 py-2.5 border border-white/30 text-white rounded-xl font-semibold text-sm hover:bg-white/10 transition">Create Account</Link>
          </div>
        </motion.div>
      </div>

      {/* Cart drawer */}
      {cartOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex justify-end" onClick={()=>setCartOpen(false)}>
          <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",stiffness:380,damping:38}}
            onClick={e=>e.stopPropagation()}
            className="bg-white w-full max-w-sm flex flex-col shadow-2xl" style={{maxHeight:"100dvh"}}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-indigo-600"/>
                <h2 className="font-bold text-gray-900 text-base">My Cart</h2>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
              </div>
              <button onClick={()=>setCartOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                <X size={14}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {cart.length===0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <ShoppingCart size={32} className="text-gray-200"/>
                  <p className="text-gray-400 text-sm">Your cart is empty</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-start gap-3 px-5 py-4">
                      {item.image ? <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-contain bg-gray-50 border border-gray-100 shrink-0"/> : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Package size={18} className="text-gray-300"/></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.name}</p>
                        {item.categoryName && <p className="text-[10px] text-indigo-500 font-semibold mt-0.5 uppercase">{item.categoryName}</p>}
                        <p className="text-sm font-bold text-green-700 mt-1">₦{Number(item.price||0).toLocaleString()} × {item.quantity}</p>
                        <p className="text-xs text-gray-400">= ₦{Number((item.price||0)*item.quantity).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button onClick={()=>handleRemove(item.productId)} className="w-6 h-6 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center"><Trash2 size={11}/></button>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>handleDec(item.productId)} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Minus size={9}/></button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={()=>{const p=products.find(x=>x._id===item.productId)||{_id:item.productId,stock:item.stock,name:item.name,price:item.price,images:item.image?[item.image]:[],categoryId:{name:item.categoryName}};handleInc(p);}} disabled={item.quantity>=item.stock} className="w-6 h-6 rounded-md bg-green-600 disabled:bg-gray-200 text-white hover:bg-green-700 flex items-center justify-center"><Plus size={9}/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length>0 && (
              <div className="px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">Subtotal</span>
                  <span className="text-lg font-extrabold text-gray-900">₦{cartTotal.toLocaleString()}</span>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">🔐 Sign in to place your order</p>
                <Link to={`/shop/${slug}/login`} onClick={()=>setCartOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition">
                  <LogIn size={14}/> Sign in to Checkout <ArrowRight size={13}/>
                </Link>
              </div>
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TenantShop;
