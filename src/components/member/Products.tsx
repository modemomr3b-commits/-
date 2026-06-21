import { useParams, Link, useNavigate } from "react-router";
import { ChevronRight, Filter, Download, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../../api";
import { supabase } from "../../supabase";
import { Product } from "../../types";
import { useStore } from "../../store";
import OptimizedImage from "../OptimizedImage";

const MOCK_PRODUCTS: Product[] = [];

export default function Products() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useStore();

  const [categoryName, setCategoryName] = useState("جميع المنتجات");
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number, total: number } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const [cats, allProducts] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
      ]);

      let fetchedProducts = allProducts.filter((p: any) => !p.isArchived && !p.isHidden);
      if (categoryId) {
        fetchedProducts = fetchedProducts.filter(
          (p: any) => p.categoryId === categoryId,
        );
        const cat = cats.find((c: any) => c.id === categoryId);
        setCategoryName(cat ? cat.name : `القسم ${categoryId}`);
        const subs = cats
          .filter((c: any) => c.parentId === categoryId && !c.isHidden)
          .sort((a: any, b: any) => a.order - b.order);
        setSubCategories(subs);
      }

      setProducts(fetchedProducts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let mounted = true;
    let fetchTimeout: any;
    const init = async () => {
       await fetchProducts();
       if (mounted) {
         setLoading(false);
         setInitialLoading(false);
       }
    };
    init();

    const channel = supabase
      .channel('member_products_view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(() => {
          if (mounted) fetchProducts();
        }, 1500);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(() => {
          if (mounted) fetchProducts();
        }, 1500);
      })
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(fetchTimeout);
      supabase.removeChannel(channel);
    };
  }, [categoryId]);

  const handleAddToCart = (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(p, 1);
    alert("تم إضافة المنتج للطلبية بنجاح!");
  };

  const filteredProducts = activeSub
    ? products.filter((p) => p.subcategoryId === activeSub)
    : products;

  return (
    <div className="flex flex-col bg-brq-black min-h-[calc(100vh-60px)]">
      <div className="glass-panel sticky top-0 z-40 p-4 border-b border-brq-gold/20 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-white/5 rounded-lg border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <div>
              <h2 className="font-bold text-sm text-brq-gold">
                {categoryName}
              </h2>
              <p className="text-[10px] text-white/50">
                {filteredProducts.length} منتجات القائمة
              </p>
            </div>
          </div>
        </div>

        {subCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
            <button
              onClick={() => setActiveSub(null)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs transition-colors border ${!activeSub ? "bg-brq-gold text-black font-bold border-brq-gold" : "bg-black/40 text-white/70 border-white/10 hover:border-brq-gold/50"}`}
            >
              الكل
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveSub(sub.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs transition-colors border ${activeSub === sub.id ? "bg-brq-gold text-black font-bold border-brq-gold" : "bg-black/40 text-white/70 border-white/10 hover:border-brq-gold/50"}`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 w-full">
          <button 
            disabled={downloadProgress !== null}
            onClick={async () => {
              if (filteredProducts.length === 0) {
                 alert("لا توجد منتجات بصور لتحميلها");
                 return;
              }
              const imagesWithData = filteredProducts.filter(p => p.finalImageUrl || p.imageUrl);
              if (imagesWithData.length === 0) {
                 alert("لا توجد صور للمنتجات لتحميلها.");
                 return;
              }
              
              setDownloadProgress({ progress: 0, total: imagesWithData.length });
              try {
                // Dynamically import JSZip and file-saver
                const JSZip = (await import('jszip')).default;
                const { saveAs } = await import('file-saver');

                const zip = new JSZip();
                let completed = 0;

                for (const p of imagesWithData) {
                  const imgUrl = p.finalImageUrl || p.imageUrl;
                  if (imgUrl) {
                    try {
                      const res = await fetch(imgUrl);
                      const blob = await res.blob();
                      const ext = blob.type.split('/')[1] || 'jpg';
                      const filename = `${p.productCode || p.name || 'product'}.${ext}`;
                      zip.file(filename, blob);
                    } catch (e) {
                      console.error(`Failed to download ${p.name}`);
                    }
                  }
                  completed++;
                  setDownloadProgress({ progress: completed, total: imagesWithData.length });
                }

                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `BRQ-${categoryName}.zip`);
              } catch (e) {
                console.error(e);
                alert("حدث خطأ أثناء تحميل الصور");
              }
              setDownloadProgress(null);
            }} 
            className="flex-1 py-2 bg-brq-navy rounded-lg border border-brq-royal/50 flex gap-2 items-center justify-center text-xs text-brq-gold hover:bg-brq-navy/80 transition-colors disabled:opacity-50"
          >
            <Download size={14} /> {downloadProgress ? `جاري التحميل ${downloadProgress.progress}/${downloadProgress.total}` : 'حفظ الصور'}
          </button>
          <button className="flex-1 py-2 bg-white/5 rounded-lg border border-white/10 text-white flex gap-2 items-center justify-center text-xs hover:bg-white/10 transition-colors">
            <Filter size={14} /> تصفية
          </button>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex-1 flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-white/50 p-8 text-center h-64">
          <div className="text-4xl text-brq-gold mb-4 opacity-50">📦</div>
          <p className="text-lg font-bold text-white mb-2">لا توجد منتجات</p>
          <p className="text-sm">
            هذا القسم لا يحتوي على منتجات حالياً. سيتم إضافة منتجات قريباً.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-6 py-2 bg-brq-gold text-black rounded-lg font-bold"
          >
            العودة للرئيسية
          </button>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-24">
          {filteredProducts.map((p) => (
            <Link
              to={`/product/${p.id}`}
              key={p.id}
              className="glass-card rounded-2xl overflow-hidden flex flex-col border border-white/5 relative group hover:border-brq-gold transition-colors shadow-lg"
            >
              <div className="w-full aspect-[4/5] bg-black/40 relative flex items-center justify-center border-b border-white/5 p-0 overflow-hidden">
                {p.finalImageUrl || p.imageUrl ? (
                  <div className="absolute inset-0">
                    <OptimizedImage
                      src={p.finalImageUrl || p.imageUrl}
                      alt={p.name}
                      size="medium"
                      className="w-full h-full"
                      imgClassName="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="text-white/30 text-3xl">👟</div>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2 bg-gradient-to-b from-transparent to-black/40">
                <div className="flex justify-between items-start gap-2">
                  <h3
                    className="font-bold text-white text-xs leading-tight line-clamp-2"
                    dir="rtl"
                  >
                    {p.name}
                  </h3>
                  <span className="text-[10px] text-white/60 bg-white/10 px-1 py-0.5 rounded font-mono shrink-0">
                    {p.productCode || "---"}
                  </span>
                </div>

                <div className="flex items-end justify-between mt-1">
                  <div>
                    <p className="text-brq-gold font-bold text-sm">
                      {p.price?.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-white/40">د.ع / الجملة</p>
                  </div>
                  {p.piecesCount && (
                    <div className="flex flex-col items-end">
                      <p className="text-white font-mono text-xs">
                        {p.piecesCount}
                      </p>
                      <p className="text-[9px] text-white/40">
                        الكمية/عدد القطع
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => handleAddToCart(e, p)}
                  className="w-full py-1.5 mt-2 bg-brq-royal/20 hover:bg-brq-royal border border-brq-royal/50 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ShoppingCart size={14} /> إضافة
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
