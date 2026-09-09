import { formatDateTime, formatDate } from '../../utils/time';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Archive,
  Upload,
  Package,
  Loader2,
  X,
  Download,
  DollarSign,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Share2,
  History,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  FolderInput,
  Sparkles,
  Wand2,
  Layers,
  FolderArchive,
  Lock,
  Unlock,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../api";
import { supabase } from "../../supabase";
import { filterProductsBySearch } from '../../utils/search';
import { Product, Category } from "../../types";
import { 
  autoDetectCategoryAndSubcategory, 
  autoSelectSubcategory, 
  smartDetectMainCategoryId 
} from "../../utils/categoryDetector";
import { detectShowcaseCategory, VALID_SHOWCASE_CATEGORIES, SHOWCASE_CATEGORIES_METADATA } from "../../utils/showcaseClassifier";
import { burnProductOverlay } from "../../utils/burnImage";
import { BatchProductUpload } from "./BatchProductUpload";
import { useStore } from "../../store";
import { CategoryDownloadDialog } from "../shared/CategoryDownloadDialog";
import { ShowcaseCategorizedDownloadDialog } from "./ShowcaseCategorizedDownloadDialog";
import ImageViewer from "../ImageViewer";
import { PriceHistoryViewer } from "../member/PriceHistoryViewer";
import { 
  ProductEditDiffModal, 
  ProductEditLiveDiff, 
  calculateProductDiff,
  ProductChangeDiffItem 
} from "./ProductEditDiffModal";

export default function ProductManager() {
  const { user } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewImage, setViewImage] = useState<{ src: string, alt: string, product?: Product, index?: number } | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [lastEditProduct, setLastEditProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usdRate, setUsdRate] = useState<number>(1580);

  const [isAdding, setIsAdding] = useState(false);
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState<string>("");
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isAutoShowcaseOpen, setIsAutoShowcaseOpen] = useState(false);
  const [isShowcaseDownloadOpen, setIsShowcaseDownloadOpen] = useState(false);

  // Multi-Category Showcase Publishing State
  const [autoShowcaseTab, setAutoShowcaseTab] = useState<'collections' | 'categories'>('collections');
  const [selectedShowcaseCollections, setSelectedShowcaseCollections] = useState<string[]>([
    'رجالي', 'نسائي', 'شبابي', 'ولادي', 'بناتي', 'طفل', 'طفلة', 'بيبي', 'مواليد', 'الحقائب'
  ]);
  const [selectedMainCategoryIds, setSelectedMainCategoryIds] = useState<string[]>([]);
  const [autoShowcaseCount, setAutoShowcaseCount] = useState<string | number>(100);
  const [autoShowcaseAllAvailable, setAutoShowcaseAllAvailable] = useState<boolean>(false);
  const [autoShowcaseDistribution, setAutoShowcaseDistribution] = useState<'total' | 'perCategory'>('total');

  const handleAutoPublishShowcase = async (overrideAll?: boolean) => {
    setIsSubmitting(true);
    try {
      const numericCount = typeof autoShowcaseCount === 'number' ? autoShowcaseCount : (parseInt(autoShowcaseCount, 10) || 100);

      // 1. Get all eligible active products that are not yet in the showcase
      const allAvailable = products.filter(p => !p.isHidden && !p.isArchived && !p.isShowcase);

      if (allAvailable.length === 0) {
        setAlertMessage("لا توجد منتجات فعالة متاحة للنشر في المعرض حالياً (قد تكون جميع المواد منشورة بالفعل أو غير فعالة/مقيدة).");
        setIsSubmitting(false);
        return;
      }

      let targetProducts: Product[] = [];
      const publishAll = overrideAll || autoShowcaseAllAvailable;

      if (autoShowcaseTab === 'collections') {
        if (selectedShowcaseCollections.length === 0) {
          setAlertMessage("يرجى تحديد قسم واحد على الأقل من تشكيلات المعرض للنشر.");
          setIsSubmitting(false);
          return;
        }

        if (autoShowcaseDistribution === 'perCategory' && !publishAll) {
          // Slice per category evenly
          selectedShowcaseCollections.forEach(colName => {
            const colProds = allAvailable.filter(p => {
              const cat = p.showcaseCategory || detectShowcaseCategory(p, categories);
              return cat === colName;
            });
            targetProducts.push(...colProds.slice(0, numericCount));
          });
        } else {
          // Total from selected collections
          const filtered = allAvailable.filter(p => {
            const cat = p.showcaseCategory || detectShowcaseCategory(p, categories);
            return selectedShowcaseCollections.includes(cat);
          });
          targetProducts = publishAll ? filtered : filtered.slice(0, numericCount);
        }
      } else {
        // Main categories mode
        const targetCatIds = selectedMainCategoryIds.length > 0 
          ? selectedMainCategoryIds 
          : categories.filter(c => !c.parentId).map(c => c.id);

        if (targetCatIds.length === 0) {
          setAlertMessage("يرجى تحديد قسم رئيسي واحد على الأقل للنشر.");
          setIsSubmitting(false);
          return;
        }

        if (autoShowcaseDistribution === 'perCategory' && !publishAll) {
          targetCatIds.forEach(catId => {
            const catProds = allAvailable.filter(p => p.categoryId === catId);
            targetProducts.push(...catProds.slice(0, numericCount));
          });
        } else {
          const filtered = allAvailable.filter(p => targetCatIds.includes(p.categoryId || ''));
          targetProducts = publishAll ? filtered : filtered.slice(0, numericCount);
        }
      }

      if (targetProducts.length === 0) {
        setAlertMessage("لم يتم العثور على منتجات مطابقة في الأقسام المحددة للنشر.");
        setIsSubmitting(false);
        return;
      }

      const targetIds = targetProducts.map(p => p.id!).filter(Boolean);
      const targetIdSet = new Set(targetIds);

      // 2. ULTRA-FAST INSTANT OPTIMISTIC UPDATE (0ms delay for the user)
      setProducts(prev => prev.map(p => {
        if (targetIdSet.has(p.id!)) {
          const cat = p.showcaseCategory || detectShowcaseCategory(p, categories) || 'رجالي';
          return { ...p, isShowcase: true, showcaseCategory: cat };
        }
        return p;
      }));

      // Close modal immediately
      setIsAutoShowcaseOpen(false);

      // 3. BACKGROUND PARALLEL BATCH PERSISTENCE
      const categoryGroups: Record<string, string[]> = {};
      targetProducts.forEach(p => {
        const cat = p.showcaseCategory || detectShowcaseCategory(p, categories) || 'رجالي';
        if (!categoryGroups[cat]) categoryGroups[cat] = [];
        categoryGroups[cat].push(p.id!);
      });

      for (const [cat, ids] of Object.entries(categoryGroups)) {
        await api.bulkUpdateProducts(ids, { isShowcase: true, showcaseCategory: cat });
      }
    } catch (e: any) {
      console.error("Auto publish showcase error:", e);
      setAlertMessage("حدث خطأ أثناء النشر: " + (e?.message || ""));
      try {
        const fresh = await api.getProducts();
        if (fresh && fresh.length > 0) {
          setProducts(fresh);
        }
      } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [initialEditingProduct, setInitialEditingProduct] = useState<Product | null>(null);
  const [showDiffConfirmModal, setShowDiffConfirmModal] = useState<boolean>(false);

  const handleStartEdit = (p: Product) => {
    const prepared = { ...p, forceStandardCrush: p.forceStandardCrush ?? true };
    setInitialEditingProduct(JSON.parse(JSON.stringify(prepared)));
    setEditingProduct(prepared);
    setShowDiffConfirmModal(false);
  };
  const [aiStudioProduct, setAiStudioProduct] = useState<Product | null>(null);
  const [aiCharacter, setAiCharacter] = useState<string>('none');
  const [aiShoeCount, setAiShoeCount] = useState<string>('pair');
  const [aiShoeColor, setAiShoeColor] = useState<string>('');
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');
  const [aiChangeBackgroundOnly, setAiChangeBackgroundOnly] = useState<boolean>(false);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const characterPresets: Record<string, { label: string, prompt: string }> = {
    'none': { label: 'بدون شخصية (الحذاء فقط)', prompt: 'The shoes are displayed standalone.' },
    'woman': { label: 'مرأة', prompt: 'A stylish woman wearing the shoes.' },
    'man': { label: 'رجل', prompt: 'A stylish man wearing the shoes.' },
    'girl': { label: 'طفلة', prompt: 'A stylish little girl wearing the shoes.' },
    'boy': { label: 'طفل', prompt: 'A stylish little boy wearing the shoes.' },
  };

  const shoeCountPresets: Record<string, { label: string, prompt: string }> = {
    'one': { label: 'حذاء واحد', prompt: 'A single shoe.' },
    'pair': { label: 'زوج أحذية', prompt: 'A matching pair of shoes.' },
    'multiple': { label: 'مجموعة أحذية', prompt: 'Multiple pairs of these shoes in a dynamic arrangement.' },
  };

  const shoeColorOptions = [
    { label: 'اللون الأصلي', value: '' },
    { label: 'أسود', value: 'black colored shoes' },
    { label: 'أبيض', value: 'white colored shoes' },
    { label: 'أحمر', value: 'red colored shoes' },
    { label: 'أزرق', value: 'blue colored shoes' },
    { label: 'بني', value: 'brown colored shoes' },
    { label: 'وردي', value: 'pink colored shoes' },
    { label: 'ذهبي', value: 'gold colored shoes' },
    { label: 'فضي', value: 'silver colored shoes' },
  ];

  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('custom_gemini_api_key');
      if (saved) return saved;
      return ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';
    } catch {
      return ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';
    }
  });

  const handleCustomApiKeyChange = (val: string) => {
    setCustomApiKey(val);
    try {
      if (val.trim()) {
        localStorage.setItem('custom_gemini_api_key', val.trim());
      } else {
        localStorage.removeItem('custom_gemini_api_key');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateAiDecor = async () => {
    if (!aiStudioProduct) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const currentImg = aiStudioProduct.finalImageUrl || aiStudioProduct.imageUrl;
      let finalPrompt = '';
      if (aiCustomPrompt.trim().length > 0) {
        finalPrompt = aiCustomPrompt.trim();
      } else {
        const charText = characterPresets[aiCharacter]?.prompt || '';
        const countText = shoeCountPresets[aiShoeCount]?.prompt || '';
        const colorText = aiShoeColor ? ` The shoes are ${aiShoeColor}.` : ' The shoes maintain their original colors.';
        finalPrompt = `${charText} ${countText}${colorText} Professional commercial footwear advertisement photograph, photorealistic studio shot, 8k resolution, cinematic lighting.`;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey.trim()) {
        headers['x-gemini-api-key'] = customApiKey.trim();
      }

      let generatedImgUrl = '';

      // Try server API first
      try {
        let res = await fetch('/api/generate-decor', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            imageBase64: currentImg,
            prompt: finalPrompt,
            productName: aiStudioProduct.name,
            productCategory: (aiStudioProduct as any).category || aiStudioProduct.categoryId,
            productDescription: (aiStudioProduct as any).description,
            customApiKey: customApiKey.trim() || undefined,
            changeBackgroundOnly: aiChangeBackgroundOnly,
          })
        });

        if (!res.ok) {
          const res2 = await fetch('/api/generate-image', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              imageBase64: currentImg,
              prompt: finalPrompt,
              productName: aiStudioProduct.name,
              productCategory: (aiStudioProduct as any).category || aiStudioProduct.categoryId,
              productDescription: (aiStudioProduct as any).description,
              customApiKey: customApiKey.trim() || undefined,
              changeBackgroundOnly: aiChangeBackgroundOnly,
            })
          });
          if (res2.ok) {
            res = res2;
          }
        }

        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            if (data?.imageUrl) {
              generatedImgUrl = data.imageUrl;
            }
          }
        }
      } catch (serverErr) {
        console.warn('Server generation failed:', serverErr);
      }

      // If server generation was not available or failed (e.g. 405 on Vercel), perform direct client-side generation
      if (!generatedImgUrl) {
        console.log('Executing direct client-side generation fallback...');
        
        // Option 1: If user provided a Gemini API Key, try client Gemini SDK
        if (customApiKey.trim()) {
          try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: customApiKey.trim() });
            const combinedPrompt = `Professional commercial footwear advertisement photograph. ${finalPrompt || 'High-end footwear display photograph.'} Photorealistic studio shot, 8k resolution, crisp focus, cinematic lighting.`;
            
            const imageResponse = await ai.models.generateImages({
              model: 'imagen-3.0-generate-002',
              prompt: combinedPrompt,
              config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' }
            });
            if (imageResponse.generatedImages?.[0]?.image?.imageBytes) {
              generatedImgUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
            }
          } catch (clientGeminiErr) {
            console.warn('Client-side Gemini generation failed:', clientGeminiErr);
          }
        }

        // Option 2: Direct High-Quality Flux AI Generation via Pollinations
        if (!generatedImgUrl) {
          try {
            const combinedPrompt = `Professional commercial footwear advertisement photograph. ${finalPrompt || 'High-end footwear display photograph.'} Photorealistic studio shot, 8k resolution, crisp focus, studio lighting, commercial product display.`;
            const encodedPrompt = encodeURIComponent(combinedPrompt);
            const seed = Math.floor(Math.random() * 1000000);
            const pollUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;

            const pRes = await fetch(pollUrl);
            if (pRes.ok) {
              const blob = await pRes.blob();
              const reader = new FileReader();
              const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
              });
              reader.readAsDataURL(blob);
              generatedImgUrl = await base64Promise;
            }
          } catch (pollErr) {
            console.warn('Client-side Flux AI generation failed:', pollErr);
          }
        }
      }

      if (!generatedImgUrl) {
        throw new Error("تعذر معالجة طلب توليد الصورة. يرجى إعادة المحاولة.");
      }

      setAiResultUrl(generatedImgUrl);
    } catch (err: any) {
      console.error('Error generating AI decor:', err);
      setAiError(err.message || 'حدث خطأ أثناء توليد الصورة بالذكاء الاصطناعي');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAiImage = async () => {
    if (!aiStudioProduct || !aiResultUrl) return;
    try {
      setIsSubmitting(true);
      await api.updateProduct(aiStudioProduct.id, {
        imageUrl: aiResultUrl,
        finalImageUrl: aiResultUrl,
      });
      setProducts(prev => prev.map(p => p.id === aiStudioProduct.id ? { ...p, imageUrl: aiResultUrl, finalImageUrl: aiResultUrl } : p));
      setAlertMessage("تم حفظ واعتماد الصورة الجديدة بالذكاء الاصطناعي للمنتج بنجاح!");
      setAiStudioProduct(null);
      setAiResultUrl(null);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ الصورة");
    } finally {
      setIsSubmitting(false);
    }
  };
  const [deleteConfirm, setDeleteConfirm] = useState<{ isBulk: boolean; ids?: string[]; name?: string; count?: number; } | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{ atNumber: string; existingName: string; type: 'create' | 'update'; payload: any } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{
    progress: number;
    total: number;
  } | null>(null);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    price: 0,
    dozenPriceUsd: 0,
    modelNumber: "",
    productCode: "",
    barcode: "",
    categoryId: "",
    imageUrl: "",
    forceStandardCrush: true,
    isHidden: true,
    isShowcase: false,
    showcaseCategory: "رجالي",
  });

  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived" | "locked" | "inactive" | "duplicates" | "showcase" | null>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveToCategoryId, setMoveToCategoryId] = useState("");
  const [moveToSubcategoryId, setMoveToSubcategoryId] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState<number>(100);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchDate, filterCategoryId, filterStatus]);

  const handleAutoSelectSubcategory = (name: string, categoryId: string, currentSubcategoryId?: string) => {
    return autoSelectSubcategory(name, categoryId, currentSubcategoryId, categories);
  };

  const loadData = async () => {
    try {
      api.getCategories().then(cats => setCategories(cats));
      api.getSettings().then(settings => {
        if (settings?.usdExchangeRate) {
          setUsdRate(settings.usdExchangeRate);
        }
      });
      const prods = await api.getProducts();
      setProducts(
        prods
          .map((p: any) => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
          }))
          .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let mounted = true;
    let fetchTimeout: any;
    const initialLoad = async () => {
      await loadData();
      if (mounted) setLoading(false);
    };
    initialLoad();

    // Instant local BroadcastChannel synchronization across tabs
    let bc: any = null;
    try {
      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.onmessage = () => {
          if (mounted) loadData();
        };
      }
    } catch {}

    const channel = supabase
      .channel("products_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          clearTimeout(fetchTimeout);
          fetchTimeout = setTimeout(() => {
             if (mounted) loadData();
          }, 300);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        () => {
          clearTimeout(fetchTimeout);
          fetchTimeout = setTimeout(() => {
             if (mounted) loadData();
          }, 300);
        },
      )
      .on('broadcast', { event: 'bulk_updated' }, () => {
        if (mounted) loadData();
      })
      .on('broadcast', { event: 'product_changed' }, () => {
        if (mounted) loadData();
      })
      .on('broadcast', { event: 'product_created' }, () => {
        if (mounted) loadData();
      })
      .on('broadcast', { event: 'bulk_deleted' }, () => {
        if (mounted) loadData();
      })
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(fetchTimeout);
      supabase.removeChannel(channel);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, []);

  const getNormalizedRate = () => {
    const r = usdRate || 1580;
    if (r >= 50000) return Math.round(r / 100);
    if (r >= 50 && r <= 500) return Math.round(r * 10);
    return Math.round(r);
  };

  const handleUsdPriceChange = (
    usdValue: number,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;
    
    const rate = getNormalizedRate();
    const cleanUsd = Number(Number(usdValue).toFixed(2));
    const iqdValue = Math.round(cleanUsd * rate);
    const calcPieces = (target.forceStandardCrush ?? true) ? 12 : (Number(target.piecesCount) || 12);
    const pieceUsd = calcPieces > 0 ? Number((cleanUsd / calcPieces).toFixed(2)) : 0;
    const pieceIqd = calcPieces > 0 ? Math.round(iqdValue / calcPieces) : 0;

    const updated = {
      ...target,
      dozenPriceUsd: cleanUsd,
      price: iqdValue,
      piecePriceUsd: pieceUsd,
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handleIqdPriceChange = (
    iqdValue: number,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;
    
    const rate = getNormalizedRate();
    const cleanIqd = Math.round(Number(iqdValue) || 0);
    const usdValue = rate > 0 ? Number((cleanIqd / rate).toFixed(2)) : 0;
    const calcPieces = (target.forceStandardCrush ?? true) ? 12 : (Number(target.piecesCount) || 12);
    const pieceUsd = calcPieces > 0 ? Number((usdValue / calcPieces).toFixed(2)) : 0;
    const pieceIqd = calcPieces > 0 ? Math.round(cleanIqd / calcPieces) : 0;

    const updated = {
      ...target,
      dozenPriceUsd: usdValue,
      price: cleanIqd,
      piecePriceUsd: pieceUsd,
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handlePackagingChange = (
    packaging: string,
    isEditing: boolean = false
  ) => {
    if (isEditing) {
      setEditingProduct(prev => prev ? { ...prev, packaging } as any : prev);
    } else {
      setNewProduct(prev => prev ? { ...prev, packaging } as any : prev);
    }
  };

  const handleForceStandardCrushChange = (
    forceStandardCrush: boolean,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;

    const calcPieces = forceStandardCrush ? 12 : (Number(target.piecesCount) || 12);
    const usdValue = Number(target.dozenPriceUsd) || 0;
    const iqdValue = Number(target.price) || 0;
    
    const pieceUsd = calcPieces > 0 ? Number((usdValue / calcPieces).toFixed(2)) : 0;
    const pieceIqd = calcPieces > 0 ? Math.round(iqdValue / calcPieces) : 0;

    const updated = {
      ...target,
      forceStandardCrush,
      piecePriceUsd: pieceUsd,
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handlePiecesCountChange = (
    piecesCount: number,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;

    const calcPieces = (target.forceStandardCrush ?? true) ? 12 : (Number(piecesCount) || 12);
    const usdValue = Number(target.dozenPriceUsd) || 0;
    const iqdValue = Number(target.price) || 0;
    
    const pieceUsd = calcPieces > 0 ? Number((usdValue / calcPieces).toFixed(2)) : 0;
    const pieceIqd = calcPieces > 0 ? Math.round(iqdValue / calcPieces) : 0;

    const updated = {
      ...target,
      piecesCount,
      piecePriceUsd: pieceUsd,
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEditing: boolean,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 850;
        const MAX_HEIGHT = 850;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          if (isEditing && editingProduct) {
            setEditingProduct({ ...editingProduct, imageUrl: dataUrl });
          } else {
            setNewProduct({ ...newProduct, imageUrl: dataUrl });
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const extractAtNumber = (name: string) => {
    if (!name) return null;
    const words = name.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord && !/[\u0600-\u06FF]/.test(lastWord) && lastWord.length >= 3) {
      return lastWord.toUpperCase().replace(/[-_]/g, '');
    }
    return null;
  };

  const proceedCreate = async (payloadToCreate: any) => {
    setIsSubmitting(true);
    setDuplicateConfirm(null);
    try {
      let finalImg = payloadToCreate.imageUrl;
      if (payloadToCreate.imageUrl) {
        try {
          finalImg = await burnProductOverlay(payloadToCreate, payloadToCreate.imageUrl);
        } catch (e) {
          console.error("Failed to generate burned image", e);
        }
      }

      const created = await api.createProduct({
        ...payloadToCreate,
        finalImageUrl: finalImg,
        views: 0,
        isArchived: false,
        isHidden: payloadToCreate.isHidden ?? true,
      });
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "إضافة منتج جديد",
        entityType: "product",
        entityId: created.id,
        details: { name: payloadToCreate.name, code: payloadToCreate.productCode },
      });
      // setIsAdding(false); removed to keep form open
      setPublishSuccess(true);
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (error: any) {
      console.error(error);
      setAlertMessage("حدث خطأ أثناء الإضافة: " + (error.message || JSON.stringify(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || isSubmitting) return;

    const atNumber = extractAtNumber(newProduct.name);
    if (atNumber) {
      const existing = products.find(p => {
        const existingAt = extractAtNumber(p.name || "");
        return existingAt === atNumber;
      });
      if (existing) {
        setDuplicateConfirm({
          atNumber,
          existingName: existing.name || '',
          type: 'create',
          payload: newProduct
        });
        return;
      }
    }

    proceedCreate(newProduct);
  };

  const proceedUpdate = async (payloadToUpdate: any, diffs?: ProductChangeDiffItem[]) => {
    setDuplicateConfirm(null);
    setShowDiffConfirmModal(false);
    const originalProduct = products.find(p => p.id === payloadToUpdate.id);
    let finalImg = payloadToUpdate.finalImageUrl || payloadToUpdate.imageUrl;

    const isPriceChanged = originalProduct && (
      originalProduct.price !== payloadToUpdate.price ||
      originalProduct.piecePriceIqd !== payloadToUpdate.piecePriceIqd ||
      originalProduct.dozenPriceUsd !== payloadToUpdate.dozenPriceUsd
    );

    const oldPriceInfo = (isPriceChanged && originalProduct?.finalImageUrl) ? {
      price: originalProduct.price,
      piecePriceIqd: originalProduct.piecePriceIqd,
      dozenPriceUsd: originalProduct.dozenPriceUsd,
      finalImageUrl: originalProduct.finalImageUrl,
      updatedAt: Date.now()
    } : originalProduct?.oldPriceInfo;

    const wasInactive = originalProduct && (originalProduct.isHidden || originalProduct.isArchived);
    const isNowActive = !payloadToUpdate.isHidden && !payloadToUpdate.isArchived;
    const autoShowcaseCat = (wasInactive && isNowActive)
      ? (payloadToUpdate.showcaseCategory || detectShowcaseCategory(payloadToUpdate, categories) || 'عام')
      : payloadToUpdate.showcaseCategory;

    const fullUpdatedProduct = {
      ...payloadToUpdate,
      ...(wasInactive && isNowActive ? { isShowcase: true, showcaseCategory: autoShowcaseCat } : {}),
      finalImageUrl: finalImg,
      oldPriceInfo: oldPriceInfo
    };

    // 1. INSTANT LOCAL UPDATE & CLOSE MODAL (Zero wait time for the user)
    setProducts(prev => prev.map(p => p.id === payloadToUpdate.id ? { ...p, ...fullUpdatedProduct } : p));
    setEditingProduct(null);
    setInitialEditingProduct(null);
    setIsSubmitting(false);

    const changedFieldNames = diffs && diffs.length > 0 
      ? diffs.map(d => d.label).join("، ") 
      : "البيانات";
    setAlertMessage(`تم حفظ التعديلات بنجاح على المنتج (${payloadToUpdate.name || payloadToUpdate.productCode || ''}) - تم تعديل: ${changedFieldNames}`);

    // 2. Background burn and persist
    try {
      if (payloadToUpdate.imageUrl && (
        originalProduct?.price !== payloadToUpdate.price ||
        originalProduct?.name !== payloadToUpdate.name ||
        originalProduct?.piecePriceIqd !== payloadToUpdate.piecePriceIqd ||
        originalProduct?.dozenPriceUsd !== payloadToUpdate.dozenPriceUsd ||
        originalProduct?.packaging !== payloadToUpdate.packaging ||
        originalProduct?.piecesCount !== payloadToUpdate.piecesCount ||
        originalProduct?.forceStandardCrush !== payloadToUpdate.forceStandardCrush ||
        originalProduct?.productCode !== payloadToUpdate.productCode ||
        originalProduct?.imageUrl !== payloadToUpdate.imageUrl ||
        !payloadToUpdate.finalImageUrl
      )) {
        try {
          finalImg = await burnProductOverlay(
            payloadToUpdate,
            payloadToUpdate.imageUrl,
          );
          fullUpdatedProduct.finalImageUrl = finalImg;
          setProducts(prev => prev.map(p => p.id === payloadToUpdate.id ? { ...p, finalImageUrl: finalImg } : p));
        } catch (err) {
          console.error("Failed to generate burned image on update", err);
        }
      }

      await api.updateProduct(payloadToUpdate.id!, fullUpdatedProduct);

      api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "تعديل بيانات أو صورة منتج",
        entityType: "product",
        entityId: payloadToUpdate.id,
        details: { 
          name: payloadToUpdate.name,
          code: payloadToUpdate.productCode,
          changesCount: diffs?.length || 0,
          changesSummary: diffs && diffs.length > 0 ? diffs.map(d => `${d.label}: (${d.oldDisplay} ➔ ${d.newDisplay})`).join(" | ") : undefined,
          changes: diffs?.map(d => ({
            field: d.label,
            from: d.oldDisplay,
            to: d.newDisplay,
            difference: d.difference || undefined
          }))
        },
      }).catch(() => {});
    } catch (error: any) {
      console.error(error);
      setAlertMessage("حدث خطأ أثناء حفظ التعديل: " + (error?.message || ""));
      const updated = await api.getProducts();
      setProducts(updated);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.price || isSubmitting)
      return;

    const diffs = calculateProductDiff(initialEditingProduct, editingProduct, categories);
    if (diffs.length === 0) {
      setAlertMessage("لم تقم بإجراء أي تغييرات على بيانات هذا المنتج.");
      return;
    }

    const atNumber = extractAtNumber(editingProduct.name);
    if (atNumber) {
      const existing = products.find(p => {
        if (p.id === editingProduct.id) return false;
        const existingAt = extractAtNumber(p.name || "");
        return existingAt === atNumber;
      });
      if (existing) {
        setDuplicateConfirm({
          atNumber,
          existingName: existing.name || '',
          type: 'update',
          payload: editingProduct
        });
        return;
      }
    }

    // Skip diff modal and proceed with instant update directly
    const fullEditingProduct = {
      ...editingProduct,
      lastEditDiffs: diffs,
      lastEditDate: Date.now()
    };
    proceedUpdate(fullEditingProduct, diffs);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ isBulk: false, ids: [id], name });
  };

  const executeDelete = async () => {
    if (!deleteConfirm || !deleteConfirm.ids || deleteConfirm.ids.length === 0) return;
    
    const targetIds = [...deleteConfirm.ids];
    const isBulk = deleteConfirm.isBulk;
    const targetName = deleteConfirm.name;

    // 1. Immediately close the confirmation modal & clear selection with zero lag
    setDeleteConfirm(null);
    if (isBulk) {
      setSelectedIds(new Set());
    }

    // 2. Instantly remove products from local UI state (optimistic instant update)
    const targetIdSet = new Set(targetIds);
    setProducts((prev) => prev.filter((prod) => !targetIdSet.has(prod.id!)));

    // 3. Perform the database deletion swiftly in the background without blocking the UI
    try {
      if (isBulk) {
        await api.bulkDeleteProducts(targetIds, user?.username);
        api.logAction({
          userId: user?.uid || "",
          userName: user?.username || "System",
          action: "حذف مجموعة منتجات",
          entityType: "product",
          details: { count: targetIds.length, ids: targetIds },
        }).catch(() => {});
      } else {
        const id = targetIds[0];
        await api.bulkDeleteProducts([id], user?.username);
        api.logAction({
          userId: user?.uid || "",
          userName: user?.username || "System",
          action: "حذف منتج",
          entityType: "product",
          entityId: id,
          details: { name: targetName },
        }).catch(() => {});
      }
    } catch (e: any) {
      console.error("Error deleting product(s):", e);
      // If server error occurs, re-sync from server
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل الحذف من الخادم: " + e.message);
    }
  };

  const handleToggleArchive = async (p: Product) => {
    if (p.isArchived) {
      setAlertMessage("لا يمكن استرجاع المواد النافذة نهائياً، لقد أصبحت في المواد النافذة للأبد.");
      return;
    }
    const updates: any = { isArchived: true, isShowcase: false, isLocked: true };

    // Optimistic update
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === p.id 
          ? { ...prod, ...updates } 
          : prod
      )
    );
    try {
      await api.updateProduct(p.id!, updates);
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل تغيير حالة المنتج");
    }
  };

  const handleToggleLock = async (p: Product) => {
    const nextLocked = !p.isLocked;
    const updates: any = { isLocked: nextLocked };

    // Optimistic update
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === p.id 
          ? { ...prod, isLocked: nextLocked } 
          : prod
      )
    );
    try {
      await api.updateProduct(p.id!, updates);
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل تغيير قفل المنتج");
    }
  };

  const handleToggleHide = async (p: Product) => {
    const nextHidden = !p.isHidden;
    const cat = p.showcaseCategory || detectShowcaseCategory(p, categories) || 'عام';
    // When hidden: true -> MUST set isShowcase: false to completely deactivate and remove from showcase
    const updates: any = { 
      isHidden: nextHidden,
      ...(nextHidden ? { isShowcase: false } : { isShowcase: true, showcaseCategory: cat })
    };

    // Optimistic update
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === p.id ? { ...prod, ...updates } : prod
      )
    );
    try {
      await api.updateProduct(p.id!, updates);
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل تغيير حالة إخفاء المنتج");
    }
  };

  const handleToggleShowcase = async (p: Product, showcaseCategory?: string) => {
    const nextShowcase = !p.isShowcase;
    const cat = showcaseCategory || (nextShowcase ? detectShowcaseCategory(p, categories) : (p.showcaseCategory || 'رجالي'));
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === p.id ? { ...prod, isShowcase: nextShowcase, showcaseCategory: cat } : prod
      )
    );
    try {
      await api.updateProduct(p.id!, { isShowcase: nextShowcase, showcaseCategory: cat });
    } catch (e) {
      console.error(e);
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل تحديث حالة النشر في المعرض");
    }
  };

  const handleBulkToggleShowcase = async (publish: boolean) => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      const productsToUpdate = products.filter(p => selectedIds.has(p.id!));
      
      setProducts((prev) =>
        prev.map((prod) => {
          if (selectedIds.has(prod.id!)) {
            const cat = publish ? detectShowcaseCategory(prod, categories) : (prod.showcaseCategory || 'رجالي');
            return { ...prod, isShowcase: publish, showcaseCategory: cat };
          }
          return prod;
        })
      );
      
      if (!publish) {
        await api.bulkUpdateProducts(productsToUpdate.map(p => p.id!), { isShowcase: false });
      } else {
        // Group by category to execute minimal bulk calls
        const categoryGroups: Record<string, string[]> = {};
        productsToUpdate.forEach(p => {
          const cat = detectShowcaseCategory(p, categories);
          if (!categoryGroups[cat]) categoryGroups[cat] = [];
          categoryGroups[cat].push(p.id!);
        });

        for (const [cat, ids] of Object.entries(categoryGroups)) {
          await api.bulkUpdateProducts(ids, { isShowcase: true, showcaseCategory: cat });
        }
      }

      setSelectedIds(new Set());
    } catch (e: any) {
      console.error("Error bulk toggling showcase:", e);
      try {
        const updated = await api.getProducts();
        if (updated && updated.length > 0) {
          setProducts(updated);
        }
      } catch (err) {
        console.warn("Could not reload products after showcase update error:", err);
      }
      setAlertMessage("فشل التحديث المجمع للمعرض: " + (e?.message || "تعذر الاتصال بالخادم"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectCurrentPage = () => {
    const pageIds = paginatedProducts.map((p) => p.id!).filter(Boolean);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allPageSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const selectAllFiltered = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id!).filter(Boolean)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleAll = (visibleProducts: Product[]) => {
    selectCurrentPage();
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ isBulk: true, ids: Array.from(selectedIds), count: selectedIds.size });
  };

  const handleBulkToggleHide = async (hide: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const targetIdsSet = new Set(ids.map(id => String(id)));
    const productsToUpdate = products.filter(p => targetIdsSet.has(String(p.id)));
    setSelectedIds(new Set());
    setIsSubmitting(true);

    if (!hide) {
      // Activating products -> Auto publish to showcase!
      setProducts((prev) =>
        prev.map((prod) => {
          if (targetIdsSet.has(String(prod.id))) {
            const cat = prod.showcaseCategory || detectShowcaseCategory(prod, categories) || 'عام';
            return { ...prod, isHidden: false, isShowcase: true, showcaseCategory: cat };
          }
          return prod;
        })
      );

      try {
        const categoryGroups: Record<string, string[]> = {};
        productsToUpdate.forEach(p => {
          const cat = p.showcaseCategory || detectShowcaseCategory(p, categories) || 'عام';
          if (!categoryGroups[cat]) categoryGroups[cat] = [];
          categoryGroups[cat].push(p.id!);
        });

        for (const [cat, groupIds] of Object.entries(categoryGroups)) {
          await api.bulkUpdateProducts(groupIds, { isHidden: false, isShowcase: true, showcaseCategory: cat });
        }
      } catch (e: any) {
        console.error("Error bulk toggling hide:", e);
        try {
          const updated = await api.getProducts();
          if (updated && updated.length > 0) {
            setProducts(updated);
          }
        } catch {}
        setAlertMessage("فشل التحديث المجمع: " + e.message);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Instant optimistic local update: hiding items completely removes them from showcase
      setProducts((prev) =>
        prev.map((prod) =>
          targetIdsSet.has(String(prod.id)) ? { ...prod, isHidden: true, isShowcase: false } : prod
        )
      );

      try {
        await api.bulkUpdateProducts(ids, { isHidden: true, isShowcase: false });
      } catch (e: any) {
        console.error("Error bulk toggling hide:", e);
        try {
          const updated = await api.getProducts();
          if (updated && updated.length > 0) {
            setProducts(updated);
          }
        } catch {}
        setAlertMessage("فشل التحديث المجمع: " + e.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBulkToggleArchive = async (archive: boolean) => {
    if (!archive) {
      setAlertMessage("لا يمكن استرجاع المواد النافذة نهائياً، لقد أصبحت في المواد النافذة للأبد.");
      return;
    }
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const targetIdsSet = new Set(ids.map(id => String(id)));
    setSelectedIds(new Set());
    setIsSubmitting(true);

    const updatePayload = { isArchived: true, isShowcase: false, isLocked: true };

    // Instant optimistic local update
    setProducts((prev) =>
      prev.map((prod) =>
        targetIdsSet.has(String(prod.id))
          ? { ...prod, ...updatePayload }
          : prod
      )
    );

    try {
      await api.bulkUpdateProducts(ids, updatePayload);
    } catch (e: any) {
      console.error("Error bulk toggling out of stock:", e);
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل التحديث المجمع: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const targetIdsSet = new Set(ids.map(id => String(id)));
    setSelectedIds(new Set());
    setIsSubmitting(true);

    const updatePayload = { isLocked: lock };

    setProducts((prev) =>
      prev.map((prod) =>
        targetIdsSet.has(String(prod.id))
          ? { ...prod, ...updatePayload }
          : prod
      )
    );

    try {
      await api.bulkUpdateProducts(ids, updatePayload);
    } catch (e: any) {
      console.error("Error bulk toggling lock:", e);
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل التحديث المجمع للقفل: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCleanShowcaseArchived = async () => {
    setIsSubmitting(true);
    try {
      const targetProds = products.filter(p => (p.isArchived || p.isHidden) && p.isShowcase);
      if (targetProds.length === 0) {
        setAlertMessage("المعرض نظيف تماماً، ولا توجد أي مواد نافذة أو مخفية منشورة فيه.");
        setIsSubmitting(false);
        return;
      }
      const ids = targetProds.map(p => p.id!).filter(Boolean);
      setProducts(prev => prev.map(p => ids.includes(p.id!) ? { ...p, isShowcase: false } : p));
      await api.bulkUpdateProducts(ids, { isShowcase: false });
      setAlertMessage(`تم بنجاح تنظيف المعرض وإزالة ${ids.length} مادة نافذة أو مخفية من العرض.`);
    } catch (e: any) {
      console.error(e);
      setAlertMessage("فشل تنظيف المعرض: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkMoveCategory = async () => {
    if (selectedIds.size === 0 || !moveToCategoryId) return;
    const targetCatId = moveToCategoryId;
    const targetSubcatId = moveToSubcategoryId || null;
    const ids = Array.from(selectedIds);
    const targetIdsSet = new Set(ids.map(id => String(id)));
    
    // Instant optimistic update and close modal immediately
    setProducts((prev) =>
      prev.map((prod) =>
        targetIdsSet.has(String(prod.id)) ? { ...prod, categoryId: targetCatId, subcategoryId: targetSubcatId || undefined } : prod
      )
    );
    setSelectedIds(new Set());
    setIsMoveModalOpen(false);
    setMoveToCategoryId("");
    setMoveToSubcategoryId("");
    setIsSubmitting(true);

    try {
      await api.bulkUpdateProducts(ids, { categoryId: targetCatId, subcategoryId: targetSubcatId });
    } catch (e: any) {
      console.error("Error bulk moving categories:", e);
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل نقل الأقسام: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSmartAutoMove = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const updates: { id: string; categoryId: string }[] = [];
    
    const updatedProducts = products.map(prod => {
      if (selectedIds.has(prod.id!)) {
        const matchedCatId = smartDetectMainCategoryId(prod, categories);
        updates.push({ id: prod.id!, categoryId: matchedCatId });
        return { ...prod, categoryId: matchedCatId, subcategoryId: '' };
      }
      return prod;
    });

    // Instant optimistic update & close modal
    setProducts(updatedProducts);
    setSelectedIds(new Set());
    setIsMoveModalOpen(false);
    setMoveToCategoryId("");
    setMoveToSubcategoryId("");

    setIsSubmitting(true);
    try {
      const catGroups: Record<string, string[]> = {};
      updates.forEach(u => {
        if (!catGroups[u.categoryId]) catGroups[u.categoryId] = [];
        catGroups[u.categoryId].push(u.id);
      });
      for (const [catId, groupIds] of Object.entries(catGroups)) {
        await api.bulkUpdateProducts(groupIds, { categoryId: catId, subcategoryId: '' });
      }
    } catch (e: any) {
      console.error(e);
      try {
        const updated = await api.getProducts();
        if (updated && updated.length > 0) {
          setProducts(updated);
        }
      } catch {}
      setAlertMessage("حدث خطأ أثناء النقل التلقائي: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkShare = async () => {
    if (selectedIds.size === 0) return;

    const productsToDownload = products.filter((p) => selectedIds.has(p.id!));
    const imagesWithData = productsToDownload.filter(
      (p) => p.finalImageUrl || p.imageUrl,
    );

    if (imagesWithData.length === 0) {
      setAlertMessage("لا توجد صور للمنتجات المحددة.");
      return;
    }

    setDownloadProgress({ progress: 0, total: imagesWithData.length });
    setDownloadProgress({ progress: 0, total: imagesWithData.length });
    const imagesToDownload = imagesWithData
      .filter(p => p.finalImageUrl || p.imageUrl)
      .map(p => {
        const imgUrl = p.finalImageUrl || p.imageUrl;
        const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
        const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
        const filename = `${safeName}.${ext}`;
        return { url: imgUrl!, filename };
      });
    const { downloadImages } = await import('../../utils/download');
    await downloadImages(imagesToDownload, (progress, total) => {
      setDownloadProgress({ progress, total });
    });
    setDownloadProgress(null);
    setSelectedIds(new Set());
  };
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    const productsToDownload = products.filter((p) => selectedIds.has(p.id!));
    const imagesWithData = productsToDownload.filter(
      (p) => p.finalImageUrl || p.imageUrl,
    );

    if (imagesWithData.length === 0) {
      setAlertMessage("لا توجد صور للمنتجات المحددة.");
      return;
    }

    setDownloadProgress({ progress: 0, total: imagesWithData.length });
    
    const imagesToDownload = imagesWithData
      .filter(p => p.finalImageUrl || p.imageUrl)
      .map(p => {
        const imgUrl = p.finalImageUrl || p.imageUrl;
        const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
        const safeName = (p.productCode || p.name || 'product').replace(/[\/\?<>\\:\*\|":]/g, '-');
        const filename = `${safeName}.${ext}`;
        
        // When user manually selects specific items, download directly mixed together in root without folders
        return { url: imgUrl!, filename };
      });
      
    const { downloadAsZip } = await import('../../utils/zipDownload');
    await downloadAsZip('products_selected', imagesToDownload, (progress, total) => {
      setDownloadProgress({ progress, total });
    });

    setDownloadProgress(null);
    setSelectedIds(new Set());
  };

  const handleDownloadInactiveImages = async () => {
    const productsToDownload = products.filter((p) => p.isHidden && !p.isArchived);
    const imagesWithData = productsToDownload.filter(
      (p) => p.finalImageUrl || p.imageUrl,
    );

    if (imagesWithData.length === 0) {
      setAlertMessage("لا توجد صور للمنتجات الغير فعالة.");
      return;
    }

    setDownloadProgress({ progress: 0, total: imagesWithData.length });
    
    const imagesToDownload = imagesWithData
      .filter(p => p.finalImageUrl || p.imageUrl)
      .map(p => {
        const imgUrl = p.finalImageUrl || p.imageUrl;
        const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
        const safeName = (p.productCode || p.name || 'product').replace(/[\/\?<>\\:\*\|":]/g, '-');
        const filename = `${safeName}.${ext}`;
        
        const isSpecialUser = user?.fullName === "نصيف عبد الرزاق" || user?.fullName === "نصيف عبدالرزاق" || user?.username === "modemomr3b@gmail.com" || user?.fullName?.includes("نصيف") || user?.role === 'admin';
        let folderName = undefined;
        
        if (isSpecialUser) {
          const getProductType = (name: string) => {
            if (!name) return 'أخرى';
            const lowerName = name.toLowerCase();
            if (lowerName.includes('لابجين')) return 'لابجين';
            if (lowerName.includes('رياض')) return 'رياضة';
            if (lowerName.includes('شحاط')) return 'شحاطة';
            if (lowerName.includes('احذي') || lowerName.includes('أحذي') || lowerName.includes('حذاء')) return 'حذاء';
            if (lowerName.includes('لاستيك')) return 'لاستيك';
            if (lowerName.includes('صندل') || lowerName.includes('صنادل')) return 'صندل';
            if (lowerName.includes('سليبر')) return 'سليبر';
            if (lowerName.includes('بوتين')) return 'بوتين';
            if (lowerName.includes('كعب')) return 'كعب';
            if (lowerName.includes('فلات')) return 'فلات';
            if (lowerName.includes('بسطال')) return 'بسطال';
            return 'أخرى';
          };
          const getProductGroup = (name: string) => {
            if (!name) return '';
            const lowerName = name.toLowerCase();
            if (lowerName.includes('رجالي')) return 'الرجالي';
            if (lowerName.includes('نسائي')) return 'النسائي';
            if (lowerName.includes('شبابي')) return 'الشبابي';
            if (lowerName.includes('ولادي')) return 'الولادي';
            if (lowerName.includes('بناتي')) return 'البناتي';
            if (lowerName.includes('طفلة')) return 'الطفلة';
            if (lowerName.includes('طفل')) return 'الطفل';
            if (lowerName.includes('مواليد')) return 'المواليد';
            if (lowerName.includes('بيبي')) return 'البيبي';
            return '';
          };

          const grp = getProductGroup(p.name || '');
          const typ = getProductType(p.name || '');
          folderName = grp ? `${grp}/${typ}` : typ;
        }

        return { url: imgUrl!, filename, folderName };
      });
      
    const { downloadAsZip } = await import('../../utils/zipDownload');
    await downloadAsZip('products', imagesToDownload, (progress, total) => {
      setDownloadProgress({ progress, total });
    });

    setDownloadProgress(null);
  };
  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || "بدون قسم";
  };

  const { duplicatesSet, modelMap } = useMemo(() => {
    const dups = new Set<string>();
    const map = new Map<string, string[]>();
    products.forEach(p => {
      const key = p.modelNumber || p.productCode;
      if (key) {
        if (map.has(key)) {
           dups.add(key);
           map.get(key)!.push(p.id!);
        } else {
           map.set(key, [p.id!]);
        }
      }
    });
    return { duplicatesSet: dups, modelMap: map };
  }, [products]);

  // Tab counts for clear visual counters
  const tabCounts = useMemo(() => {
    return {
      all: products.length,
      active: products.filter(p => !p.isHidden && !p.isArchived).length,
      inactive: products.filter(p => p.isHidden && !p.isArchived).length,
      archived: products.filter(p => p.isArchived).length,
      locked: products.filter(p => p.isLocked).length,
      duplicates: products.filter(p => duplicatesSet.has(p.modelNumber || p.productCode)).length,
      showcase: products.filter(p => p.isShowcase && !p.isArchived && !p.isHidden).length,
    };
  }, [products, duplicatesSet]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Filter by Status Tab
      if (filterStatus === 'active') {
        // Only active: NOT hidden, NOT out of stock/archived
        if (p.isHidden || p.isArchived) return false;
      } else if (filterStatus === 'inactive') {
        // Only inactive: isHidden is true, NOT out of stock/archived
        if (!p.isHidden || p.isArchived) return false;
      } else if (filterStatus === 'archived') {
        // Only out of stock/archived
        if (!p.isArchived) return false;
      } else if (filterStatus === 'locked') {
        // Only locked products
        if (!p.isLocked) return false;
      } else if (filterStatus === 'duplicates') {
        // Only duplicates
        if (!duplicatesSet.has(p.modelNumber || p.productCode)) return false;
      } else if (filterStatus === 'showcase') {
        // Only showcase
        if (!p.isShowcase) return false;
      } else if (filterStatus === 'all') {
        // All products regardless of active/inactive/archived!
      } else if (filterStatus === null) {
        // If null and no search, hide
        if (!searchQuery && !searchDate && !filterCategoryId) return false;
        // If search exists but no tab selected, default to active
        if (p.isHidden || p.isArchived) return false;
      }

      // 2. Filter by Category / Section
      if (filterCategoryId) {
        const isDirect = p.categoryId === filterCategoryId || p.subcategoryId === filterCategoryId;
        if (!isDirect) {
          const childIds = categories.filter(c => c.parentId === filterCategoryId).map(c => c.id);
          const isChild = childIds.includes(p.categoryId) || (p.subcategoryId ? childIds.includes(p.subcategoryId) : false);
          if (!isChild) return false;
        }
      }

      // 3. Filter by Search Query (Name, Code, Model, etc.)
      if (searchQuery && searchQuery.trim()) {
        const match = filterProductsBySearch([p], searchQuery, categories, { includeRestricted: true });
        if (match.length === 0) return false;
      }

      // 4. Filter by Date
      if (searchDate) {
        const productDateStr = new Date(p.createdAt || 0).toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
        if (productDateStr !== searchDate) return false;
      }

      return true;
    });
  }, [products, filterCategoryId, searchQuery, searchDate, filterStatus, duplicatesSet, categories]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = useMemo(() => filteredProducts.slice(startIndex, startIndex + itemsPerPage), [filteredProducts, startIndex, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">إدارة المنتجات</h2>
          <p className="text-sm text-white/50">
            التحكم الكامل في كتالوج المنتجات والمخزون
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto items-center">
          <button onClick={() => setIsDownloadDialogOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-gold/20 border border-brq-gold/50 text-brq-gold rounded-xl hover:bg-brq-gold/30 transition-all text-sm font-bold">
            <Download size={18} /> تحميل متقدم
          </button>
          <button onClick={() => { setIsBatchAdding(!isBatchAdding); setIsAdding(false); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-navy border border-brq-gold/50 text-brq-gold rounded-xl hover:bg-brq-gold hover:text-black transition-all text-sm font-bold shadow-md">
            <Upload size={18} /> النشر السريع للمنتجات ⚡
          </button>
          <button onClick={() => setIsAutoShowcaseOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded-xl hover:bg-amber-500/30 transition-all text-sm font-bold shadow-md">
            <Sparkles size={18} /> النشر التلقائي للمعرض 🪄
          </button>
          <button
            onClick={() => { setIsAdding(!isAdding); setIsBatchAdding(false); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)]"
          >
            <Plus size={18} /> إضافة منتج
          </button>
        </div>
      </div>

      {isDownloadDialogOpen && (
        <CategoryDownloadDialog 
          categories={categories}
          products={products.filter(p => !p.isHidden && !p.isArchived && !p.isDeleted)}
          onClose={() => setIsDownloadDialogOpen(false)}
        />
      )}

      {isBatchAdding && (
        <BatchProductUpload 
            categories={categories}
            usdRate={usdRate}
            user={user}
            onAdded={loadData}
            onClose={() => setIsBatchAdding(false)}
        />
      )}

      {isAdding && (
        <div className="glass-panel p-6 rounded-2xl border border-brq-gold/30 relative">
          <button
            onClick={() => setIsAdding(false)}
            className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-black/40 rounded-full"
          >
            <X size={16} />
          </button>
          <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">
            إضافة منتج جديد
          </h3>
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="text-xs text-white/50 block mb-1">
                اسم المنتج *
              </label>
              <input
                required
                type="text"
                value={newProduct.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  const detectedSub = autoSelectSubcategory(
                    newName,
                    newProduct.categoryId,
                    newProduct.subcategoryId,
                    categories
                  );
                  setNewProduct({
                    ...newProduct,
                    name: newName,
                    subcategoryId: detectedSub !== undefined ? detectedSub : newProduct.subcategoryId
                  });
                }}
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                سعر الدرزن (بالدولار)
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.dozenPriceUsd || ""}
                onChange={(e) =>
                  handleUsdPriceChange(Number(e.target.value), false)
                }
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
              />
              <p className="text-[10px] text-white/40 mt-1">
                يتم ضربه بسعر الصرف الحالي: {usdRate}
              </p>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                سعر الدرزن (بالدينار) *
              </label>
              <input
                required
                type="number"
                value={newProduct.price || ""}
                onChange={(e) =>
                  handleIqdPriceChange(Number(e.target.value), false)
                }
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                التعبئة (رقم أو نص يظهر في الصورة)
              </label>
              <input
                type="text"
                value={newProduct.packaging || ""}
                placeholder="مثال: 12"
                onChange={(e) => handlePackagingChange(e.target.value, false)}
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 md:col-span-2">
              <label className="text-sm text-white/80 select-none flex-1">
                تشغيل التكسير التلقائي (تقسيم سعر القطعة على 12 دائماً)
              </label>
              <select
                value={(newProduct.forceStandardCrush ?? true) ? "yes" : "no"}
                onChange={(e) => handleForceStandardCrushChange(e.target.value === "yes", false)}
                className="bg-white border-2 border-brq-royal rounded-lg px-3 py-1.5 text-sm font-bold focus:border-brq-gold outline-none text-black w-24 shadow-sm"
              >
                <option value="no">لا</option>
                <option value="yes">نعم</option>
              </select>
            </div>
            {!(newProduct.forceStandardCrush ?? true) && (
              <div className="md:col-span-2">
                <label className="text-xs text-white/50 block mb-1">
                  عدد القطع للتقسيم (بما أن التكسير التلقائي مغلق)
                </label>
                <input
                  type="number"
                  value={newProduct.piecesCount || ""}
                  onChange={(e) => handlePiecesCountChange(parseInt(e.target.value) || 1, false)}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>
            )}
            {newProduct.piecePriceIqd ? (
              <div className="md:col-span-2 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 flex items-center justify-around text-center">
                <div>
                  <p className="text-xs text-white/50 mb-1">
                    سعر القطعة (التكسيرة بالدينار)
                  </p>
                  <p className="font-mono text-lg font-bold text-brq-gold">
                    {newProduct.piecePriceIqd.toLocaleString("en-US")}{" "}
                    <span className="text-sm">د.ع</span>
                  </p>
                </div>
                {newProduct.piecePriceUsd !== undefined && newProduct.piecePriceUsd > 0 && (
                  <div>
                    <p className="text-xs text-white/50 mb-1">
                      سعر القطعة (بالدولار)
                    </p>
                    <p className="font-mono text-lg font-bold text-blue-400">
                      ${newProduct.piecePriceUsd}{" "}
                      <span className="text-sm">USD</span>
                    </p>
                  </div>
                )}
              </div>
            ) : null}
            <div>
              <label className="text-xs text-white/50 block mb-1">القسم</label>
              <select
                value={newProduct.categoryId}
                onChange={(e) => {
                  const newCat = e.target.value;
                  const autoSub = autoSelectSubcategory(newProduct.name || "", newCat, "", categories);
                  setNewProduct({
                    ...newProduct,
                    categoryId: newCat,
                    subcategoryId: autoSub || "",
                  });
                }}
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
              >
                <option value="">-- إختر القسم --</option>
                {categories
                  .filter((c) => !c.parentId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                القسم الفرعي
              </label>
              <select
                value={newProduct.subcategoryId || ""}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    subcategoryId: e.target.value,
                  })
                }
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black disabled:opacity-50 placeholder:text-gray-500"
                disabled={!newProduct.categoryId}
              >
                <option value="">-- إختر القسم الفرعي --</option>
                {categories
                  .filter((c) => c.parentId === newProduct.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                كود المنتج
              </label>
              <input
                type="text"
                value={newProduct.productCode}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, productCode: e.target.value })
                }
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                صورة المنتج
              </label>
              <div className="flex items-center gap-3">
                {newProduct.imageUrl && (
                  <img
                    src={newProduct.imageUrl}
                    alt="preview"
                    className="w-10 h-10 rounded object-contain border border-white/20 bg-black/50"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, false)}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black/10 file:text-black hover:file:bg-black/20 transition-colors placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="md:col-span-2 bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <span className="text-sm font-bold text-white">نشر في معرض شركة الوفاء المتميز</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={newProduct.isShowcase || false}
                    onChange={(e) => setNewProduct({ ...newProduct, isShowcase: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                </label>
              </div>
              {newProduct.isShowcase && (
                <div>
                  <label className="text-xs text-white/50 block mb-1">
                    قسم المعرض العام
                  </label>
                  <select
                    value={newProduct.showcaseCategory || 'رجالي'}
                    onChange={(e) => setNewProduct({ ...newProduct, showcaseCategory: e.target.value })}
                    className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold text-black focus:border-amber-400 outline-none"
                  >
                    <option value="رجالي">👞 رجالي</option>
                    <option value="نسائي">👠 نسائي</option>
                    <option value="شبابي">👟 شبابي</option>
                    <option value="ولادي">👦 ولادي</option>
                    <option value="بناتي">👧 بناتي</option>
                    <option value="طفل">🧒 طفل</option>
                    <option value="طفلة">🎀 طفلة</option>
                    <option value="بيبي">🍼 بيبي</option>
                    <option value="مواليد">👶 مواليد</option>
                  </select>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  "أضف المنتج"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {products.length === 0 && !isAdding ? (
        <div className="flex-1 flex flex-col justify-center items-center h-[40vh] text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-brq-navy flex items-center justify-center text-brq-gold">
            <Package size={48} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              لا توجد منتجات
            </h2>
            <p className="text-white/50 max-w-md mx-auto">
              لم يتم العثور على أي منتجات في قاعدة البيانات.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 sm:gap-4 border-b border-white/10 pb-0 overflow-x-auto">
            <button
              onClick={() => setFilterStatus("all")}
              className={`pb-2 px-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${filterStatus === "all" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}`}
            >
              الكل
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full font-mono">
                {tabCounts.all}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus("active")}
              className={`pb-2 px-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${filterStatus === "active" ? "border-emerald-400 text-emerald-400" : "border-transparent text-white/50 hover:text-white"}`}
            >
              المنتجات الفعالة
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-mono font-bold">
                {tabCounts.active}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus("inactive")}
              className={`pb-2 px-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${filterStatus === "inactive" ? "border-yellow-400 text-yellow-400" : "border-transparent text-white/50 hover:text-white"}`}
            >
              المواد غير الفعالة
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-mono font-bold">
                {tabCounts.inactive}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus("archived")}
              className={`pb-2 px-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${filterStatus === "archived" ? "border-red-400 text-red-400" : "border-transparent text-white/50 hover:text-white"}`}
            >
              المواد النافذة
              <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full font-mono font-bold">
                {tabCounts.archived}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus("locked")}
              className={`pb-2 px-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${filterStatus === "locked" ? "border-purple-400 text-purple-400" : "border-transparent text-white/50 hover:text-white"}`}
            >
              <Lock size={14} className="text-purple-400" />
              المواد المقفلة
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full font-mono font-bold">
                {tabCounts.locked}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus("duplicates")}
              className={`pb-2 px-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${filterStatus === "duplicates" ? "border-cyan-400 text-cyan-400" : "border-transparent text-white/50 hover:text-white"}`}
            >
              المواد المكررة
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-mono font-bold">
                {tabCounts.duplicates}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus("showcase")}
              className={`pb-2 px-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${filterStatus === "showcase" ? "border-amber-400 text-amber-300" : "border-transparent text-white/50 hover:text-white"}`}
            >
              <Sparkles size={14} className="text-amber-400" />
              معرض الوفاء المتميز
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-mono font-bold">
                {tabCounts.showcase}
              </span>
            </button>
            <button
              onClick={() => setIsDownloadDialogOpen(true)}
              className="pb-2 px-2.5 text-sm font-bold border-b-2 border-transparent text-brq-gold hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <Download size={14} /> تحميل جميع الصور (Zip)
            </button>
            <button
              onClick={handleCleanShowcaseArchived}
              disabled={isSubmitting}
              className="pb-2 px-2.5 text-xs font-bold border-b-2 border-transparent text-amber-300 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap bg-amber-500/10 hover:bg-amber-500/20 rounded-t-lg px-3"
              title="تنظيف المعرض: إزالة أي مادة نافذة أو مخفية من المعرض بضغطة واحدة"
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>تنظيف المعرض من المواد النافذة</span>
            </button>
          </div>

          <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
            <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-white border border-black rounded-lg pr-10 pl-4 py-2.5 text-base font-bold text-black placeholder:text-gray-500 focus:outline-none focus:border-brq-gold/50"
                    placeholder="بحث بالاسم، الكود..."
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full bg-white border border-black rounded-lg px-4 py-2.5 text-base font-bold text-black placeholder:text-gray-500 focus:outline-none focus:border-brq-gold/50"
                    placeholder="بحث بالتاريخ..."
                  />
                </div>
                <div className="relative w-full sm:w-auto">
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="appearance-none pl-8 pr-10 py-2.5 bg-white border-2 border-brq-royal rounded-lg text-sm font-bold text-black hover:bg-gray-50 transition-colors focus:outline-none focus:border-brq-gold shadow-sm"
                  >
                    <option value="">جميع الأقسام الرئيسية</option>
                    {categories
                      .filter(c => !c.parentId)
                      .map(mainCat => (
                        <option key={mainCat.id} value={mainCat.id}>
                          {mainCat.name}
                        </option>
                      ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4 pointer-events-none" />
                </div>
              </div>

              {(selectedIds.size > 0 || filterStatus === 'inactive') && (
                <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto pb-1 flex-wrap">
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-1.5 bg-black/60 border border-brq-gold/40 px-2.5 py-1.5 rounded-xl shadow-sm">
                      <span className="text-xs font-black text-brq-gold whitespace-nowrap">
                        تم تحديد: {selectedIds.size}
                      </span>

                      {/* زر تحديد الصفحة الحالية */}
                      <button
                        type="button"
                        onClick={selectCurrentPage}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 border ${
                          paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.has(p.id!))
                            ? "bg-amber-400 text-black border-amber-400 shadow-sm"
                            : "bg-white/10 text-white/90 hover:bg-white/20 border-white/20"
                        }`}
                        title="تحديد جميع منتجات الصفحة الحالية فقط"
                      >
                        <CheckSquare size={13} />
                        <span>تحديد هذه الصفحة ({paginatedProducts.length})</span>
                      </button>

                      {/* زر تحديد كافة الصفحات */}
                      {filteredProducts.length > paginatedProducts.length && (
                        <button
                          type="button"
                          onClick={selectAllFiltered}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 border ${
                            selectedIds.size === filteredProducts.length
                              ? "bg-amber-400 text-black border-amber-400 shadow-sm"
                              : "bg-white/10 text-white/90 hover:bg-white/20 border-white/20"
                          }`}
                          title="تحديد كافة المنتجات في جميع الصفحات"
                        >
                          <Layers size={13} />
                          <span>تحديد الكل ({filteredProducts.length})</span>
                        </button>
                      )}

                      {/* إلغاء التحديد */}
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-xs px-2 py-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="إلغاء التحديد بالكامل"
                      >
                        ✕ إلغاء
                      </button>
                    </div>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/30 transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      حذف
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => handleBulkToggleHide(false)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm hover:bg-green-500/30 transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                      تفعيل
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => handleBulkToggleHide(true)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <EyeOff size={16} />}
                      إخفاء
                    </button>
                  )}
                  {selectedIds.size > 0 && filterStatus !== 'archived' && (
                    <button
                      onClick={() => handleBulkToggleArchive(true)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-sm hover:bg-orange-500/30 transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                      نقل للمواد النافذة
                    </button>
                  )}
                  {selectedIds.size > 0 && filterStatus === 'archived' && (
                    <div className="text-xs text-red-400 font-bold px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                      المواد النافذة لا يمكن استرجاعها نهائياً
                    </div>
                  )}
                  {selectedIds.size > 0 && filterStatus !== 'locked' && (
                    <button
                      onClick={() => handleBulkToggleLock(true)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                      نقل للمواد المقفلة
                    </button>
                  )}
                  {selectedIds.size > 0 && filterStatus === 'locked' && (
                    <button
                      onClick={() => handleBulkToggleLock(false)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
                      فك القفل / استرجاع من المقفلة
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => handleBulkToggleShowcase(true)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-sm hover:bg-amber-500/30 transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      نشر بالمعرض العام
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => handleBulkToggleShowcase(false)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-700/40 text-stone-300 border border-stone-600/30 rounded-lg text-sm hover:bg-stone-700/60 transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      إلغاء من المعرض
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => setIsMoveModalOpen(true)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      <FolderInput size={16} />
                      نقل الأقسام
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkShare}
                      disabled={downloadProgress !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      <Share2 size={16} />
                      مشاركة الصور
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkDownload}
                      disabled={downloadProgress !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      {downloadProgress ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      {downloadProgress
                        ? `جاري التحميل ${downloadProgress.progress}/${downloadProgress.total}`
                        : "تحميل الصور"}
                    </button>
                  )}
                  {filterStatus === 'inactive' && (
                    <button
                      onClick={handleDownloadInactiveImages}
                      disabled={downloadProgress !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      {downloadProgress ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      {downloadProgress
                        ? `جاري التحميل ${downloadProgress.progress}/${downloadProgress.total}`
                        : "تحميل الصور الغير فعالة"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              {filterStatus === null && !searchQuery ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center p-8 space-y-6">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/30 border border-white/10">
                    <Package size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">اختر القسم للبدء</h3>
                    <p className="text-white/50 max-w-sm">
                      قم باختيار المنتجات الفعالة، غير الفعالة، أو النافذة من القائمة العلوية لعرض المنتجات، أو ابدأ بالبحث مباشرة.
                    </p>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center p-8 space-y-6">
                  <Loader2 className="animate-spin text-brq-gold w-12 h-12 mb-4" />
                  <p className="text-white/50">جاري تحميل المنتجات...</p>
                </div>
              ) : (
              <table className="w-full text-sm text-right">
                <thead className="bg-black/40 text-white/60">
                  <tr>
                    <th className="p-4 font-medium rounded-tr-lg w-10">
                      <button
                        type="button"
                        onClick={selectCurrentPage}
                        className="text-white/40 hover:text-white transition-colors flex items-center gap-1"
                        title={
                          paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.has(p.id!))
                            ? "إلغاء تحديد هذه الصفحة"
                            : "تحديد جميع منتجات هذه الصفحة"
                        }
                      >
                        {paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.has(p.id!)) ? (
                          <CheckSquare size={18} className="text-brq-gold" />
                        ) : selectedIds.size > 0 ? (
                          <div className="w-4 h-4 rounded border-2 border-brq-gold flex items-center justify-center bg-brq-gold/20 text-brq-gold text-[10px] font-black leading-none">
                            -
                          </div>
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </th>
                    <th className="p-4 font-medium">صورة</th>
                    <th className="p-4 font-medium">اسم المنتج</th>
                    <th className="p-4 font-medium">الكود</th>
                    <th className="p-4 font-medium">الرمز</th>
                    <th className="p-4 font-medium">القسم</th>
                    <th className="p-4 font-medium">السعر</th>
                    <th className="p-4 font-medium">التعبئة</th>
                    <th className="p-4 font-medium">التاريخ</th>
                    <th className="p-4 font-medium">المشاهدات</th>
                    <th className="p-4 font-medium rounded-tl-lg">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/90">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-white/50">
                        لا توجد منتجات مطابقة في هذا القسم
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => (
                      <tr
                        key={`${p.id}-mgr`}
                        className={`hover:bg-white/5 transition-colors ${selectedIds.has(p.id!) ? "bg-brq-gold/5" : ""}`}
                      >
                        <td className="p-4">
                          <button
                            onClick={() => toggleSelection(p.id!)}
                            className="text-white/40 hover:text-white transition-colors"
                          >
                            {selectedIds.has(p.id!) ? (
                              <CheckSquare
                                size={18}
                                className="text-brq-gold"
                              />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div 
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-brq-navy flex items-center justify-center border border-white/10 overflow-hidden text-3xl cursor-pointer shadow-md hover:scale-105 transition-transform"
                            onClick={() => {
                              if (p.finalImageUrl || p.imageUrl) {
                                const prodIndex = paginatedProducts.findIndex(item => item.id === p.id);
                                setViewImage({ 
                                  src: p.finalImageUrl || p.imageUrl || '', 
                                  alt: p.name,
                                  product: p,
                                  index: prodIndex >= 0 ? prodIndex : undefined
                                });
                              }
                            }}
                          >
                            {p.finalImageUrl || p.imageUrl ? (
                              <img
                                src={p.finalImageUrl || p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-contain bg-black/20"
                              />
                            ) : (
                              "👟"
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold flex flex-col justify-center items-start gap-1">
                          <span>{p.name}</span>
                          {searchQuery && (
                            <div className="flex gap-1">
                              {p.isArchived ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                                  نافذ
                                </span>
                              ) : p.isHidden ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                  غير فعال
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">
                                  فعال
                                </span>
                              )}
                            </div>
                          )}
                          {!searchQuery && p.isHidden && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              غير فعال
                            </span>
                          )}
                          {p.isShowcase && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 font-bold">
                              <Sparkles size={10} />
                              معرض الوفاء ({p.showcaseCategory || 'عام'})
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-brq-gold">
                          {p.productCode || "-"}
                        </td>
                        <td className="p-4 font-mono text-white/80">
                          {p.modelNumber || "-"}
                          {filterStatus === 'duplicates' && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {modelMap.get(p.modelNumber || p.productCode)?.filter(id => id !== p.id).map(id => {
                                const dup = products.find(prod => prod.id === id);
                                return dup ? (
                                  <span key={id} className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap" title={`الكود: ${dup.productCode}`}>
                                    مكرر مع: {dup.productCode}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-xs bg-black/20">
                          <span className="px-2 py-1 rounded bg-brq-navy/50 border border-white/10">
                            {getCategoryName(p.categoryId)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-brq-gold">
                              {(p.price || 0).toLocaleString("en-US")} د.ع
                            </span>
                            {p.dozenPriceUsd !== undefined && (
                              <span className="font-mono text-xs text-brq-blue mt-0.5">
                                ${p.dozenPriceUsd}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-xs">
                          {p.packaging || "-"}
                        </td>
                        <td className="p-4 text-xs text-white/70">
                          {p.createdAt ? formatDate(p.createdAt) : "-"}
                          {p.updatedAt && p.updatedAt !== p.createdAt && (
                            <div className="text-[10px] text-white/40 mt-1">
                              تحديث: {formatDate(p.updatedAt)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1 text-white/60">
                            <Search size={12} /> {p.views || 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {(p.finalImageUrl || p.imageUrl) && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const imgUrl = p.finalImageUrl || p.imageUrl;
                                  if (!imgUrl) return;
                                  const ext = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
                                  const safeName = (p.productCode || p.name || 'product').replace(/[\/\?<>\\:\*\|":]/g, '-');
                                  const { downloadSingleImage } = await import('../../utils/download');
                                  await downloadSingleImage(imgUrl, `${safeName}.${ext}`);
                                }}
                                className="p-1.5 hover:bg-white/20 text-white/70 rounded transition-colors"
                                title="تحميل الصورة"
                              >
                                <Download size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleHide(p)}
                              className={`p-1.5 rounded transition-colors ${p.isHidden ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'hover:bg-purple-500/20 text-white/50 hover:text-purple-400'}`}
                              title={p.isHidden ? "إظهار المنتج للمستخدمين" : "إخفاء المنتج عن المستخدمين"}
                            >
                              {p.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            {p.oldPriceInfo && (
                              <button
                                type="button"
                                onClick={() => setHistoryProduct(p)}
                                className="p-1.5 hover:bg-brq-gold/20 text-brq-gold rounded transition-colors"
                                title="تم تغيير السعر - عرض التاريخ"
                              >
                                <History size={16} />
                              </button>
                            )}
                            {p.lastEditDiffs && p.lastEditDiffs.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setLastEditProduct(p)}
                                className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                title="تفاصيل التعديل"
                              >
                                <FileText size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleShowcase(p)}
                              className={`p-1.5 rounded transition-colors ${
                                p.isShowcase
                                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30"
                                  : "hover:bg-amber-500/20 text-white/50 hover:text-amber-300"
                              }`}
                              title={p.isShowcase ? `منشور في المعرض (${p.showcaseCategory || 'عام'}) - انقر للإلغاء` : "نشر في معرض الوفاء المتميز"}
                            >
                              <Sparkles size={16} className={p.isShowcase ? "text-amber-400 fill-amber-400/30" : ""} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLock(p)}
                              className={`p-1.5 rounded transition-colors ${
                                p.isLocked
                                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 hover:bg-purple-500/30"
                                  : "hover:bg-purple-500/20 text-white/50 hover:text-purple-300"
                              }`}
                              title={p.isLocked ? "إلغاء قفل المنتج" : "قفل المنتج"}
                            >
                              {p.isLocked ? <Lock size={16} className="text-purple-400 fill-purple-400/20" /> : <Unlock size={16} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleArchive(p)}
                              className={`p-1.5 rounded transition-colors ${p.isArchived ? 'opacity-50 cursor-not-allowed text-red-400' : 'hover:bg-yellow-500/20 text-yellow-400'}`}
                              title={
                                p.isArchived
                                  ? "المواد النافذة (لا يمكن استرجاعها نهائياً)"
                                  : "نقل مباشر إلى المواد النافذة"
                              }
                            >
                              <Package size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(p.id, p.name)}
                              className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
            </div>
            
            {/* Pagination Controls & Page Size Selector */}
            {filteredProducts.length > 0 && filterStatus !== null && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/10 bg-black/30">
                <div className="flex items-center gap-4 text-xs sm:text-sm text-white/60">
                  <span>
                    عرض <strong className="text-brq-gold">{startIndex + 1}</strong> إلى <strong className="text-brq-gold">{Math.min(startIndex + itemsPerPage, filteredProducts.length)}</strong> من أصل <strong className="text-white">{filteredProducts.length}</strong> منتج
                  </span>
                  
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                    <span className="text-white/40 text-xs">عرض:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-brq-gold font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value={20} className="bg-neutral-900 text-white">20 بطاقة (عرض سريع)</option>
                      <option value={50} className="bg-neutral-900 text-white">50 منتج</option>
                      <option value={100} className="bg-neutral-900 text-white">100 منتج (الافتراضي)</option>
                      <option value={200} className="bg-neutral-900 text-white">200 منتج</option>
                      <option value={500} className="bg-neutral-900 text-white">500 منتج</option>
                      <option value={1000} className="bg-neutral-900 text-white">1000 منتج (أقصى عرض)</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                      title="الصفحة السابقة"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <span className="text-xs sm:text-sm text-white font-medium px-2">
                      صفحة <span className="text-brq-gold font-bold">{currentPage}</span> من <span className="text-white font-bold">{totalPages}</span>
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                      title="الصفحة التالية"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-brq-gold/30 relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setEditingProduct(null);
                setInitialEditingProduct(null);
                setShowDiffConfirmModal(false);
              }}
              className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-black/40 rounded-full"
            >
              <X size={16} />
            </button>
            <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">
              تعديل المنتج
            </h3>
            
            <div className="flex gap-4 mb-4 text-xs text-white/50 bg-black/20 p-3 rounded-lg border border-white/5">
              <div className="flex-1">
                <span className="block opacity-60 mb-1">تاريخ نزول المنتج:</span>
                <span className="font-mono text-white/90">
                  {editingProduct.createdAt ? formatDateTime(editingProduct.createdAt) : 'غير متوفر'}
                </span>
              </div>
              <div className="flex-1 border-r border-white/10 pr-4">
                <span className="block opacity-60 mb-1">تاريخ اخر تحديث:</span>
                <span className="font-mono text-white/90">
                  {editingProduct.updatedAt ? formatDateTime(editingProduct.updatedAt) : (editingProduct.createdAt ? formatDateTime(editingProduct.createdAt) : 'غير متوفر')}
                </span>
              </div>
            </div>
            <form
              onSubmit={handleUpdate}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  اسم المنتج *
                </label>
                <input
                  required
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const detectedSub = autoSelectSubcategory(
                      newName,
                      editingProduct.categoryId,
                      editingProduct.subcategoryId,
                      categories
                    );
                    setEditingProduct({
                      ...editingProduct,
                      name: newName,
                      subcategoryId: detectedSub !== undefined ? detectedSub : editingProduct.subcategoryId
                    });
                  }}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  سعر الدرزن (بالدولار)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProduct.dozenPriceUsd || ""}
                  onChange={(e) =>
                    handleUsdPriceChange(Number(e.target.value), true)
                  }
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  يتم ضربه بسعر الصرف الحالي: {usdRate}
                </p>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  سعر الدرزن (بالدينار) *
                </label>
                <input
                  required
                  type="number"
                  value={editingProduct.price || ""}
                  onChange={(e) =>
                    handleIqdPriceChange(Number(e.target.value), true)
                  }
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  التعبئة (رقم أو نص يظهر في الصورة)
                </label>
                <input
                  type="text"
                  value={editingProduct.packaging || ""}
                  placeholder="مثال: 12"
                  onChange={(e) => handlePackagingChange(e.target.value, true)}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-2 mt-2 md:col-span-2">
                <label className="text-sm text-white/80 select-none flex-1">
                  تشغيل التكسير التلقائي (تقسيم سعر القطعة على 12 دائماً)
                </label>
                <select
                  value={(editingProduct.forceStandardCrush ?? true) ? "yes" : "no"}
                  onChange={(e) => handleForceStandardCrushChange(e.target.value === "yes", true)}
                  className="bg-white border-2 border-brq-royal rounded-lg px-3 py-1.5 text-sm font-bold focus:border-brq-gold outline-none text-black w-24 shadow-sm"
                >
                  <option value="no">لا</option>
                  <option value="yes">نعم</option>
                </select>
              </div>
              {!(editingProduct.forceStandardCrush ?? true) && (
                <div className="md:col-span-2">
                  <label className="text-xs text-white/50 block mb-1">
                    عدد القطع للتقسيم (بما أن التكسير التلقائي مغلق)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.piecesCount || ""}
                    onChange={(e) => handlePiecesCountChange(parseInt(e.target.value) || 1, true)}
                    className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                  />
                </div>
              )}
              {editingProduct.piecePriceIqd ? (
                <div className="md:col-span-2 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 flex items-center justify-around text-center">
                  <div>
                    <p className="text-xs text-white/50 mb-1">
                      سعر القطعة (التكسيرة بالدينار)
                    </p>
                    <p className="font-mono text-lg font-bold text-brq-gold">
                      {editingProduct.piecePriceIqd.toLocaleString("en-US")}{" "}
                      <span className="text-sm">د.ع</span>
                    </p>
                  </div>
                  {editingProduct.piecePriceUsd !== undefined && editingProduct.piecePriceUsd > 0 && (
                    <div>
                      <p className="text-xs text-white/50 mb-1">
                        سعر القطعة (بالدولار)
                      </p>
                      <p className="font-mono text-lg font-bold text-blue-400">
                        ${editingProduct.piecePriceUsd}{" "}
                        <span className="text-sm">USD</span>
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  القسم
                </label>
                <select
                  value={editingProduct.categoryId}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    const autoSub = autoSelectSubcategory(editingProduct.name || "", newCat, "", categories);
                    setEditingProduct({
                      ...editingProduct,
                      categoryId: newCat,
                      subcategoryId: autoSub || "",
                    });
                  }}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                >
                  <option value="">-- إختر القسم --</option>
                  {categories
                    .filter((c) => !c.parentId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  القسم الفرعي
                </label>
                <select
                  value={editingProduct.subcategoryId || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      subcategoryId: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black disabled:opacity-50 placeholder:text-gray-500"
                  disabled={!editingProduct.categoryId}
                >
                  <option value="">-- إختر القسم الفرعي --</option>
                  {categories
                    .filter((c) => c.parentId === editingProduct.categoryId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  كود المنتج
                </label>
                <input
                  type="text"
                  value={editingProduct.productCode}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      productCode: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  صورة المنتج
                </label>
                <div className="flex items-center gap-3">
                  {editingProduct.imageUrl && (
                    <img
                      src={editingProduct.imageUrl}
                      alt="preview"
                      className="w-10 h-10 rounded object-contain border border-white/20 bg-black/50"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold focus:border-brq-gold/50 outline-none text-black file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black/10 file:text-black hover:file:bg-black/20 transition-colors placeholder:text-gray-500"
                  />
                </div>
              </div>
              <div className="md:col-span-2 bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-400" />
                    <span className="text-sm font-bold text-white">نشر في معرض شركة الوفاء المتميز</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={editingProduct.isShowcase || false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, isShowcase: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                  </label>
                </div>
                {editingProduct.isShowcase && (
                  <div>
                    <label className="text-xs text-white/50 block mb-1">
                      قسم المعرض العام
                    </label>
                    <select
                      value={editingProduct.showcaseCategory || 'رجالي'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, showcaseCategory: e.target.value })}
                      className="w-full bg-white border border-black rounded-lg px-3 py-2 text-base font-bold text-black focus:border-amber-400 outline-none"
                    >
                      <option value="رجالي">👞 رجالي</option>
                      <option value="نسائي">👠 نسائي</option>
                      <option value="شبابي">👟 شبابي</option>
                      <option value="ولادي">👦 ولادي</option>
                      <option value="بناتي">👧 بناتي</option>
                      <option value="طفل">🧒 طفل</option>
                      <option value="طفلة">🎀 طفلة</option>
                      <option value="بيبي">🍼 بيبي</option>
                      <option value="مواليد">👶 مواليد</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <ProductEditLiveDiff
                  diffs={calculateProductDiff(initialEditingProduct, editingProduct, categories)}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer hover:bg-amber-400 transition-colors shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    "حفظ ومراجعة التعديلات"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation & Details Diff Modal */}
      <ProductEditDiffModal
        isOpen={showDiffConfirmModal}
        onClose={() => setShowDiffConfirmModal(false)}
        onConfirm={() => {
          proceedUpdate(editingProduct, calculateProductDiff(initialEditingProduct, editingProduct, categories));
        }}
        originalProduct={initialEditingProduct}
        editedProduct={editingProduct}
        categories={categories}
        isSubmitting={isSubmitting}
      />

      {/* Image Viewer */}
      {viewImage && (
        <ImageViewer 
          src={viewImage.src} 
          alt={viewImage.alt} 
          product={viewImage.product}
          currentIndex={viewImage.index}
          totalCount={paginatedProducts.length}
          onClose={() => setViewImage(null)} 
          onNext={typeof viewImage.index === 'number' && viewImage.index < paginatedProducts.length - 1 ? () => {
            const nextIdx = (viewImage.index || 0) + 1;
            const nextProd = paginatedProducts[nextIdx];
            if (nextProd) {
              setViewImage({
                src: nextProd.finalImageUrl || nextProd.imageUrl || '',
                alt: nextProd.name,
                product: nextProd,
                index: nextIdx
              });
            }
          } : undefined}
          onPrev={typeof viewImage.index === 'number' && viewImage.index > 0 ? () => {
            const prevIdx = (viewImage.index || 0) - 1;
            const prevProd = paginatedProducts[prevIdx];
            if (prevProd) {
              setViewImage({
                src: prevProd.finalImageUrl || prevProd.imageUrl || '',
                alt: prevProd.name,
                product: prevProd,
                index: prevIdx
              });
            }
          } : undefined}
          hasNext={typeof viewImage.index === 'number' && viewImage.index < paginatedProducts.length - 1}
          hasPrev={typeof viewImage.index === 'number' && viewImage.index > 0}
        />
      )}

      {lastEditProduct && lastEditProduct.lastEditDiffs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLastEditProduct(null)} />
          <div className="relative w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black flex items-center gap-2 text-emerald-400">
                <FileText size={24} />
                تفاصيل آخر تعديل للمنتج ({lastEditProduct.name || lastEditProduct.productCode})
              </h3>
              <button
                onClick={() => setLastEditProduct(null)}
                className="p-2 text-white/50 hover:text-white rounded-full transition-colors bg-white/5"
              >
                <X size={20} />
              </button>
            </div>
            {lastEditProduct.lastEditDate && (
              <p className="text-sm text-white/60 mb-4 bg-white/5 p-3 rounded-lg flex items-center gap-2">
                <History size={16} />
                <strong>تاريخ التعديل: </strong>
                {new Date(lastEditProduct.lastEditDate).toLocaleString('ar-IQ')}
              </p>
            )}
            <div className="overflow-y-auto flex-1 pr-2 space-y-4 custom-scrollbar">
              {lastEditProduct.lastEditDiffs.map((diff: any, idx: number) => (
                <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md text-sm">
                      {diff.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="text-xs text-red-400 font-bold mb-1">البيانات السابقة</div>
                      <div className="text-white/80 line-through text-sm font-bold truncate" title={diff.oldDisplay}>
                        {diff.oldDisplay || 'فارغ'}
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                      <div className="text-xs text-emerald-400 font-bold mb-1">البيانات الجديدة</div>
                      <div className="text-white font-bold text-sm truncate" title={diff.newDisplay}>
                        {diff.newDisplay || 'فارغ'}
                      </div>
                    </div>
                  </div>
                  {diff.difference && (
                    <div className={`mt-3 text-sm font-bold px-3 py-1.5 rounded-lg inline-block ${diff.isPositiveChange ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                      مقدار التغيير: {diff.difference}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-4 mt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setLastEditProduct(null)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {historyProduct && (
        <PriceHistoryViewer product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}

      
      {/* Duplicate AT Number Modal */}
      <AnimatePresence>
        {duplicateConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDuplicateConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white border border-brq-navy rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden"
            >
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 font-mono">
                الموديل ({duplicateConfirm.atNumber}) موجود
              </h3>
              <p className="text-gray-600 mb-6 text-sm">
                هذا الات نمبر موجود مسبقاً باسم:
                <br />
                <span className="font-bold text-gray-900">{duplicateConfirm.existingName}</span>
                <br /><br />
                هل تريد الاستمرار بنشر هذا الموديل على أي حال؟
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDuplicateConfirm(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  إلغاء النشر
                </button>
                <button
                  onClick={() => {
                    if (duplicateConfirm.type === 'create') {
                      proceedCreate(duplicateConfirm.payload);
                    } else {
                      proceedUpdate(duplicateConfirm.payload);
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors"
                >
                  نعم، أكمل النشر
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setDeleteConfirm(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white border-2 border-brq-royal rounded-2xl p-8 shadow-[0_0_40px_rgba(30,94,255,0.2)] flex flex-col items-center text-center overflow-hidden"
            dir="rtl"
          >
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-brq-gold to-brq-royal"></div>
            <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-brq-gold flex items-center justify-center mb-6 shadow-inner">
              <Trash2 size={40} className="text-brq-royal" />
            </div>
            <h3 className="text-3xl font-black text-black mb-4 tracking-tight">
              تنبيه هام!
            </h3>
            <p className="text-black text-xl font-bold mb-8 leading-relaxed">
              {deleteConfirm.isBulk 
                ? `هل أنت متأكد من حذف (${deleteConfirm.count}) منتجات بشكل نهائي ولا يمكن التراجع؟` 
                : `هل أنت متأكد من حذف المنتج "${deleteConfirm.name}" بشكل نهائي ولا يمكن التراجع؟`}
            </p>
            
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-4 px-4 rounded-xl font-black text-lg text-white bg-black hover:bg-gray-800 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-4 px-4 rounded-xl font-black text-lg text-white bg-brq-royal hover:opacity-90 border border-brq-gold transition-colors shadow-[0_4px_14px_0_rgba(30,94,255,0.39)]"
              >
                نعم، احذف الموديل
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {publishSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => {
              setPublishSuccess(false);
              setNewProduct({
                name: "",
                price: 0,
                dozenPriceUsd: 0,
                modelNumber: "",
                productCode: "",
                barcode: "",
                categoryId: "",
                subcategoryId: "",
                imageUrl: "",
                forceStandardCrush: true,
                isHidden: true,
              });
            }}
          />
          <div
            className="relative w-full max-w-sm bg-brq-card border border-brq-gold/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(212,175,55,0.15)] flex flex-col items-center text-center overflow-hidden"
            dir="rtl"
          >
            <div className="w-20 h-20 rounded-full bg-brq-gold/10 flex items-center justify-center mb-6 border border-brq-gold/20">
              <CheckCircle size={40} className="text-brq-gold" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              تم النشر بنجاح!
            </h3>
            <p className="text-white/70 mb-8">
              تم النشر بنجاح داخل التطبيق
            </p>
            <button
              onClick={() => {
                setPublishSuccess(false);
                setNewProduct({
                  name: "",
                  price: 0,
                  dozenPriceUsd: 0,
                  modelNumber: "",
                  productCode: "",
                  barcode: "",
                  categoryId: "",
                  subcategoryId: "",
                  imageUrl: "",
                  forceStandardCrush: true,
                  isHidden: true,
                });
              }}
              className="w-full py-3 px-4 rounded-xl font-bold text-black bg-brq-gold hover:bg-yellow-500 transition-colors"
            >
              فهمت
            </button>
          </div>
        </div>
      )}

      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[200] backdrop-blur-sm">
          <div className="bg-brq-card border border-brq-border rounded-xl p-6 max-w-sm w-full relative overflow-hidden" dir="rtl">
            <h3 className="text-xl font-bold text-white mb-4">نقل {selectedIds.size} منتجات</h3>
            
            <div className="space-y-4 mb-6">
              {/* Smart Auto Move Button */}
              <div className="p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-xl">
                <button
                  type="button"
                  onClick={handleSmartAutoMove}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Sparkles size={14} />
                  نقل ذكي تلقائي (رجالي للرجالي، نسائي للنسائي...) 🪄
                </button>
                <p className="text-[10px] text-white/60 text-center mt-1.5">
                  أو اختر يدوياً أدناه (بدون الحاجة لقسم فرعي):
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  القسم الرئيسي <span className="text-red-500">*</span>
                </label>
                <select
                  value={moveToCategoryId}
                  onChange={(e) => {
                    setMoveToCategoryId(e.target.value);
                    setMoveToSubcategoryId("");
                  }}
                  className="w-full bg-white border-2 border-brq-royal rounded-lg px-3 py-2 text-black font-bold focus:border-brq-gold focus:outline-none shadow-sm"
                  required
                >
                  <option value="">اختر القسم الرئيسي...</option>
                  {categories
                    .filter((c) => !c.parentId)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.isHidden ? " (مخفي)" : ""}
                      </option>
                    ))}
                </select>
              </div>
              
              {moveToCategoryId && categories.some(c => c.parentId === moveToCategoryId) && (
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    القسم الفرعي
                  </label>
                  <select
                    value={moveToSubcategoryId}
                    onChange={(e) => setMoveToSubcategoryId(e.target.value)}
                    className="w-full bg-white border-2 border-brq-royal rounded-lg px-3 py-2 text-black font-bold focus:border-brq-gold focus:outline-none shadow-sm"
                  >
                    <option value="">بدون قسم فرعي (اختياري)</option>
                    {categories
                      .filter((c) => c.parentId === moveToCategoryId)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} {cat.isHidden ? " (مخفي)" : ""}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-all text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkMoveCategory}
                disabled={!moveToCategoryId || isSubmitting}
                className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/50 rounded-lg transition-all font-bold text-sm disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "نقل"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Shoe Decor Studio Modal */}
      {aiStudioProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[250] backdrop-blur-md overflow-y-auto">
          <div className="bg-brq-black w-full max-w-2xl rounded-2xl border border-brq-gold/40 shadow-2xl p-6 relative text-right my-8" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-brq-gold/20 pb-4 mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-brq-gold animate-pulse" />
                توليد خلفية وديكور بالذكاء الاصطناعي (AI Studio)
              </h3>
              <button 
                onClick={() => { setAiStudioProduct(null); setAiResultUrl(null); }}
                className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-white/70 leading-relaxed">
                يقوم الذكاء الاصطناعي بتوليد صورة عرض جديدة للمنتج بوضع الحذاء في استوديو وديكور جديد مع الحفاظ التام على شكل وألوان وتفاصيل الحذاء الأصلي!
              </p>

              {/* Product Info */}
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-brq-gold/20">
                <img 
                  src={aiStudioProduct.finalImageUrl || aiStudioProduct.imageUrl} 
                  alt={aiStudioProduct.name}
                  className="w-16 h-16 object-contain rounded-lg bg-black/60 border border-white/10"
                />
                <div>
                  <h4 className="font-bold text-white text-sm">{aiStudioProduct.name}</h4>
                  <p className="text-xs text-white/50 font-mono">كود المنتج: {aiStudioProduct.productCode || '---'}</p>
                </div>
              </div>

              {/* Change Background Only Toggle */}
              <div className="p-3 bg-purple-950/60 border border-purple-500/40 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brq-gold" />
                  <span className="text-xs font-bold text-white">تغيير الخلفية فقط (الحفاظ على المنتج وألوانه وتفاصيله بدقة 100%)</span>
                </div>
                <input 
                  type="checkbox"
                  checked={aiChangeBackgroundOnly}
                  onChange={(e) => setAiChangeBackgroundOnly(e.target.checked)}
                  className="w-4 h-4 accent-brq-gold cursor-pointer"
                />
              </div>

              {/* Text Prompt (Primary Override) */}
              <div>
                <label className="block text-xs font-bold text-brq-gold mb-1">توليد بواسطة النص (أولوية قصوى):</label>
                <textarea
                  value={aiCustomPrompt}
                  onChange={(e) => setAiCustomPrompt(e.target.value)}
                  className="w-full bg-black/60 border border-brq-gold/30 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-brq-gold"
                  placeholder="اكتب هنا الوصف الدقيق للصورة (مثلاً: صورة لامرأة ترتدي الحذاء في شارع ممطر)... سيتم تجاهل الخيارات أدناه إذا كتبت نصاً هنا."
                  rows={3}
                />
              </div>

              {aiCustomPrompt.trim().length === 0 && (
                <>
                  {/* 1. Character Selection */}
                  <div>
                    <label className="block text-xs font-bold text-brq-gold mb-2">شخصية العارض (Character):</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {Object.entries(characterPresets).map(([key, item]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setAiCharacter(key)}
                          className={`p-2 rounded-xl text-right transition-all border leading-relaxed ${aiCharacter === key ? 'bg-brq-gold/20 text-brq-gold border-brq-gold font-bold shadow-md ring-1 ring-brq-gold' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Shoe Count Selection */}
                  <div>
                    <label className="block text-xs font-bold text-brq-gold mb-2">عدد الأحذية في الصورة:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {Object.entries(shoeCountPresets).map(([key, item]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setAiShoeCount(key)}
                          className={`p-2 rounded-xl text-right transition-all border font-medium ${aiShoeCount === key ? 'bg-brq-gold/20 text-brq-gold border-brq-gold font-bold shadow-md ring-1 ring-brq-gold' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Shoe Color */}
                  <div>
                    <label className="block text-xs font-bold text-brq-gold mb-2">ألوان الأحذية (لتوجيه الذكاء الاصطناعي):</label>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {shoeColorOptions.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setAiShoeColor(item.value)}
                          className={`px-3 py-1.5 rounded-full transition-all border ${aiShoeColor === item.value ? 'bg-brq-gold text-black font-bold border-brq-gold shadow-md' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Error Message */}
              {aiError && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300">
                  {aiError}
                </div>
              )}

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateAiDecor}
                disabled={aiGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm cursor-pointer"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5 text-white" />
                    جاري تصميم الديكور وتوليد الصورة بالذكاء الاصطناعي...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    توليد صورة احترافية بالذكاء الاصطناعي 🪄
                  </>
                )}
              </button>

              {/* Result Preview */}
              {aiResultUrl && (
                <div className="mt-4 p-4 bg-purple-950/40 border border-purple-500/40 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-purple-300">النتيجة المقترحة بالذكاء الاصطناعي:</h4>
                  <div className="flex justify-center">
                    <img 
                      src={aiResultUrl} 
                      alt="النتيجة" 
                      className="w-48 h-48 object-contain rounded-xl border-2 border-purple-400 bg-black/80 shadow-2xl" 
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveAiImage}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      حفظ واعتماد كصورة للمنتج
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAiDecor}
                      disabled={aiGenerating}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      توليد خيار آخر 🔄
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAutoShowcaseOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-[250] backdrop-blur-md overflow-y-auto">
          <div className="bg-brq-card border border-brq-gold/50 rounded-2xl p-4 sm:p-6 max-w-2xl w-full relative space-y-4 shadow-2xl my-auto text-right" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brq-gold/20 rounded-xl border border-brq-gold/40 text-brq-gold">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    النشر السريع والتلقائي في المعرض ⚡
                  </h3>
                  <p className="text-xs text-brq-gold/80 font-medium">حدد الأقسام والكمية لنشر مئات أو آلاف المنتجات بلمح البصر</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAutoShowcaseOpen(false)} 
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Target Category Type Selector Tabs */}
            <div className="space-y-3">
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
                <button
                  type="button"
                  onClick={() => setAutoShowcaseTab('collections')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    autoShowcaseTab === 'collections'
                      ? 'bg-brq-gold text-black shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Sparkles size={16} />
                  تشكيلات وتصنيفات المعرض ({VALID_SHOWCASE_CATEGORIES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAutoShowcaseTab('categories')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    autoShowcaseTab === 'categories'
                      ? 'bg-brq-gold text-black shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Layers size={16} />
                  أقسام الموقع الرئيسية ({categories.filter(c => !c.parentId).length})
                </button>
              </div>

              {/* Collections View */}
              {autoShowcaseTab === 'collections' && (
                <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/90">اختر تشكيلات المعرض المطلوب النشر إليها:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedShowcaseCollections([...VALID_SHOWCASE_CATEGORIES])}
                        className="text-xs text-brq-gold hover:underline font-bold cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-white/30">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedShowcaseCollections([])}
                        className="text-xs text-red-400 hover:underline font-bold cursor-pointer"
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {SHOWCASE_CATEGORIES_METADATA.map(item => {
                      const isSelected = selectedShowcaseCollections.includes(item.name);
                      const countAvailable = products.filter(p => 
                        !p.isHidden && !p.isArchived && !p.isShowcase &&
                        (p.showcaseCategory || detectShowcaseCategory(p, categories)) === item.name
                      ).length;

                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => {
                            setSelectedShowcaseCollections(prev => 
                              isSelected ? prev.filter(c => c !== item.name) : [...prev, item.name]
                            );
                          }}
                          className={`p-2 rounded-xl text-center transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-brq-gold/20 border-brq-gold text-white font-bold ring-1 ring-brq-gold shadow-md'
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-base">{item.icon}</span>
                            <span className="text-xs font-bold">{item.name}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isSelected ? 'bg-brq-gold text-black font-bold' : 'bg-white/10 text-white/50'}`}>
                            {countAvailable} متاح
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Categories View */}
              {autoShowcaseTab === 'categories' && (
                <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/90">اختر أقسام الموقع المطلوب استيراد منتجاتها ونشرها:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMainCategoryIds(categories.filter(c => !c.parentId).map(c => c.id))}
                        className="text-xs text-brq-gold hover:underline font-bold cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-white/30">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMainCategoryIds([])}
                        className="text-xs text-red-400 hover:underline font-bold cursor-pointer"
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {categories.filter(c => !c.parentId).map(cat => {
                      const isSelected = selectedMainCategoryIds.includes(cat.id);
                      const countAvailable = products.filter(p => 
                        !p.isHidden && !p.isArchived && !p.isShowcase &&
                        p.categoryId === cat.id
                      ).length;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedMainCategoryIds(prev => 
                              isSelected ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                            );
                          }}
                          className={`p-2.5 rounded-xl text-right transition-all border flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-brq-gold/20 border-brq-gold text-white font-bold ring-1 ring-brq-gold shadow-md'
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-xs font-bold truncate">{cat.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ${isSelected ? 'bg-brq-gold text-black font-bold' : 'bg-white/10 text-white/50'}`}>
                            {countAvailable}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Publishing Mode & Distribution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setAutoShowcaseDistribution('total'); setAutoShowcaseAllAvailable(false); }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    autoShowcaseDistribution === 'total' && !autoShowcaseAllAvailable
                      ? 'bg-brq-gold/20 border-brq-gold text-white font-bold'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-brq-gold mb-0.5">📦 نشر إجمالي محدد</div>
                  <div className="text-[11px] text-white/60">نشر عدد إجمالي من المنتجات من مجموع الأقسام المختارة</div>
                </button>

                <button
                  type="button"
                  onClick={() => { setAutoShowcaseDistribution('perCategory'); setAutoShowcaseAllAvailable(false); }}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    autoShowcaseDistribution === 'perCategory' && !autoShowcaseAllAvailable
                      ? 'bg-brq-gold/20 border-brq-gold text-white font-bold'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-brq-gold mb-0.5">⚖️ توزيع متساوي لكل قسم</div>
                  <div className="text-[11px] text-white/60">نشر العدد المحدد من كل قسم تم اختياره بالتساوي</div>
                </button>
              </div>

              {/* Quantity Controls & Direct Typing Input */}
              <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    <span>عدد المنتجات المطلوب نشرها:</span>
                    <span className="text-xs font-normal text-white/50">(اكتب أي رقم تريده)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (autoShowcaseAllAvailable) {
                        setAutoShowcaseAllAvailable(false);
                        setAutoShowcaseCount(100);
                      } else {
                        setAutoShowcaseAllAvailable(true);
                      }
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      autoShowcaseAllAvailable
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'bg-white/10 text-emerald-300 hover:bg-white/20'
                    }`}
                  >
                    {autoShowcaseAllAvailable ? '✓ تم تفعيل نشر كل المتاح' : '⚡ نشر كل المتاح بدون حد'}
                  </button>
                </div>

                {!autoShowcaseAllAvailable ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="50000"
                        value={autoShowcaseCount}
                        onChange={(e) => {
                          setAutoShowcaseCount(e.target.value);
                          setAutoShowcaseAllAvailable(false);
                        }}
                        placeholder="اكتب العدد هنا (مثلاً: 50، 120، 500، 1000...)"
                        className="w-full bg-white border-2 border-brq-gold focus:border-yellow-400 rounded-xl px-4 py-3 text-lg font-black text-black shadow-lg font-mono placeholder:text-gray-400 placeholder:text-sm placeholder:font-normal outline-none text-center"
                      />
                      {autoShowcaseCount && (
                        <button
                          type="button"
                          onClick={() => setAutoShowcaseCount('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-xs font-bold bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                          title="مسح الحقل"
                        >
                          مسح
                        </button>
                      )}
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-white/50 font-medium">أرقام سريعة:</span>
                      {[25, 50, 100, 200, 500, 1000, 2000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setAutoShowcaseCount(val);
                            setAutoShowcaseAllAvailable(false);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all font-mono cursor-pointer ${
                            String(autoShowcaseCount) === String(val) && !autoShowcaseAllAvailable
                              ? 'bg-brq-gold text-black shadow-md font-black'
                              : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-300 text-xs font-bold">
                    ⚡ سيتم نشر جميع المواد المتاحة غير المنشورة في الأقسام المحددة بالكامل
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAutoShowcaseOpen(false)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleAutoPublishShowcase()}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-brq-gold to-yellow-400 hover:from-yellow-400 hover:to-brq-gold text-black font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-black" />
                    جاري النشر السريع الفائق...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    ⚡ بدء النشر السريع للمعرض الآن
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[300] backdrop-blur-sm">
          <div className="bg-white border-2 border-brq-royal rounded-xl p-6 max-w-sm w-full relative overflow-hidden shadow-[0_0_40px_rgba(30,94,255,0.2)]" dir="rtl">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-brq-gold to-brq-royal"></div>
            <h3 className="text-xl font-bold text-black mb-3 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-brq-royal" />
              تنبيه
            </h3>
            <p className="text-black mb-6 leading-relaxed whitespace-pre-wrap font-medium">
              {alertMessage}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAlertMessage(null)}
                className="px-6 py-2 bg-brq-royal text-white border border-brq-gold rounded-lg transition-all font-bold text-sm shadow-[0_4px_14px_0_rgba(30,94,255,0.39)] hover:opacity-90"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}

      {isShowcaseDownloadOpen && (
        <ShowcaseCategorizedDownloadDialog
          products={products}
          categories={categories}
          onClose={() => setIsShowcaseDownloadOpen(false)}
        />
      )}
    </div>
  );
}
