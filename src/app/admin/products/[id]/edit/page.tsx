// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, ArrowRight, Package, Image as ImageIcon, FileDown, Flame, Sparkles, Loader2, Check, X, HelpCircle, AlertCircle, AlertTriangle, Eye, Code, Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Quote, Table, CornerDownLeft, Trash2, Type, Globe, Store, Plus } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import JalaliDatePicker from '@/components/JalaliDatePicker';
import BrandPicker from '@/components/admin/BrandPicker';
import CategoryPicker from '@/components/admin/CategoryPicker';
import MultiCategoryPicker from '@/components/admin/MultiCategoryPicker';
import VariantManager from '@/components/admin/VariantManager';

function normalizeKeyValuePairs(data: any): Record<string, string> {
  if (!data) return {};
  
  let parsed: any;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      return {};
    }
  } else {
    parsed = data;
  }

  if (!parsed) return {};

  if (Array.isArray(parsed)) {
    const result: Record<string, string> = {};
    for (const item of parsed) {
      if (item && typeof item === 'object') {
        const k = item.key || item.name || item.label;
        const v = item.value;
        if (k && v !== undefined && v !== null) {
          result[String(k).trim()] = String(v).trim();
        }
      }
    }
    return result;
  }

  if (typeof parsed === 'object') {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== undefined && v !== null && typeof v !== 'object') {
        result[k.trim()] = String(v).trim();
      } else if (v && typeof v === 'object') {
        const item = v as any;
        const subKey = item.key || item.name || k;
        const subVal = item.value !== undefined ? item.value : JSON.stringify(item);
        result[String(subKey).trim()] = String(subVal).trim();
      }
    }
    return result;
  }

  return {};
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopProductType, setShopProductType] = useState('both');
  const [showMediaPickerFor, setShowMediaPickerFor] = useState<'image' | 'file' | 'gallery' | 'fullDescription' | 'variant' | 'preview' | null>(null);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    description: '',
    fullDescription: '',
    seoTitle: '',
    seoDescription: '',
    schemaMarkup: '',
    price: '',
    discount: '',
    discountPercent: '',
    discountMinQty: '',
    stock: '',
    isActive: true,
    type: 'physical',
    imageUrl: '',
    fileUrl: '',
    categoryId: '',
    secondaryCategoryIds: [] as string[],
    downloadLimit: '',
    downloadExpiryDays: '',
    downloadIpRestriction: false,
    fileFormat: '',
    fileSize: '',
    previewUrl: '',
    techSpecs: '',
    downloadFiles: '',
    isSpecial: false,
    specialEndsAt: '',
    wholesalePrice: '',
    wholesaleTiers: '[]',
    wholesaleExclusivePrices: '[]',
    moq: '1',
    wholesaleUnit: 'عدد',
    wholesaleUnitSize: '1',
    weight: '0',
    volume: '0',
    isWholesaleOnly: false,
  });

  const [showSecondaryCategories, setShowSecondaryCategories] = useState(false);

  const [featuresList, setFeaturesList] = useState<{key: string, value: string}[]>([{key: '', value: ''}]);
  const [specsList, setSpecsList] = useState<{key: string, value: string}[]>([{key: '', value: ''}]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [variants, setVariants] = useState<{id?: string, name: string, colorCode: string | null, imageUrl: string | null, price: string, stock: string, isDefault: boolean}[]>([]);
  const [variantImageIndex, setVariantImageIndex] = useState<number | null>(null);
  const [downloadFileList, setDownloadFileList] = useState<{name: string, url: string, size: string, format: string}[]>([]);
  const [isAddingMultiFile, setIsAddingMultiFile] = useState(false);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [shopName, setShopName] = useState('فروشگاه من');
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
  const [tiers, setTiers] = useState<{minQty: number, maxQty: number | null, discountPercent: number}[]>([]);
  const [exclusivePrices, setExclusivePrices] = useState<{target: string, price: number}[]>([]);

  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [aiSeoSuccess, setAiSeoSuccess] = useState(false);
  const [aiSeoError, setAiSeoError] = useState('');
  const [showSeoHelp, setShowSeoHelp] = useState(false);
  const [aiSchemaReport, setAiSchemaReport] = useState('');

  const [generatingArticle, setGeneratingArticle] = useState(false);
  const [aiArticleResult, setAiArticleResult] = useState<string | null>(null);
  const [aiArticleError, setAiArticleError] = useState('');
  const [descMode, setDescMode] = useState<'preview' | 'code'>('preview');

  // AI Prompt Control States
  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewEditorRef = useRef<HTMLDivElement>(null);

  // Sync content to innerHTML when descMode is 'preview' or loading finishes
  useEffect(() => {
    if (previewEditorRef.current && descMode === 'preview') {
      if (previewEditorRef.current.innerHTML !== formData.fullDescription) {
        previewEditorRef.current.innerHTML = formData.fullDescription || '';
      }
    }
  }, [descMode, formData.fullDescription, loading]);

  const handlePreviewInput = () => {
    if (previewEditorRef.current) {
      const html = previewEditorRef.current.innerHTML;
      setFormData(prev => ({ ...prev, fullDescription: html }));
    }
  };

  const insertHtml = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.fullDescription || '';
    const selectedText = text.substring(start, end);
    const replacement = before + (selectedText || after ? selectedText : '');

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setFormData(prev => ({ ...prev, fullDescription: newValue }));

    // Set cursor position after update
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + (selectedText ? selectedText.length : 0) + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleFormat = (command: string, value: string = '') => {
    if (descMode === 'preview') {
      if (previewEditorRef.current) {
        previewEditorRef.current.focus();
        
        if (command === 'heading2') {
          document.execCommand('formatBlock', false, 'H2');
          const selection = window.getSelection();
          if (selection && selection.anchorNode) {
            let parent = selection.anchorNode.parentElement;
            if (parent && parent.tagName === 'H2') {
              parent.className = 'text-base sm:text-lg font-black text-slate-800 dark:text-white mt-6 mb-3';
            }
          }
        } else if (command === 'heading3') {
          document.execCommand('formatBlock', false, 'H3');
          const selection = window.getSelection();
          if (selection && selection.anchorNode) {
            let parent = selection.anchorNode.parentElement;
            if (parent && parent.tagName === 'H3') {
              parent.className = 'text-sm sm:text-base font-black text-slate-800 dark:text-white mt-4 mb-2';
            }
          }
        } else if (command === 'createLink') {
          const url = prompt('لینک آدرس اینترنتی را وارد کنید:');
          if (url) {
            document.execCommand('createLink', false, url);
            const selection = window.getSelection();
            if (selection && selection.anchorNode) {
              let parent = selection.anchorNode.parentElement;
              if (parent && parent.tagName === 'A') {
                parent.className = 'text-blue-500 hover:underline font-bold';
                parent.setAttribute('target', '_blank');
              }
            }
          }
        } else if (command === 'blockquote') {
          document.execCommand('formatBlock', false, 'BLOCKQUOTE');
          const selection = window.getSelection();
          if (selection && selection.anchorNode) {
            let parent = selection.anchorNode.parentElement;
            if (parent && parent.tagName === 'BLOCKQUOTE') {
              parent.className = 'border-r-4 border-l-0 border-blue-500 bg-blue-50/30 dark:bg-blue-950/10 px-4 py-2 my-4 rounded-l-xl italic text-slate-600 dark:text-slate-400';
            }
          }
        } else if (command === 'table') {
          const tableHtml = `<table class="w-full border-collapse border border-gray-200 dark:border-gray-700 my-4 text-xs text-right">
  <thead>
    <tr class="bg-gray-50 dark:bg-gray-800">
      <th class="border border-gray-200 dark:border-gray-700 p-2">ستون ۱</th>
      <th class="border border-gray-200 dark:border-gray-700 p-2">ستون ۲</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-gray-200 dark:border-gray-700 p-2">مقدار ۱</td>
      <td class="border border-gray-200 dark:border-gray-700 p-2">مقدار ۲</td>
    </tr>
  </tbody>
</table><p><br></p>`;
          document.execCommand('insertHTML', false, tableHtml);
        } else if (command === 'bold') {
          document.execCommand('bold', false);
        } else if (command === 'italic') {
          document.execCommand('italic', false);
        } else {
          document.execCommand(command, false, value);
        }
        
        handlePreviewInput();
      }
    } else {
      if (command === 'bold') insertHtml('<strong>', '</strong>');
      else if (command === 'italic') insertHtml('<em>', '</em>');
      else if (command === 'heading2') insertHtml('<h2 class="text-base sm:text-lg font-black text-slate-800 dark:text-white mt-6 mb-3">', '</h2>');
      else if (command === 'heading3') insertHtml('<h3 class="text-sm sm:text-base font-black text-slate-800 dark:text-white mt-4 mb-2">', '</h3>');
      else if (command === 'createLink') {
        const url = prompt('لینک آدرس اینترنتی را وارد کنید:');
        if (url) insertHtml(`<a href="${url}" target="_blank" class="text-blue-500 hover:underline font-bold">`, '</a>');
      }
      else if (command === 'blockquote') insertHtml('<blockquote class="border-r-4 border-l-0 border-blue-500 bg-blue-50/30 px-4 py-2 my-4 rounded-l-xl italic text-slate-600 dark:text-slate-400">', '</blockquote>');
      else if (command === 'table') insertHtml('<table class="w-full border-collapse border border-gray-200 dark:border-gray-700 my-4 text-xs text-right">\n  <thead>\n    <tr class="bg-gray-50 dark:bg-gray-800">\n      <th className="border border-gray-200 dark:border-gray-700 p-2">ستون ۱</th>\n      <th className="border border-gray-200 dark:border-gray-700 p-2">ستون ۲</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td className="border border-gray-200 dark:border-gray-700 p-2">مقدار ۱</td>\n      <td className="border border-gray-200 dark:border-gray-700 p-2">مقدار ۲</td>\n    </tr>\n  </tbody>\n</table>');
      else if (command === 'br') insertHtml('<br/>');
    }
  };

  const handleApplyAiControl = async () => {
    if (!promptInput.trim()) return;

    setControlling(true);
    setControlError('');
    setControlSuccessMessage('');
    setAiWarnings([]);

    try {
      const res = await fetch('/api/admin/products/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          formData,
          featuresList,
          specsList,
          galleryUrls,
          variants,
          faqItems,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در کنترل هوشمند محصول رخ داد.');
      }

      if (data.success) {
        if (data.formData) {
          const updatedFormData = { ...formData, ...data.formData };
          
          const price = Number(updatedFormData.price) || 0;
          const discountAmount = Number(updatedFormData.discount) || 0;
          if (price > 0 && discountAmount > 0) {
            updatedFormData.discountPercent = Math.round((discountAmount / price) * 100).toString();
          }

          setFormData(updatedFormData);

          if (updatedFormData.wholesaleTiers) {
            try {
              const parsedTiers = typeof updatedFormData.wholesaleTiers === 'string'
                ? JSON.parse(updatedFormData.wholesaleTiers)
                : updatedFormData.wholesaleTiers;
              if (Array.isArray(parsedTiers)) {
                setTiers(parsedTiers.map((t: any) => ({
                  minQty: Number(t.minQty || t.minQuantity) || 0,
                  maxQty: t.maxQty !== undefined && t.maxQty !== null ? Number(t.maxQty) : null,
                  discountPercent: Number(t.discountPercent) || 0,
                })));
              }
            } catch (e) {
              console.error('Error parsing wholesaleTiers from AI:', e);
            }
          }

          if (updatedFormData.wholesaleExclusivePrices) {
            try {
              const parsedExclusive = typeof updatedFormData.wholesaleExclusivePrices === 'string'
                ? JSON.parse(updatedFormData.wholesaleExclusivePrices)
                : updatedFormData.wholesaleExclusivePrices;
              if (Array.isArray(parsedExclusive)) {
                setExclusivePrices(parsedExclusive.map((ep: any) => ({
                  target: ep.target || ep.targetValue || ep.groupName || ep.userId || '',
                  price: Number(ep.price) || 0,
                })));
              }
            } catch (e) {
              console.error('Error parsing wholesaleExclusivePrices from AI:', e);
            }
          }
        }
        if (data.featuresList) setFeaturesList(data.featuresList);
        if (data.specsList) setSpecsList(data.specsList);
        if (data.galleryUrls) setGalleryUrls(data.galleryUrls);
        if (data.variants) setVariants(data.variants);
        if (data.faqItems) setFaqItems(data.faqItems);

        setControlSuccessMessage(data.explanation || 'تغییرات با موفقیت توسط هوش مصنوعی اعمال شد.');
        setAiWarnings(data.warnings || []);
        setPromptInput('');
      } else {
        setControlError(data.explanation || 'هوش مصنوعی نتوانست دستور را به درستی پردازش کند.');
      }
    } catch (err: any) {
      console.error(err);
      setControlError(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setControlling(false);
    }
  };

  const [faqItems, setFaqItems] = useState<{question: string, answer: string}[]>([]);
  const [generatingFaqs, setGeneratingFaqs] = useState(false);
  const [aiFaqsError, setAiFaqsError] = useState('');
  const [aiFaqsResult, setAiFaqsResult] = useState<{question: string, answer: string}[] | null>(null);

  const handleGenerateAiFaqs = async () => {
    if (!formData.title.trim()) {
      setAiFaqsError('لطفاً ابتدا نام محصول را وارد کنید.');
      return;
    }
    setAiFaqsError('');
    setGeneratingFaqs(true);
    setAiFaqsResult(null);

    const maxClientRetries = 3;
    let clientAttempt = 0;
    let success = false;

    while (clientAttempt < maxClientRetries && !success) {
      clientAttempt++;
      if (clientAttempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      try {
        const res = await fetch('/api/admin/products/ai-faqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            brand: formData.brand,
            price: formData.price,
            type: formData.type,
            categoryId: formData.categoryId,
            specs: JSON.stringify(specsList.filter(s => s.key && s.value)),
            features: JSON.stringify(featuresList.filter(f => f.key && f.value)),
            variants: JSON.stringify(variants.filter(v => v.name)),
            fullDescription: formData.fullDescription,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          if (data.faqs && Array.isArray(data.faqs)) {
            setAiFaqsResult(data.faqs);
            success = true;
            break;
          }
        } else {
          if (clientAttempt === maxClientRetries) {
            setAiFaqsError(data.error || 'خطایی در تولید سوالات متداول رخ داد.');
          }
        }
      } catch (err) {
        if (clientAttempt === maxClientRetries) {
          setAiFaqsError('خطا در برقراری ارتباط با سرور.');
        }
      }
    }

    setGeneratingFaqs(false);
  };

  const handleGenerateAiArticle = async () => {
    if (!formData.title.trim()) {
      setAiArticleError('لطفاً ابتدا نام محصول را وارد کنید.');
      return;
    }
    setAiArticleError('');
    setGeneratingArticle(true);
    setAiArticleResult(null);

    const maxClientRetries = 3;
    let clientAttempt = 0;
    let success = false;

    while (clientAttempt < maxClientRetries && !success) {
      clientAttempt++;
      if (clientAttempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      try {
        const res = await fetch('/api/admin/products/ai-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: id,
            title: formData.title,
            description: formData.description,
            brand: formData.brand,
            price: formData.price,
            type: formData.type,
            categoryId: formData.categoryId,
            specs: JSON.stringify(specsList.filter(s => s.key && s.value)),
            features: JSON.stringify(featuresList.filter(f => f.key && f.value)),
            variants: JSON.stringify(variants.filter(v => v.name)),
            imageUrl: formData.imageUrl,
            galleryUrls: galleryUrls,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setAiArticleResult(data.article);
          success = true;
          break;
        } else {
          if (clientAttempt === maxClientRetries) {
            setAiArticleError(data.error || 'خطایی در تولید مقاله رخ داد.');
          }
        }
      } catch (err) {
        if (clientAttempt === maxClientRetries) {
          setAiArticleError('خطا در برقراری ارتباط با سرور.');
        }
      }
    }

    setGeneratingArticle(false);
  };

  const handleGenerateAiSeo = async () => {
    if (!formData.title.trim()) {
      setAiSeoError('لطفاً ابتدا نام محصول را وارد کنید.');
      return;
    }
    setAiSeoError('');
    setGeneratingSeo(true);
    setAiSeoSuccess(false);

    const maxClientRetries = 3;
    let clientAttempt = 0;
    let success = false;

    while (clientAttempt < maxClientRetries && !success) {
      clientAttempt++;
      if (clientAttempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      try {
        const res = await fetch('/api/admin/products/ai-seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            fullDescription: formData.fullDescription,
            brand: formData.brand,
            price: formData.price,
            type: formData.type,
            categoryId: formData.categoryId,
            specs: JSON.stringify(specsList.filter(s => s.key && s.value)),
            features: JSON.stringify(featuresList.filter(f => f.key && f.value)),
            variants: JSON.stringify(variants.filter(v => v.name)),
            imageUrl: formData.imageUrl,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setFormData(prev => ({
            ...prev,
            seoTitle: data.seoTitle,
            seoDescription: data.seoDescription,
            schemaMarkup: data.schemaMarkup || prev.schemaMarkup,
          }));
          if (data.schemaReport) {
            setAiSchemaReport(data.schemaReport);
          }
          setAiSeoSuccess(true);
          success = true;
          break;
        } else {
          if (clientAttempt === maxClientRetries) {
            setAiSeoError(data.error || 'خطایی در تولید سئو رخ داد.');
          }
        }
      } catch (err) {
        if (clientAttempt === maxClientRetries) {
          setAiSeoError('خطا در برقراری ارتباط با سرور.');
        }
      }
    }

    setGeneratingSeo(false);
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!activePackage) {
      if (featureKey === 'physicalProducts') return true;
      return false;
    }
    try {
      const features = JSON.parse(activePackage.features);
      return !!features[featureKey];
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    // Fetch shop settings to determine allowed product types
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setShopProductType(data.settings.productType || 'both');
          setActivePackage(data.settings.package || null);
          setShopName(data.settings.shopName || 'فروشگاه من');
          setWholesaleEnabled(data.settings.wholesaleEnabled || false);
        }
      })
      .catch(console.error);

    // Fetch existing product
    fetch(`/api/admin/products`)
      .then(res => res.json())
      .then(data => {
        const product = data.products?.find((p: any) => p.id === id);
        if (product) {
          const price = product.price || 0;
          const discount = product.discount || 0;
          const discountPercent = price > 0 ? Math.round((discount / price) * 100) : 0;

          const formatDateTimeLocal = (dateString?: string | null) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            const offset = d.getTimezoneOffset();
            const localDate = new Date(d.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().slice(0, 16);
          };

          setFormData({
            title: product.title || '',
            brand: product.brand || '',
            description: product.description || '',
            fullDescription: product.fullDescription || '',
            seoTitle: product.seoTitle || '',
            seoDescription: product.seoDescription || '',
            schemaMarkup: product.schemaMarkup || '',
            price: price.toString() || '',
            discount: discount.toString() || '',
            discountPercent: discountPercent.toString(),
            discountMinQty: product.discountMinQty ? product.discountMinQty.toString() : '',
            stock: product.stock?.toString() || '',
            isActive: product.isActive,
            type: product.type || 'physical',
            imageUrl: product.imageUrl || '',
            fileUrl: product.fileUrl || '',
            categoryId: product.categoryId || '',
            secondaryCategoryIds: product.categories ? product.categories.map((c: any) => c.id) : [],
            downloadLimit: product.downloadLimit?.toString() || '',
            downloadExpiryDays: product.downloadExpiryDays?.toString() || '',
            downloadIpRestriction: !!product.downloadIpRestriction,
            fileFormat: product.fileFormat || '',
            fileSize: product.fileSize || '',
            previewUrl: product.previewUrl || '',
            techSpecs: product.techSpecs || '',
            downloadFiles: product.downloadFiles || '',
            isSpecial: product.isSpecial || false,
            specialEndsAt: formatDateTimeLocal(product.specialEndsAt),
            wholesalePrice: product.wholesalePrice?.toString() || '',
            wholesaleTiers: product.wholesaleTiers || '[]',
            wholesaleExclusivePrices: product.wholesaleExclusivePrices || '[]',
            moq: product.moq?.toString() || '1',
            wholesaleUnit: product.wholesaleUnit || 'عدد',
            wholesaleUnitSize: product.wholesaleUnitSize?.toString() || '1',
            weight: product.weight?.toString() || '0',
            volume: product.volume?.toString() || '0',
            isWholesaleOnly: !!product.isWholesaleOnly,
          });

          setShowSecondaryCategories(!!(product.categories && product.categories.length > 0));

          try {
            if (product.downloadFiles) {
              const parsed = JSON.parse(product.downloadFiles);
              if (Array.isArray(parsed) && parsed.length > 0) setDownloadFileList(parsed);
            }
          } catch(e) {}

          try {
            if (product.features) {
              const parsed = normalizeKeyValuePairs(product.features);
              const fl = Object.entries(parsed).map(([k, v]) => ({ key: k, value: String(v) }));
              if (fl.length > 0) setFeaturesList(fl);
            }
          } catch(e) {}

          try {
            if (product.specs) {
              const parsed = normalizeKeyValuePairs(product.specs);
              const sl = Object.entries(parsed).map(([k, v]) => ({ key: k, value: String(v) }));
              if (sl.length > 0) setSpecsList(sl);
            }
          } catch(e) {}

          try {
            if (product.galleryUrls) {
              const parsed = JSON.parse(product.galleryUrls);
              if (Array.isArray(parsed) && parsed.length > 0) setGalleryUrls(parsed);
            }
          } catch(e) {}

          try {
            if (product.faqs) {
              const parsed = JSON.parse(product.faqs);
              if (Array.isArray(parsed) && parsed.length > 0) setFaqItems(parsed);
            }
          } catch(e) {}

          try {
            if (product.wholesaleTiers) {
              const parsed = JSON.parse(product.wholesaleTiers);
              if (Array.isArray(parsed)) setTiers(parsed);
            }
          } catch(e) {}

          try {
            if (product.wholesaleExclusivePrices) {
              const parsed = JSON.parse(product.wholesaleExclusivePrices);
              if (Array.isArray(parsed)) setExclusivePrices(parsed);
            }
          } catch(e) {}

          try {
            if (product.variants && Array.isArray(product.variants)) {
              setVariants(product.variants.map((v: any) => ({
                id: v.id,
                name: v.name,
                colorCode: v.colorCode,
                imageUrl: v.imageUrl || null,
                price: v.price.toString(),
                stock: v.stock.toString(),
                isDefault: !!v.isDefault
              })));
            }
          } catch(e) {}

        } else {
          setError('محصول یافت نشد');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name === 'price') {
      const price = Number(value) || 0;
      const discountAmount = Number(formData.discount) || 0;
      const discountPercent = price > 0 ? Math.min(100, Math.round((discountAmount / price) * 100)) : 0;
      
      setFormData(prev => ({ 
        ...prev, 
        price: value,
        discountPercent: discountPercent.toString()
      }));
    } else if (name === 'discount') {
      const price = Number(formData.price) || 0;
      const discountAmount = Math.min(price, Number(value) || 0);
      const discountPercent = price > 0 ? Math.min(100, Math.round((discountAmount / price) * 100)) : 0;
      
      setFormData(prev => ({ 
        ...prev, 
        discount: discountAmount.toString(),
        discountPercent: discountPercent.toString()
      }));
    } else if (name === 'discountPercent') {
      const percent = Math.min(100, Number(value) || 0);
      const price = Number(formData.price) || 0;
      const discountAmount = price > 0 ? Math.round((price * percent) / 100) : 0;
      
      setFormData(prev => ({ 
        ...prev, 
        discount: discountAmount.toString(),
        discountPercent: percent.toString()
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('saving');
    setError('');

    const handleValidationError = (msg: string) => {
      setError(msg);
      setSaving(false);
      setSaveStatus('error');
    };

    // Validation of Wholesale Rules
    if (wholesaleEnabled && formData.wholesalePrice) {
      const wPrice = Number(formData.wholesalePrice);
      if (wPrice > 0) {
        if (!formData.isWholesaleOnly) {
          const rPrice = Number(formData.price);
          if (!formData.price || rPrice <= 0) {
            handleValidationError('لطفاً قیمت تک‌فروشی محصول را وارد کنید. قیمت تک‌فروشی برای فروش عمده الزامی است.');
            return;
          }
          if (wPrice > rPrice) {
            handleValidationError('قیمت عمده‌فروشی نمی‌تواند بیشتر از قیمت تک‌فروشی محصول باشد.');
            return;
          }
        }
        
        // Validate against variants if any
        if (variants.length > 0) {
          const invalidVariant = variants.find(v => Number(v.price) < wPrice);
          if (invalidVariant) {
            handleValidationError(`قیمت عمده‌فروشی (${wPrice.toLocaleString('fa-IR')} تومان) نمی‌تواند بیشتر از قیمت تنوع "${invalidVariant.name}" (${Number(invalidVariant.price).toLocaleString('fa-IR')} تومان) باشد.`);
            return;
          }
        }

        const minOrderQty = Number(formData.moq) || 1;
        if (minOrderQty < 1) {
          handleValidationError('حداقل مقدار سفارش (MOQ) در فروش عمده باید حداقل ۱ باشد.');
          return;
        }

        const unitSize = Number(formData.wholesaleUnitSize) || 1;
        if (unitSize < 1) {
          handleValidationError('تعداد در واحد عمده باید حداقل ۱ باشد.');
          return;
        }

        // Validate tiers
        if (tiers && tiers.length > 0) {
          for (const tier of tiers) {
            if (tier.minQty < minOrderQty) {
              handleValidationError(`حداقل تعداد در پله‌های تخفیف عمده (${tier.minQty.toLocaleString('fa-IR')}) نمی‌تواند کمتر از MOQ (${minOrderQty.toLocaleString('fa-IR')}) باشد.`);
              return;
            }
            if (tier.discountPercent < 1 || tier.discountPercent > 100) {
              handleValidationError('درصد تخفیف پله‌ای باید بین ۱ تا ۱۰۰ باشد.');
              return;
            }
            if (tier.maxQty !== null && tier.maxQty !== undefined && tier.maxQty <= tier.minQty) {
              handleValidationError(`حداکثر تعداد در پله تخفیف (${tier.maxQty.toLocaleString('fa-IR')}) باید بیشتر از حداقل تعداد آن (${tier.minQty.toLocaleString('fa-IR')}) باشد.`);
              return;
            }
          }
        }

        // Validate exclusive prices
        if (exclusivePrices && exclusivePrices.length > 0) {
          for (const ep of exclusivePrices) {
            if (!ep.price || ep.price <= 0) {
              handleValidationError('قیمت اختصاصی گروه‌ها باید بزرگتر از ۰ باشد.');
              return;
            }
            if (ep.price > wPrice) {
              handleValidationError(`قیمت اختصاصی گروه "${ep.target}" (${ep.price.toLocaleString('fa-IR')} تومان) نمی‌تواند بیشتر از قیمت پایه عمده‌فروشی (${wPrice.toLocaleString('fa-IR')} تومان) باشد.`);
              return;
            }
          }
        }
      }
    }

    try {
      // Build final features/specs JSON strings
      const finalFeatures = Object.fromEntries(featuresList.filter(f => f.key.trim()).map(f => [f.key.trim(), f.value.trim()]));
      const finalSpecs = Object.fromEntries(specsList.filter(f => f.key.trim()).map(f => [f.key.trim(), f.value.trim()]));

      const payload = {
        ...formData,
        price: formData.isWholesaleOnly ? formData.wholesalePrice : formData.price,
        discount: formData.isWholesaleOnly ? '0' : formData.discount,
        discountPercent: formData.isWholesaleOnly ? '0' : formData.discountPercent,
        discountMinQty: formData.isWholesaleOnly ? '0' : formData.discountMinQty,
        features: Object.keys(finalFeatures).length > 0 ? JSON.stringify(finalFeatures) : null,
        specs: Object.keys(finalSpecs).length > 0 ? JSON.stringify(finalSpecs) : null,
        galleryUrls: galleryUrls.length > 0 ? JSON.stringify(galleryUrls) : null,
        variants: variants.filter(v => v.name.trim() !== ''),
        downloadFiles: downloadFileList.length > 0 ? JSON.stringify(downloadFileList) : null,
        faqs: faqItems.filter(f => f.question.trim() && f.answer.trim()).length > 0 ? JSON.stringify(faqItems.filter(f => f.question.trim() && f.answer.trim())) : null,
        wholesaleTiers: JSON.stringify(tiers),
        wholesaleExclusivePrices: JSON.stringify(exclusivePrices),
      };

      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveStatus('saved');
        router.push('/admin/products');
      } else {
        const data = await res.json();
        setError(data.error || 'خطا در بروزرسانی محصول');
        setSaveStatus('error');
      }
    } catch (err) {
      setError('خطای ارتباط با سرور');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const renderProductSaleType = () => {
    if (!wholesaleEnabled) return null;
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-indigo-500" />
          نوع فروش محصول
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isWholesaleOnly: false }))}
            className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 text-center ${
              !formData.isWholesaleOnly
                ? 'border-blue-500 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                : 'border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            <span>خرده‌فروشی و عمده‌فروشی (ترکیبی)</span>
            <span className="text-[10px] font-normal opacity-80">محصول هم به صورت تکی و هم عمده قابل خرید است</span>
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isWholesaleOnly: true }))}
            className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 text-center ${
              formData.isWholesaleOnly
                ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                : 'border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            <span>صرفاً عمده‌فروشی (B2B)</span>
            <span className="text-[10px] font-normal opacity-80">محصول فقط به صورت عمده فروخته می‌شود و قیمت تکی ندارد</span>
          </button>
        </div>
      </div>
    );
  };

  const renderWholesaleSettings = () => {
    if (!wholesaleEnabled) return null;
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
          <Store className="w-5 h-5 text-indigo-500 fill-indigo-500/10" />
          تنظیمات عمده‌فروشی (B2B)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">قیمت عمده‌فروشی (تومان)</label>
            <input
              type="number"
              name="wholesalePrice"
              value={formData.wholesalePrice}
              onChange={handleChange}
              min="0"
              required={formData.isWholesaleOnly}
              placeholder="قیمت فروش عمده کالا"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">حداقل مقدار سفارش (MOQ)</label>
            <input
              type="number"
              name="moq"
              value={formData.moq}
              onChange={handleChange}
              min="1"
              required={formData.isWholesaleOnly}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">واحد عمده</label>
              <select
                name="wholesaleUnit"
                value={formData.wholesaleUnit}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="عدد">عدد</option>
                <option value="کارتن">کارتن</option>
                <option value="پالت">پالت</option>
                <option value="بسته">بسته</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تعداد در واحد</label>
              <input
                type="number"
                name="wholesaleUnitSize"
                value={formData.wholesaleUnitSize}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${formData.isWholesaleOnly && formData.type === 'physical' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 pt-4 border-t border-gray-50 dark:border-gray-800`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">وزن هر عدد کالا (کیلوگرم) - جهت محاسبه دقیق باربری</label>
            <input
              type="number"
              name="weight"
              step="0.01"
              value={formData.weight}
              onChange={handleChange}
              min="0"
              placeholder="مثلا: 1.5"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">حجم هر عدد کالا (لیتر / دسی‌متر مکعب) - جهت محاسبه دقیق باربری</label>
            <input
              type="number"
              name="volume"
              step="0.01"
              value={formData.volume}
              onChange={handleChange}
              min="0"
              placeholder="مثلا: 2.5"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          {formData.isWholesaleOnly && formData.type === 'physical' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">موجودی در انبار</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* تخفیف‌های پله‌ای بر اساس حجم خرید */}
        <div className="pt-4 border-t border-gray-50 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">تخفیف‌های پله‌ای بر اساس حجم خرید</h3>
            <button
              type="button"
              onClick={() => setTiers([...tiers, { minQty: 100, maxQty: 500, discountPercent: 15 }])}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              افزودن پله جدید
            </button>
          </div>

          <div className="space-y-3">
            {tiers.map((tier, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">از تعداد:</span>
                  <input
                    type="number"
                    value={tier.minQty}
                    onChange={(e) => {
                      const updated = [...tiers];
                      updated[idx].minQty = parseInt(e.target.value) || 0;
                      setTiers(updated);
                    }}
                    className="w-20 px-2.5 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-center"
                    min="1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">تا تعداد:</span>
                  <input
                    type="number"
                    value={tier.maxQty || ''}
                    onChange={(e) => {
                      const updated = [...tiers];
                      updated[idx].maxQty = e.target.value ? parseInt(e.target.value) : null;
                      setTiers(updated);
                    }}
                    placeholder="بی‌نهایت"
                    className="w-20 px-2.5 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-center"
                    min="1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">درصد تخفیف:</span>
                  <input
                    type="number"
                    value={tier.discountPercent}
                    onChange={(e) => {
                      const updated = [...tiers];
                      updated[idx].discountPercent = parseInt(e.target.value) || 0;
                      setTiers(updated);
                    }}
                    className="w-16 px-2.5 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-center font-bold text-indigo-600 dark:text-indigo-400"
                    min="0"
                    max="100"
                  />
                  <span className="font-bold text-gray-500">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTiers(tiers.filter((_, i) => i !== idx))}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg mr-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {tiers.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">هیچ پله تخفیفی تعریف نشده است.</p>
            )}
          </div>
        </div>

        {/* قیمت اختصاصی برای مشتری یا گروه */}
        <div className="pt-4 border-t border-gray-50 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">قیمت اختصاصی برای هر مشتری یا گروه</h3>
            <button
              type="button"
              onClick={() => setExclusivePrices([...exclusivePrices, { target: 'همکار', price: 0 }])}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              افزودن قیمت اختصاصی
            </button>
          </div>

          <div className="space-y-3">
            {exclusivePrices.map((ep, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-gray-500 shrink-0">نام گروه یا ایمیل خریدار:</span>
                  <input
                    type="text"
                    value={ep.target}
                    onChange={(e) => {
                      const updated = [...exclusivePrices];
                      updated[idx].target = e.target.value;
                      setExclusivePrices(updated);
                    }}
                    placeholder="مثلاً: همکار، VIP، یا email@domain.com"
                    className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">قیمت اختصاصی (تومان):</span>
                  <input
                    type="number"
                    value={ep.price || ''}
                    onChange={(e) => {
                      const updated = [...exclusivePrices];
                      updated[idx].price = parseInt(e.target.value) || 0;
                      setExclusivePrices(updated);
                    }}
                    className="w-32 px-2.5 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-center font-bold text-emerald-600"
                    min="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setExclusivePrices(exclusivePrices.filter((_, i) => i !== idx))}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg mr-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {exclusivePrices.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">هیچ قیمت اختصاصی تعریف نشده است.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">ویرایش محصول</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          data-testid="save-status"
          data-status-state={saveStatus}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 w-full sm:w-auto"
        >
          <Save className="w-5 h-5" />
          {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
      </div>

      {error && (
        <div style={{ border: '1px solid var(--color-border-danger)', background: 'var(--color-background-danger)', padding: '12px 16px', borderRadius: '8px', color: 'var(--color-text-danger)' }} className="mb-6 font-bold text-xs text-right">
          ذخیره‌سازی ناموفق بود. تغییرات شما در این صفحه هنوز هستند. دوباره تلاش کنید یا صفحه را نبندید.
          <div className="mt-1 font-normal text-[10px]">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Type Selection (only if shop allows both) */}
        {shopProductType === 'both' && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">نوع محصول</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isFeatureEnabled('physicalProducts') && (
                <label className={`
                  flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors
                  ${formData.type === 'physical' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}
                `}>
                  <input 
                    type="radio" 
                    name="type" 
                    value="physical" 
                    checked={formData.type === 'physical'} 
                    onChange={handleChange}
                    className="hidden"
                  />
                  <div className={`p-2 rounded-lg ${formData.type === 'physical' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">محصول فیزیکی</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">نیاز به انبارداری و ارسال پستی</div>
                  </div>
                </label>
              )}

              {isFeatureEnabled('digitalProducts') && (
                <label className={`
                  flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors
                  ${formData.type === 'digital' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}
                `}>
                  <input 
                    type="radio" 
                    name="type" 
                    value="digital" 
                    checked={formData.type === 'digital'} 
                    onChange={handleChange}
                    className="hidden"
                  />
                  <div className={`p-2 rounded-lg ${formData.type === 'digital' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    <FileDown className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">محصول دانلودی</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">بدون نیاز به انبار، دانلود فوری</div>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        {/* AI Prompt Control - Smart Assistant */}
        {true && (
          <div className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-2xl shadow-sm border border-purple-100 dark:border-purple-900/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-purple-600 text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-white">دستیار هوشمند محصول (کنترل با پرامپت)</h2>
                <p className="text-[10px] text-gray-500 font-bold leading-relaxed mt-0.5">
                  با نوشتن دستورهای متنی به زبان ساده، تمام بخش‌های این محصول (قیمت، تخفیف، موجودی، تنوع‌ها، سوالات متداول و مشخصات) را مدیریت و به‌روزرسانی کنید!
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="مثال: قیمت محصول رو ۲۰ درصد ببر بالا و ۱۰۰۰ تا موجودی اضافه کن..."
                  className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-gray-800/80 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyAiControl();
                    }
                  }}
                  disabled={controlling}
                />
                <button
                  type="button"
                  disabled={controlling || !promptInput.trim()}
                  onClick={handleApplyAiControl}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {controlling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      اعمال دستور
                    </>
                  )}
                </button>
              </div>

              {/* Suggestions / Prompt Templates */}
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold self-center ml-1">پیشنهادها:</span>
                {[
                  'قیمت محصول رو ۲۰ درصد ببر بالا',
                  'تا ۳ شنبه ۲۰ تیر برو تو تخفیف ۱۰ درصد',
                  'موجودی اضافه کن ۱۰۰۰ تا',
                  'سوال متداول ۲ و ۳ رو پاک کن',
                  'تنوع رنگ قرمز با قیمت ۲۰ درصد گرون‌تر اضافه کن'
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPromptInput(sug)}
                    className="text-[10px] bg-white hover:bg-purple-50 dark:bg-gray-800/50 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {controlError && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{controlError}</span>
                </div>
              )}

              {controlSuccessMessage && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-xs font-semibold leading-relaxed border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">دستور با موفقیت اعمال شد:</p>
                    <p className="text-[11px] opacity-90">{controlSuccessMessage}</p>
                  </div>
                </div>
              )}

              {aiWarnings && aiWarnings.length > 0 && (
                <div className="space-y-2">
                  {aiWarnings.map((warning, idx) => (
                    <div key={idx} className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/20 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-800 dark:text-amber-400 animate-in fade-in duration-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400 animate-bounce" />
                      <p className="text-xs font-bold leading-relaxed">{warning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* نوع فروش محصول */}
        {renderProductSaleType()}

        {/* تنظیمات عمده‌فروشی (B2B) - در صورتی که صرفاً عمده‌فروشی فعال باشد */}
        {formData.isWholesaleOnly && renderWholesaleSettings()}

        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6">اطلاعات پایه</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نام محصول</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <CategoryPicker 
                value={formData.categoryId || ''} 
                onChange={(val) => setFormData(prev => ({ ...prev, categoryId: val }))} 
              />
            </div>

            <div className="pt-1">
              {!showSecondaryCategories ? (
                <button
                  type="button"
                  onClick={() => setShowSecondaryCategories(true)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} />
                  افزودن به دسته‌بندی‌های دیگر (ثانویه)
                </button>
              ) : (
                <div className="space-y-2 border border-dashed border-gray-200 dark:border-gray-800 p-4 rounded-xl relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSecondaryCategories(false);
                      setFormData(prev => ({ ...prev, secondaryCategoryIds: [] }));
                    }}
                    className="absolute top-2 left-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    title="حذف دسته‌بندی‌های ثانویه"
                  >
                    <X size={14} />
                  </button>
                  <MultiCategoryPicker 
                    value={formData.secondaryCategoryIds || []} 
                    onChange={(val) => setFormData(prev => ({ ...prev, secondaryCategoryIds: val }))} 
                    excludeId={formData.categoryId || undefined}
                  />
                </div>
              )}
            </div>

            <div>
              <BrandPicker 
                value={formData.brand} 
                onChange={(val) => setFormData(prev => ({ ...prev, brand: val }))} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">توضیحات</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Media & Files */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6">رسانه و فایل</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Main Image */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تصویر اصلی محصول</label>
                <div 
                  onClick={() => setShowMediaPickerFor('image')}
                  className={`
                    border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors
                    ${formData.imageUrl ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                  `}
                >
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Product" className="h-32 object-cover rounded-lg" />
                  ) : (
                    <>
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3 text-gray-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">انتخاب تصویر</span>
                    </>
                  )}
                </div>
              </div>

              {/* Gallery Images */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">گالری تصاویر</label>
                  <button type="button" onClick={() => setShowMediaPickerFor('gallery')} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">+ افزودن تصویر</button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {galleryUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                      <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setGalleryUrls(galleryUrls.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  {galleryUrls.length === 0 && <div className="text-xs text-gray-400 py-4 w-full text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">عکسی در گالری وجود ندارد.</div>}
                </div>
              </div>
            </div>

            {/* Digital File & Download Settings (If applicable) */}
            {formData.type === 'digital' && (
              <div className="col-span-1 md:col-span-2 border-t border-gray-100 dark:border-gray-800 pt-6 mt-4 space-y-6">
                <div className="bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 p-5 rounded-2xl">
                  <h3 className="text-md font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2 mb-4">
                    <FileDown className="w-5 h-5" />
                    تنظیمات و فایل‌های محصول دانلودی
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Main File */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">فایل اصلی محصول</label>
                      <div 
                        onClick={() => {
                          setIsAddingMultiFile(false);
                          setShowMediaPickerFor('file');
                        }}
                        className={`
                          border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors h-[140px]
                          ${formData.fileUrl ? 'border-purple-500 bg-white dark:bg-gray-800' : 'border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800'}
                        `}
                      >
                        {formData.fileUrl ? (
                          <>
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-2 text-purple-600 dark:text-purple-400">
                              <FileDown className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 line-clamp-1 px-4">{formData.fileUrl.split('/').pop()}</span>
                            <span className="text-[10px] text-purple-500 mt-1">تغییر فایل اصلی</span>
                          </>
                        ) : (
                          <>
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-2 text-gray-400">
                              <FileDown className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">انتخاب فایل اصلی</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Preview File */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">فایل پیش‌نمایش (صفحه اول PDF / دمو صوتی / ویدیو تریلر)</label>
                      <div 
                        onClick={() => {
                          setShowMediaPickerFor('preview');
                        }}
                        className={`
                          border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors h-[140px]
                          ${formData.previewUrl ? 'border-blue-500 bg-white dark:bg-gray-800' : 'border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800'}
                        `}
                      >
                        {formData.previewUrl ? (
                          <>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-2 text-blue-600 dark:text-blue-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                            </div>
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 line-clamp-1 px-4">{formData.previewUrl.split('/').pop()}</span>
                            <span className="text-[10px] text-blue-500 mt-1">تغییر فایل پیش‌نمایش</span>
                          </>
                        ) : (
                          <>
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-2 text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">انتخاب فایل پیش‌نمایش (اختیاری)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Multi-File Upload support */}
                  <div className="mt-6 border-t border-purple-100 dark:border-purple-900/30 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-purple-950 dark:text-purple-300">لیست فایل‌های دانلودی (در صورت تمایل به آپلود چند فایل / نسخه)</h4>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAddingMultiFile(true);
                          setShowMediaPickerFor('file');
                        }}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        + افزودن فایل دیگر
                      </button>
                    </div>

                    {downloadFileList.length > 0 ? (
                      <div className="space-y-3">
                        {downloadFileList.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-gray-850 border border-purple-100 dark:border-purple-900/20 rounded-xl">
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 w-6 h-6 flex items-center justify-center rounded-full">{idx + 1}</span>
                              <input 
                                type="text" 
                                value={file.name}
                                onChange={(e) => {
                                  const updated = [...downloadFileList];
                                  updated[idx].name = e.target.value;
                                  setDownloadFileList(updated);
                                }}
                                placeholder="عنوان فایل (مثلا: نسخه پی‌دی‌اف / آپدیت جدید)"
                                className="flex-1 text-xs font-medium bg-transparent border-b border-dashed border-gray-300 dark:border-gray-700 focus:border-purple-500 outline-none py-1 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border border-gray-100 dark:border-gray-800">{file.format || 'FILE'}</span>
                              <button 
                                type="button" 
                                onClick={() => {
                                  setDownloadFileList(downloadFileList.filter((_, i) => i !== idx));
                                }}
                                className="text-red-500 hover:text-red-700 p-1 transition-colors"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h8c1 0 2 1 2 2v2"/></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-500 text-center py-4 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-dashed border-purple-100 dark:border-purple-900/20">
                        در صورت اضافه کردن فایل‌های اضافی، خریدار می‌تواند نسخه‌های مختلف یا فایل‌های جانبی را نیز به صورت مستقل دانلود کند.
                      </div>
                    )}
                  </div>

                  {/* Manual details / Display Settings */}
                  <div className="mt-6 border-t border-purple-100 dark:border-purple-900/30 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">فرمت فایل برای نمایش (مثلا: PDF / MP4 / ZIP)</label>
                      <input
                        type="text"
                        name="fileFormat"
                        value={formData.fileFormat}
                        onChange={handleChange}
                        placeholder="ZIP"
                        className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-850 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">حجم فایل برای نمایش (مثلا: 14.5 مگابایت)</label>
                      <input
                        type="text"
                        name="fileSize"
                        value={formData.fileSize}
                        onChange={handleChange}
                        placeholder="14.5 MB"
                        className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-850 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">پیش‌نیازها و سیستم مورد نیاز (توضیحات فنی)</label>
                      <textarea
                        name="techSpecs"
                        value={formData.techSpecs}
                        onChange={handleChange}
                        placeholder="مثلا: نرم‌افزار مورد نیاز: Adobe Acrobat Reader - مناسب برای گوشی و کامپیوتر"
                        rows={2}
                        className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-850 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white resize-none"
                      />
                    </div>
                  </div>

                  {/* Security / Expiry / Limits */}
                  <div className="mt-6 border-t border-purple-100 dark:border-purple-900/30 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">حداکثر تعداد مجاز دانلود برای هر خریدار</label>
                      <input
                        type="number"
                        name="downloadLimit"
                        value={formData.downloadLimit}
                        onChange={handleChange}
                        placeholder="بدون محدودیت"
                        min="0"
                        className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-850 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                      />
                      <span className="text-[10px] text-gray-500 mt-1 block">تعداد دفعاتی که مشتری مجاز است فایل را دانلود کند. خالی یا 0 به معنی نامحدود است.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">مدت اعتبار لینک دانلود پس از خرید (روز)</label>
                      <input
                        type="number"
                        name="downloadExpiryDays"
                        value={formData.downloadExpiryDays}
                        onChange={handleChange}
                        placeholder="بدون انقضا"
                        min="0"
                        className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-850 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                      />
                      <span className="text-[10px] text-gray-500 mt-1 block">تعداد روزهایی که لینک دانلود فعال است. خالی یا 0 به معنی نامحدود است.</span>
                    </div>

                    <div className="sm:col-span-2 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          name="downloadIpRestriction"
                          checked={formData.downloadIpRestriction}
                          onChange={handleChange}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700"
                        />
                        <div>
                          <span className="text-xs font-bold text-gray-950 dark:text-white">محدودیت IP (دانلود فقط با یک IP ثابت)</span>
                          <p className="text-[10px] text-gray-500 mt-0.5">در صورت فعال بودن، اولین دانلود مشتری IP او را قفل می‌کند و دانلودهای بعدی فقط از آن IP مجاز خواهد بود.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Extended Description */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">توضیحات کامل (مقاله سئو)</h2>
              <p className="text-[10px] text-gray-500 font-bold mt-1">توضیحات تفصیلی، نقد و بررسی و مقالات سئو شده را وارد کنید.</p>
              <div className="mt-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed max-w-2xl text-right">
                ⚠️ نکته بسیار مهم: برای تولید یک مقاله فوق‌العاده سئو شده، منطبق بر واقعیت و شامل مزیت‌های رقابتی، ابتدا رنگ‌ها و طرح‌ها را در بخش «تنوع محصول» و مواردی چون وزن، گارانتی و سایر ویژگی‌های فنی را در بخش «مشخصات فنی» بالا به صورت کامل پر کنید. هوش مصنوعی محتوا را کاملاً بر اساس مقادیر وارد شده (مثلاً رنگ‌های قرمز و سبز یا نوع گارانتی) اختصاصی‌سازی خواهد کرد.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Dual Mode Switcher */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-850 p-1 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <button
                  type="button"
                  onClick={() => setDescMode('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${descMode === 'preview' ? 'bg-white dark:bg-gray-850 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  پیش‌نمایش
                </button>
                <button
                  type="button"
                  onClick={() => setDescMode('code')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${descMode === 'code' ? 'bg-white dark:bg-gray-850 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <Code className="w-3.5 h-3.5" />
                  ویرایش (کد)
                </button>
              </div>

              {isFeatureEnabled('aiArticleEnabled') ? (
                <button
                  type="button"
                  disabled={generatingArticle}
                  onClick={handleGenerateAiArticle}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg transition-all font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {generatingArticle ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      در حال نگارش مقاله...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                      نگارش مقاله با هوش مصنوعی
                    </>
                  )}
                </button>
              ) : (
                <div 
                  title="این ویژگی در پکیج اشتراک فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید."
                  className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg text-xs font-bold select-none cursor-not-allowed border border-gray-200 dark:border-gray-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-gray-300" />
                  نگارش مقاله با هوش مصنوعی (غیرفعال)
                </div>
              )}
              <button 
                type="button" 
                onClick={() => setShowMediaPickerFor('fullDescription')}
                className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                افزودن تصویر
              </button>
            </div>
          </div>

          {/* Display Writing Toolbar above both Preview and Code modes */}
          <div className="flex flex-wrap items-center gap-1 bg-gray-50 dark:bg-gray-850 p-1.5 rounded-xl border border-gray-200/80 dark:border-gray-750/80">
            <button
              type="button"
              onClick={() => handleFormat('heading2')}
              title="تیتر اصلی ۲"
              className="px-2.5 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-black cursor-pointer"
            >
              <Heading2 className="w-3.5 h-3.5" />
              H2
            </button>
            <button
              type="button"
              onClick={() => handleFormat('heading3')}
              title="تیتر فرعی ۳"
              className="px-2.5 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-black cursor-pointer"
            >
              <Heading3 className="w-3.5 h-3.5" />
              H3
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              type="button"
              onClick={() => handleFormat('bold')}
              title="ضخیم (Bold)"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('italic')}
              title="مورب (Italic)"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              type="button"
              onClick={() => handleFormat('paragraph')}
              title="پاراگراف"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <Type className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('insertUnorderedList')}
              title="لیست نشانه‌دار"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('insertOrderedList')}
              title="لیست شماره‌دار"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              type="button"
              onClick={() => handleFormat('createLink')}
              title="افزودن لینک"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('blockquote')}
              title="نقل قول"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('table')}
              title="افزودن جدول"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('br')}
              title="شکستن خط (Line Break)"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => { if(confirm('آیا از پاک کردن کامل متن مطمئن هستید؟')) setFormData(prev => ({...prev, fullDescription: ''})) }}
              title="پاک کردن متن"
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            .edit-preview-links a {
              position: relative;
              color: var(--primary) !important;
              font-weight: 700;
              text-decoration: underline;
              text-decoration-style: dotted;
              text-underline-offset: 4px;
            }
            .edit-preview-links a:hover {
              color: var(--color-primary-600) !important;
              text-decoration-style: solid;
            }
            .edit-preview-links a::after {
              content: attr(href);
              position: absolute;
              bottom: 100%;
              left: 50%;
              transform: translateX(-50%) translateY(-2px);
              background-color: var(--color-slate-800, #1f2937);
              color: #ffffff;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              font-family: monospace;
              white-space: nowrap;
              opacity: 0;
              pointer-events: none;
              transition: all 0.15s ease-in-out;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              z-index: 9999;
              direction: ltr;
            }
            .edit-preview-links a:hover::after {
              opacity: 1;
              transform: translateX(-50%) translateY(-6px);
            }
          ` }} />

          {/* Conditional Rendering of Preview or Text Editor */}
          {descMode === 'preview' ? (
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/80 min-h-[300px] text-right font-sans relative">
              <div
                ref={previewEditorRef}
                contentEditable
                onInput={handlePreviewInput}
                className="prose dark:prose-invert max-w-none text-xs sm:text-sm font-normal leading-[2.2] text-gray-700 dark:text-gray-300 min-h-[280px] outline-none space-y-5 [&_img]:max-w-full md:[&_img]:max-w-[400px] [&_img]:max-h-[350px] [&_img]:h-auto [&_img]:mx-auto [&_img]:rounded-xl [&_img]:shadow-sm [&_img]:my-4 [&_img]:border [&_img]:border-slate-100/50 dark:[&_img]:border-slate-800/80 [&_img]:object-contain [&_img]:block edit-preview-links"
                style={{ direction: 'rtl', textAlign: 'right' }}
              />
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in duration-200">
              <textarea
                ref={textareaRef}
                name="fullDescription"
                value={formData.fullDescription}
                onChange={handleChange}
                rows={12}
                placeholder="کدهای HTML توضیحات کامل محصول شامل نقد و بررسی دقیق، مزایا، و توضیحات سئو شده را در این کادر بنویسید یا ویرایش کنید."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-805 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-mono text-xs leading-relaxed resize-y"
              />
            </div>
          )}

          {aiArticleError && (
            <div className="mt-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900 flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 rotate-45 shrink-0 animate-spin" />
              <span>{aiArticleError}</span>
            </div>
          )}

          {aiArticleResult && (
            <div className="mt-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 p-5 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 text-right">
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" />
                پیش‌نمایش مقاله تولید شده توسط هوش مصنوعی (حاوی پیوندهای داخلی هوشمند):
              </h4>
              <div 
                className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-purple-100/50 dark:border-purple-900/30 text-xs text-gray-800 dark:text-gray-200 leading-relaxed max-h-96 overflow-y-auto prose dark:prose-invert font-sans"
                dangerouslySetInnerHTML={{ __html: aiArticleResult }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      fullDescription: aiArticleResult,
                    }));
                    setAiArticleResult(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  تایید و جایگزینی در توضیحات کامل
                </button>
                <button
                  type="button"
                  onClick={() => setAiArticleResult(null)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                  انصراف
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FAQs Section */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">سوالات مهم و متداول (FAQ)</h2>
              <p className="text-[10px] text-gray-500 font-bold leading-relaxed mt-1">
                سوالات متداولی که خریداران درباره این محصول می‌پرسند را وارد کنید تا در صفحه محصول نمایش داده شود (کمک به سئو و اعتماد مشتری).
              </p>
              <div className="mt-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed max-w-2xl text-right">
                ⚠️ نکته بسیار مهم: برای اینکه هوش مصنوعی بتواند پاسخ‌های دقیق، متقاعدکننده و واقعی (مانند شرایط گارانتی، وزن و رنگ‌های انتخابی کالا) تولید کند، حتماً ابتدا مشخصات فنی، برند و تنوع کالا را در بخش‌های بالا به طور کامل تکمیل کنید.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isFeatureEnabled('aiFaqsEnabled') ? (
                <button
                  type="button"
                  disabled={generatingFaqs}
                  onClick={handleGenerateAiFaqs}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg transition-all font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {generatingFaqs ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      در حال تولید سوالات متداول...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                      تولید سوالات با هوش مصنوعی
                    </>
                  )}
                </button>
              ) : (
                <span className="text-[10px] bg-gray-50 text-gray-400 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-3 py-1.5 rounded-lg font-bold">
                  تولید سوالات با هوش مصنوعی (غیرفعال)
                </span>
              )}
            </div>
          </div>

          {aiFaqsError && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-bold border border-red-100 mb-4 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiFaqsError}</span>
            </div>
          )}

          {aiFaqsResult && (
            <div className="mb-6 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 p-5 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 text-right">
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" />
                پیش‌نمایش پرسش و پاسخ‌های تولید شده توسط هوش مصنوعی:
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                {aiFaqsResult.map((faq, idx) => (
                  <div key={idx} className="p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-purple-100/40 dark:border-purple-900/20 text-xs">
                    <div className="font-bold text-blue-600 dark:text-blue-400 mb-1.5">؟ {faq.question}</div>
                    <div className="text-gray-600 dark:text-gray-300 leading-relaxed pr-3">{faq.answer}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFaqItems(prev => {
                      const existing = prev.filter(f => f.question.trim() || f.answer.trim());
                      return [...existing, ...aiFaqsResult];
                    });
                    setAiFaqsResult(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  تایید و افزودن به لیست پرسش‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setAiFaqsResult(null)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                  انصراف
                </button>
              </div>
            </div>
          )}

          {/* List of FAQ items */}
          <div className="space-y-4">
            {faqItems.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                <HelpCircle className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-bold">هیچ سوال و پاسخی اضافه نشده است.</p>
                <button
                  type="button"
                  onClick={() => setFaqItems([{ question: '', answer: '' }])}
                  className="mt-3 text-xs font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                >
                  + افزودن اولین سوال
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {faqItems.map((faq, index) => (
                  <div key={index} className="flex gap-3 items-start p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-gray-100/50 dark:border-gray-800/30">
                    <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-lg text-[10px] font-black shrink-0 mt-1">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                      <div>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const updated = [...faqItems];
                            updated[index].question = e.target.value;
                            setFaqItems(updated);
                          }}
                          placeholder="سوال (مثال: آیا این محصول گارانتی دارد؟)"
                          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold leading-relaxed transition-all"
                        />
                      </div>
                      <div>
                        <textarea
                          value={faq.answer}
                          onChange={(e) => {
                            const updated = [...faqItems];
                            updated[index].answer = e.target.value;
                            setFaqItems(updated);
                          }}
                          rows={2}
                          placeholder="پاسخ (مثال: بله، این محصول شامل ۱۸ ماه گارانتی معتبر شرکتی است.)"
                          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-semibold leading-relaxed transition-all"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFaqItems(faqItems.filter((_, i) => i !== index));
                      }}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => setFaqItems([...faqItems, { question: '', answer: '' }])}
                  className="w-full py-2.5 border border-dashed border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-100 dark:hover:border-blue-900/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  + افزودن سوال جدید
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SEO Settings */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">تنظیمات سئو (SEO)</h2>
              <button
                type="button"
                onClick={() => setShowSeoHelp(!showSeoHelp)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                {showSeoHelp ? 'بستن راهنما' : 'راهنمای متغیرها'}
              </button>
            </div>
            {isFeatureEnabled('aiSeoEnabled') ? (
              <button
                type="button"
                disabled={generatingSeo}
                onClick={handleGenerateAiSeo}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl transition-all font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
              >
                {generatingSeo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال تولید سئو...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    تولید سئو با هوش مصنوعی
                  </>
                )}
              </button>
            ) : (
              <div 
                title="این ویژگی در پکیج اشتراک فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید."
                className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-400 px-3 py-2 rounded-xl text-xs font-bold select-none cursor-not-allowed border border-gray-200 dark:border-gray-700"
              >
                <Sparkles className="w-4 h-4 text-gray-300" />
                تولید سئو با هوش مصنوعی (غیرفعال)
              </div>
            )}
          </div>

          {showSeoHelp && (
            <div className="mb-6 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200 text-xs leading-relaxed">
              <div className="flex items-center gap-1.5">
                <span className="text-base">💡</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">راهنمای استفاده از متغیرهای پویا:</p>
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                می‌توانید کدهای متغیر زیر را دقیقاً در کادر عنوان یا توضیحات سئو بنویسید. این کدها در سایت به صورت خودکار با اطلاعات واقعی کالا جایگزین می‌شوند:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                <div className="flex items-center gap-2.5 p-2 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 rounded-xl">
                  <code className="bg-blue-100/80 dark:bg-blue-900/40 border border-blue-200/50 dark:border-blue-800/50 px-2 py-0.5 rounded-lg font-mono text-blue-600 dark:text-blue-400 font-bold">{"{title}"}</code>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">نام محصول</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-900/20 rounded-xl">
                  <code className="bg-purple-100/80 dark:bg-purple-900/40 border border-purple-200/50 dark:border-purple-800/50 px-2 py-0.5 rounded-lg font-mono text-purple-600 dark:text-purple-400 font-bold">{"{brand}"}</code>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">برند محصول</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 bg-pink-50/40 dark:bg-pink-950/10 border border-pink-100/50 dark:border-pink-900/20 rounded-xl">
                  <code className="bg-pink-100/80 dark:bg-pink-900/40 border border-pink-200/50 dark:border-pink-800/50 px-2 py-0.5 rounded-lg font-mono text-pink-600 dark:text-pink-400 font-bold">{"{color}"}</code>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">رنگ یا تنوع</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-xl">
                  <code className="bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-800/50 px-2 py-0.5 rounded-lg font-mono text-emerald-600 dark:text-emerald-400 font-bold">{"{price}"}</code>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">قیمت محصول</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl">
                  <code className="bg-amber-100/80 dark:bg-amber-900/40 border border-amber-200/50 dark:border-amber-800/50 px-2 py-0.5 rounded-lg font-mono text-amber-600 dark:text-amber-400 font-bold">{"{shopName}"}</code>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">نام فروشگاه شما</span>
                </div>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                ⚠️ نکته: جهت تولید سئوی بسیار دقیق توسط هوش مصنوعی، حتماً پیش از کلیک بر روی دکمه تولید سئو، مشخصات فنی، برند و رنگ‌ها را تکمیل نمایید.
              </p>
            </div>
          )}

          {aiSeoError && (
            <div className="mb-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900 flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 rotate-45 shrink-0" />
              <span>{aiSeoError}</span>
            </div>
          )}

          {aiSeoSuccess && (
            <div className="mb-6 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 p-4 rounded-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <Sparkles className="w-5 h-5 text-green-500 shrink-0" />
              <div className="text-xs text-green-800 dark:text-green-300 font-bold">
                عنوان و توضیحات سئو با موفقیت توسط هوش مصنوعی تولید و در فیلدهای زیر اعمال شد!
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">عنوان سئو (SEO Title)</label>
              <input
                type="text"
                name="seoTitle"
                value={formData.seoTitle}
                onChange={handleChange}
                placeholder="مثال: خرید و قیمت گوشی آیفون 13 پرو مکس | فروشگاه من"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-400 mt-1">تعداد کاراکتر پیشنهادی: ۵۰ تا ۶۰ کاراکتر</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">توضیحات سئو (SEO Description)</label>
              <textarea
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleChange}
                rows={3}
                placeholder="توضیحات کوتاه سئو شده که در نتایج جستجوی گوگل نمایش داده می‌شود..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">تعداد کاراکتر پیشنهادی: ۱۵۰ تا ۱۶۰ کاراکتر</p>
            </div>

            {/* Live Google Search Preview Box */}
            <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl space-y-3 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">پیش‌نمایش زنده در نتایج جستجوی گوگل</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Google Snippet Preview</span>
              </div>
              
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900 shadow-xs space-y-1.5 font-sans" dir="rtl">
                {/* URL and Favicon */}
                <div className="flex items-center gap-2 text-xs text-[#202124] dark:text-[#e8eaed]">
                  <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/40 dark:border-slate-800 shrink-0">
                    <Globe className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-[11px] font-medium text-[#202124] dark:text-[#e8eaed] truncate max-w-[200px] sm:max-w-[300px]">
                      {shopName || 'فروشگاه من'}
                    </span>
                    <span className="text-[10px] text-[#5f6368] dark:text-[#bdc1c6] truncate max-w-[200px] sm:max-w-[300px]" dir="ltr">
                      {`https://yourshop.com › product › ${formData.title ? encodeURIComponent(formData.title).substring(0, 20) : 'id'}`}
                    </span>
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer text-lg sm:text-xl font-medium leading-tight truncate pt-0.5">
                  {formData.seoTitle ? (
                    (() => {
                      // Resolve placeholders
                      let titleTemplate = formData.seoTitle;
                      let variantName = variants && variants.length > 0 ? variants[0].name : '';
                      const formattedPrice = formData.price && Number(formData.price) > 0
                        ? `${Number(formData.price).toLocaleString('fa-IR')} تومان`
                        : 'رایگان';
                      return titleTemplate
                        .replace(/{title}/g, formData.title || 'نام محصول')
                        .replace(/{brand}/g, formData.brand || 'برند محصول')
                        .replace(/{color}/g, variantName || 'رنگ/تنوع')
                        .replace(/{variant}/g, variantName || 'رنگ/تنوع')
                        .replace(/{specs}/g, variantName || 'رنگ/تنوع')
                        .replace(/{price}/g, formattedPrice)
                        .replace(/{shopName}/g, shopName || 'نام فروشگاه');
                    })()
                  ) : (
                    `${formData.title || 'نام محصول'} | خرید و قیمت در ${shopName || 'نام فروشگاه'}`
                  )}
                </h3>
                
                {/* Description */}
                <p className="text-[#4d5156] dark:text-[#bdc1c6] text-xs sm:text-sm leading-relaxed line-clamp-2">
                  {formData.seoDescription ? (
                    (() => {
                      // Resolve placeholders
                      let descTemplate = formData.seoDescription;
                      let variantName = variants && variants.length > 0 ? variants[0].name : '';
                      const formattedPrice = formData.price && Number(formData.price) > 0
                        ? `${Number(formData.price).toLocaleString('fa-IR')} تومان`
                        : 'رایگان';
                      return descTemplate
                        .replace(/{title}/g, formData.title || 'نام محصول')
                        .replace(/{brand}/g, formData.brand || 'برند محصول')
                        .replace(/{color}/g, variantName || 'رنگ/تنوع')
                        .replace(/{variant}/g, variantName || 'رنگ/تنوع')
                        .replace(/{specs}/g, variantName || 'رنگ/تنوع')
                        .replace(/{price}/g, formattedPrice)
                        .replace(/{shopName}/g, shopName || 'نام فروشگاه');
                    })()
                  ) : (
                    formData.description || 'توضیحات کوتاه سئو شده که در نتایج جستجوی گوگل نمایش داده می‌شود...'
                  )}
                </p>
              </div>
            </div>

            {/* Schema Markup Section */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">کد اسکیما محصول (Schema Markup JSON-LD)</label>
                  <span className="bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-green-100 dark:border-green-900/50">
                    استاندارد گوگل ریچ ریزالتز
                  </span>
                </div>
              </div>

              {aiSchemaReport && (
                <div className="mb-4 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 p-4 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
                  <Sparkles className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-blue-900 dark:text-blue-300">گزارش خلاصه اسکیما (AI Schema Report)</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                      {aiSchemaReport}
                    </div>
                  </div>
                </div>
              )}

              <textarea
                name="schemaMarkup"
                value={formData.schemaMarkup}
                onChange={handleChange}
                rows={8}
                placeholder="کد اسکیما به صورت JSON-LD..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-mono text-xs resize-y leading-relaxed"
              />
              <p className="text-xs text-gray-400 mt-1">کد ساختاریافته JSON-LD جهت نمایش اطلاعات غنی محصول در نتایج جستجوی گوگل.</p>
            </div>
          </div>
        </div>

        {/* Pricing and Stock */}
        {!formData.isWholesaleOnly && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">قیمت و موجودی اصلی</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">قیمت پایه و موجودی انبار محصول را مشخص کنید.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">قیمت (تومان)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
                {variants.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1.5">
                    توجه: این محصول دارای تنوع است. قیمت هر تنوع به صورت مجزا اعمال خواهد شد.
                  </p>
                )}
              </div>
              
              {formData.type === 'physical' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">موجودی در انبار</label>
                  {variants.length > 0 ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={`${variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0).toLocaleString('fa-IR')} عدد`}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-gray-500 dark:text-gray-400 font-bold cursor-not-allowed"
                      />
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                        موجودی کل بر اساس تنوع‌ها: {variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0).toLocaleString('fa-IR')} عدد
                      </p>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        این کالا دارای تنوع است؛ بنابراین موجودی کل محصول از جمع موجودی تنوع‌ها محاسبه می‌شود.
                      </p>
                    </div>
                  ) : (
                    <>
                      <input
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        min="0"
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        این عدد موجودی اصلی محصول است و فقط وقتی تنوع ندارید استفاده می‌شود.
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    تنظیمات تخفیف محصول
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">مبلغ و درصد تخفیف به صورت خودکار با هم هماهنگ می‌شوند</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">مبلغ تخفیف (تومان)</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="discount"
                        value={formData.discount}
                        onChange={handleChange}
                        min="0"
                        placeholder="مثلاً ۵۰,۰۰۰"
                        className="w-full pl-12 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-bold"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">تومان</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">درصد تخفیف (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="discountPercent"
                        value={formData.discountPercent}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        placeholder="مثلاً ۲۰"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-bold"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">٪</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">حداقل تعداد برای تخفیف (عدد)</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="discountMinQty"
                        value={formData.discountMinQty}
                        onChange={handleChange}
                        min="0"
                        placeholder="مثلاً ۱۰ (خالی یعنی بدون حداقل)"
                        className="w-full pl-12 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-bold"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">عدد</span>
                    </div>
                  </div>
                </div>

                {Number(formData.price) > 0 && (
                  <div className="bg-white dark:bg-gray-850 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                      <span>قیمت اصلی: <span className="text-slate-800 dark:text-slate-200 font-black">{(Number(formData.price) || 0).toLocaleString('fa-IR')} تومان</span></span>
                      {Number(formData.discount) > 0 && (
                        <span>تخفیف: <span className="text-red-500 font-black">{(Number(formData.discount) || 0).toLocaleString('fa-IR')} تومان ({formData.discountPercent}٪)</span></span>
                      )}
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400">
                      قیمت نهایی: <span className="text-base font-black">{(Math.max(0, (Number(formData.price) || 0) - (Number(formData.discount) || 0))).toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Variants */}
        <VariantManager
          variants={variants}
          setVariants={setVariants}
          mainPrice={formData.price}
          mainStock={formData.stock}
          imageUrl={formData.imageUrl}
          onPickImage={(index) => {
            setVariantImageIndex(index);
            setShowMediaPickerFor('variant');
          }}
        />

        {/* Product Features */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">ویژگی‌های برجسته</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              این بخش فقط برای معرفی محصول است و قیمت یا موجودی جدا ندارد.
            </p>
          </div>
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">لیست ویژگی‌های کلیدی</label>
            <button type="button" onClick={() => setFeaturesList([...featuresList, {key: '', value: ''}])} className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">+ افزودن ویژگی</button>
          </div>
          <div className="space-y-3">
            {featuresList.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" placeholder="مثال: گارانتی" value={f.key} onChange={(e) => { const l = [...featuresList]; l[i].key = e.target.value; setFeaturesList(l); }} className="w-1/3 px-3 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="مثال: ۱۸ ماهه شرکتی" value={f.value} onChange={(e) => { const l = [...featuresList]; l[i].value = e.target.value; setFeaturesList(l); }} className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setFeaturesList(featuresList.filter((_, idx) => idx !== i))} className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
              </div>
            ))}
            {featuresList.length === 0 && <div className="text-xs text-gray-400">ویژگی برجسته‌ای اضافه نشده است.</div>}
          </div>
        </div>

        {/* Technical Specs */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">مشخصات فنی</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              این بخش برای جدول مشخصات فنی محصول استفاده می‌شود.
            </p>
          </div>
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">جدول مشخصات فنی کالا</label>
            <button type="button" onClick={() => setSpecsList([...specsList, {key: '', value: ''}])} className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">+ افزودن مشخصه</button>
          </div>
          <div className="space-y-3">
            {specsList.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" placeholder="نام، مثال: وزن" value={f.key} onChange={(e) => { const l = [...specsList]; l[i].key = e.target.value; setSpecsList(l); }} className="w-1/3 px-3 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="مقدار، مثال: ۲۰۰ گرم" value={f.value} onChange={(e) => { const l = [...specsList]; l[i].value = e.target.value; setSpecsList(l); }} className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setSpecsList(specsList.filter((_, idx) => idx !== i))} className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
              </div>
            ))}
            {specsList.length === 0 && <div className="text-xs text-gray-400">مشخصه فنی اضافه نشده است.</div>}
          </div>
        </div>

        {/* تنظیمات عمده‌فروشی (B2B) - در صورتی که خرده‌فروشی و عمده‌فروشی ترکیبی باشد */}
        {!formData.isWholesaleOnly && renderWholesaleSettings()}

        {/* Special Deal / Featured Offer */}
        {isFeatureEnabled('specialDeals') && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
              <Flame className="w-5 h-5 text-red-500 fill-red-500/10" />
              تنظیمات پیشنهاد شگفت‌انگیز (ویژه)
            </h2>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="isSpecial"
                    checked={formData.isSpecial}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
                </div>
                <div>
                  <span className="font-bold text-sm text-gray-700 dark:text-gray-300">علامت‌گذاری به عنوان پیشنهاد شگفت‌انگیز روز</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">با فعال‌سازی، این محصول در بخش شگفت‌انگیزهای صفحه اصلی نمایش داده خواهد شد.</p>
                </div>
              </label>

              {formData.isSpecial && (
                <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تاریخ و زمان پایان شمارش معکوس</label>
                  <JalaliDatePicker
                    value={formData.specialEndsAt}
                    onChange={(val) => setFormData(prev => ({ ...prev, specialEndsAt: val }))}
                    required={formData.isSpecial}
                    className="w-full max-w-md"
                  />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">لطفاً تاریخ پایان را انتخاب کنید. پس از این زمان، تایمر پایان یافته و محصول از بخش شگفت‌انگیزها برداشته خواهد شد.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300">محصول در فروشگاه فعال باشد</span>
          </label>
        </div>

      </form>

      {showMediaPickerFor && (
        <MediaPicker
          accepts={(showMediaPickerFor === 'image' || showMediaPickerFor === 'gallery' || showMediaPickerFor === 'fullDescription' || showMediaPickerFor === 'variant') ? 'image/*' : '*/*'}
          title={showMediaPickerFor === 'image' ? 'انتخاب تصویر اصلی' : showMediaPickerFor === 'gallery' ? 'انتخاب تصویر گالری' : showMediaPickerFor === 'fullDescription' ? 'انتخاب تصویر برای توضیحات' : showMediaPickerFor === 'variant' ? 'انتخاب تصویر تنوع' : showMediaPickerFor === 'preview' ? 'انتخاب فایل پیش‌نمایش' : 'انتخاب فایل'}
          onSelect={(url) => {
            if (showMediaPickerFor === 'image') {
              setFormData(prev => ({ ...prev, imageUrl: url }));
            } else if (showMediaPickerFor === 'gallery') {
              setGalleryUrls(prev => [...prev, url]);
            } else if (showMediaPickerFor === 'fullDescription') {
              setFormData(prev => ({ ...prev, fullDescription: prev.fullDescription + `\n<img src="${url}" alt="Product Image" className="w-full max-w-full md:max-w-md mx-auto rounded-xl my-4 object-contain block" />\n` }));
            } else if (showMediaPickerFor === 'variant' && variantImageIndex !== null) {
              const newVariants = [...variants];
              newVariants[variantImageIndex].imageUrl = url;
              setVariants(newVariants);
              setVariantImageIndex(null);
            } else if (showMediaPickerFor === 'preview') {
              setFormData(prev => ({ ...prev, previewUrl: url }));
            } else if (showMediaPickerFor === 'file' && isAddingMultiFile) {
              const filename = url.split('/').pop() || '';
              const format = filename.split('.').pop()?.toUpperCase() || '';
              setDownloadFileList(prev => [...prev, { name: filename.split('-').slice(1).join('-') || filename, url: url, size: '', format: format }]);
              setIsAddingMultiFile(false);
            } else {
              const filename = url.split('/').pop() || '';
              const format = filename.split('.').pop()?.toUpperCase() || '';
              setFormData(prev => ({ ...prev, fileUrl: url, fileFormat: format }));
            }
            setShowMediaPickerFor(null);
          }}
          onClose={() => {
            setShowMediaPickerFor(null);
            setVariantImageIndex(null);
          }}
        />
      )}
    </div>
  );
}