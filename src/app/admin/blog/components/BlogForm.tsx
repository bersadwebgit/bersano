'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Save, 
  ArrowRight, 
  BookOpen, 
  Image as ImageIcon, 
  Tags as TagsIcon, 
  User as UserIcon, 
  Calendar, 
  Eye, 
  Code, 
  Bold, 
  Italic, 
  Link as LinkIcon, 
  Heading2, 
  Heading3, 
  Table as TableIcon, 
  Quote, 
  Check, 
  X,
  Sparkles,
  AlignJustify,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Palette,
  Link2,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import { gregorianToJalali, jalaliToGregorian } from '@/lib/jalali';

type BlogCategory = {
  id: string;
  name: string;
};

type PostData = {
  id?: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  featuredImage: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  publishedAt: string;
  authorId: string;
  authorName: string;
  categoryId: string;
  tags: string[]; // array of strings on frontend
  faqs?: { question: string; answer: string }[]; // Q&A list
  seoTitle: string;
  seoDescription: string;
  seoSlug: string;
  ogImage: string;
  allowComments: boolean;
};

interface BlogFormProps {
  initialData?: PostData;
  isEdit?: boolean;
}

export default function BlogForm({ initialData, isEdit = false }: BlogFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorView, setEditorView] = useState<'visual' | 'code'>('visual');
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Media Picker states
  const [showMediaPickerFor, setShowMediaPickerFor] = useState<'featuredImage' | 'ogImage' | 'editor' | null>(null);

  // --- BLOG AI ASSISTANT & CHUNKED GENERATOR STATES ---
  const [products, setProducts] = useState<{ id: string; title: string; brand: string | null; price: number }[]>([]);
  const [aiMode, setAiMode] = useState<'prompt' | 'product'>('prompt');
  
  // Settings & Prompts
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (initialData?.tags && Array.isArray(initialData.tags)) {
      const prodTag = initialData.tags.find((tag: string) => tag.startsWith('_prod_'));
      if (prodTag) {
        return prodTag.replace('_prod_', '');
      }
    }
    return '';
  });
  const [brandPersonalization, setBrandPersonalization] = useState(true);
  const [linkRelatedProducts, setLinkRelatedProducts] = useState(true);
  const [preferredLength, setPreferredLength] = useState<'short' | 'medium' | 'long'>('short');
  const [selectedFields, setSelectedFields] = useState<string[]>(['title', 'content', 'summary', 'seoTitle', 'seoDescription', 'tags', 'faqs']);

  // Dynamic Chunked Generation States
  const [generationActive, setGenerationActive] = useState(false);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generatingSection, setGeneratingSection] = useState(false);
  const [autoContinue, setAutoContinue] = useState(true);
  
  const [outline, setOutline] = useState<{
    title: string;
    sections: { id: string; title: string; words: number; status: 'pending' | 'writing' | 'completed' }[];
  } | null>(null);
  
  const [styleFingerprint, setStyleFingerprint] = useState<string>('');
  const [generatedChunks, setGeneratedChunks] = useState<string[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [lastParagraphs, setLastParagraphs] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [aiError, setAiError] = useState('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  
  // Inline individual field generation loading
  const [generatingField, setGeneratingField] = useState<Record<string, boolean>>({});

  // Product Link & SEO suggestion states
  const [productDetails, setProductDetails] = useState<any>(null);
  const [isLinkAdded, setIsLinkAdded] = useState(false);
  const [updatingProduct, setUpdatingProduct] = useState(false);

  // Form State
  const [formData, setFormData] = useState<PostData>(() => {
    const data = initialData ? {
      ...initialData,
      faqs: initialData.faqs || []
    } : {
      title: '',
      slug: '',
      content: '',
      summary: '',
      featuredImage: '',
      status: 'draft' as const,
      publishedAt: new Date().toISOString().slice(0, 16), // format for datetime-local input
      authorId: '',
      authorName: '',
      categoryId: '',
      tags: [],
      faqs: [],
      seoTitle: '',
      seoDescription: '',
      seoSlug: '',
      ogImage: '',
      allowComments: true,
    };
    if (data.tags) {
      data.tags = data.tags.filter(tag => !tag.startsWith('_prod_'));
    }
    return data;
  });

  // Tag Input State
  const [tagInput, setTagInput] = useState('');
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Shamsi DateTime States
  const [shamsiYear, setShamsiYear] = useState<number>(1405);
  const [shamsiMonth, setShamsiMonth] = useState<number>(3); // Khordad (3)
  const [shamsiDay, setShamsiDay] = useState<number>(9);
  const [shamsiHour, setShamsiHour] = useState<number>(12);
  const [shamsiMinute, setShamsiMinute] = useState<number>(0);

  // Synchronize Shamsi parts on load/initialData load
  useEffect(() => {
    if (formData.publishedAt) {
      try {
        const d = new Date(formData.publishedAt);
        if (!isNaN(d.getTime())) {
          const { jy, jm, jd } = gregorianToJalali(d);
          setShamsiYear(jy);
          setShamsiMonth(jm);
          setShamsiDay(jd);
          setShamsiHour(d.getHours());
          setShamsiMinute(d.getMinutes());
        }
      } catch (e) {
        console.error('Error parsing date to shamsi', e);
      }
    }
  }, [formData.publishedAt]);

  const handleShamsiDateChange = (year: number, month: number, day: number, hour: number, minute: number) => {
    setShamsiYear(year);
    setShamsiMonth(month);
    setShamsiDay(day);
    setShamsiHour(hour);
    setShamsiMinute(minute);

    try {
      const gDate = jalaliToGregorian(year, month, day);
      gDate.setHours(hour);
      gDate.setMinutes(minute);
      gDate.setSeconds(0);
      gDate.setMilliseconds(0);
      
      const isoStr = gDate.toISOString().slice(0, 16);
      setFormData(prev => ({
        ...prev,
        publishedAt: isoStr
      }));
    } catch (e) {
      console.error('Error converting shamsi to gregorian', e);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Fetch product details for SEO link recommendation
  useEffect(() => {
    if (selectedProductId) {
      const fetchProductDetails = async () => {
        try {
          const res = await fetch(`/api/admin/products/${selectedProductId}`);
          if (res.ok) {
            const data = await res.json();
            setProductDetails(data.product);
            
            // Check if fullDescription contains the article link
            const linkPattern = `/blog/${formData.slug}`;
            if (data.product && data.product.fullDescription && data.product.fullDescription.includes(linkPattern)) {
              setIsLinkAdded(true);
            } else {
              setIsLinkAdded(false);
            }
          }
        } catch (error) {
          console.error('Error fetching product details:', error);
        }
      };
      fetchProductDetails();
    } else {
      setProductDetails(null);
      setIsLinkAdded(false);
    }
  }, [selectedProductId, formData.slug]);

  const handleAddLinkToProductDescription = async () => {
    if (!selectedProductId || !productDetails || !formData.slug) return;
    
    setUpdatingProduct(true);
    try {
      // Build a beautifully-styled card for the blog post link
      const articleUrl = `/blog/${formData.slug}`;
      const articleTitle = formData.title || 'مقاله معرفی محصول';
      
      const linkCardHtml = `
<p><br /></p>
<div class="my-6 p-5 bg-blue-50 dark:bg-blue-950/20 border-r-4 border-blue-500 rounded-2xl flex items-center justify-between gap-4" contenteditable="false">
  <div class="space-y-1">
    <span class="text-[10px] text-blue-500 font-bold block">پیشنهاد مطالعه</span>
    <a href="${articleUrl}" target="_blank" class="text-xs font-black text-slate-800 dark:text-white hover:text-blue-600 transition-colors">${articleTitle}</a>
  </div>
  <a href="${articleUrl}" target="_blank" class="flex-shrink-0 bg-blue-600 hover:bg-blue-750 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all">مطالعه مقاله</a>
</div>
<p><br /></p>`;

      const updatedDescription = (productDetails.fullDescription || '') + linkCardHtml;

      const res = await fetch(`/api/admin/products/${selectedProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productDetails,
          fullDescription: updatedDescription
        })
      });

      if (res.ok) {
        setIsLinkAdded(true);
        // Refresh product details state
        setProductDetails((prev: any) => prev ? { ...prev, fullDescription: updatedDescription } : null);
        alert('لینک مقاله با موفقیت و به زیبایی به توضیحات محصول اضافه شد.');
      } else {
        const errData = await res.json();
        alert(errData.error || 'خطا در بروزرسانی توضیحات محصول.');
      }
    } catch (error) {
      console.error('Error adding link to product description:', error);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setUpdatingProduct(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  function markdownToHtml(markdown: string): string {
    if (!markdown) return '';
    let html = markdown;
    
    // Windows carriage returns
    html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Headings
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    
    // Simple blockquote
    html = html.replace(/^>\s+(.*?)$/gm, '<blockquote>$1</blockquote>');
    
    // Lists (approximate)
    html = html.replace(/^\s*[-*]\s+(.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
    // Deduplicate nested ul
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    
    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraphs
    const blocks = html.split(/\n\n+/);
    const processedBlocks = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<li') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<div')) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    });
    
    return processedBlocks.filter(Boolean).join('\n');
  }

  const startChunkedGeneration = async () => {
    if (aiMode === 'prompt' && !aiPrompt.trim()) {
      setAiError('لطفاً موضوع یا دستور کار را وارد کنید.');
      return;
    }
    if (aiMode === 'product' && !selectedProductId) {
      setAiError('لطفاً یک محصول را انتخاب کنید.');
      return;
    }

    setGenerationActive(true);
    setGeneratingOutline(true);
    setAiError('');
    setAiWarnings([]);
    setOutline(null);
    setGeneratedChunks([]);
    setCurrentSectionIndex(0);
    setStyleFingerprint('');
    setLastParagraphs('');
    setProgressPercentage(5);

    try {
      const res = await fetch('/api/admin/blog/generate-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'outline',
          aiMode,
          prompt: aiPrompt,
          productId: selectedProductId,
          brandPersonalization,
          linkRelatedProducts,
          preferredLength,
          fields: selectedFields
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در برقراری ارتباط با هوش مصنوعی.');
      }

      if (data.success && data.outline) {
        setOutline(data.outline);
        setAiWarnings(data.warnings || []);
        setGeneratingOutline(false);
        setProgressPercentage(15);
        
        // Immediately trigger generation of the first section if autoContinue is enabled
        if (autoContinue) {
          await generateSection(0, data.outline, [], '', '');
        }
      } else {
        throw new Error(data.error || 'تولید ساختار مقاله ناموفق بود.');
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'خطایی در پردازش دستور هوش مصنوعی رخ داد.');
      setGenerationActive(false);
      setGeneratingOutline(false);
    }
  };

  const generateSection = async (
    index: number,
    currentOutline: any,
    currentChunks: string[],
    fingerprint: string,
    lastParas: string,
    attempt: number = 1
  ) => {
    if (!currentOutline || !currentOutline.sections || index >= currentOutline.sections.length) {
      setGenerationActive(false);
      setProgressPercentage(100);
      return;
    }

    setGeneratingSection(true);
    setCurrentSectionIndex(index);
    setAiError('');

    // Update section status to writing
    setOutline(prev => {
      if (!prev) return prev;
      const updatedSections = prev.sections.map((sec, sIdx) => {
        if (sIdx === index) return { ...sec, status: 'writing' as const };
        return sec;
      });
      return { ...prev, sections: updatedSections };
    });

    try {
      const res = await fetch('/api/admin/blog/generate-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_section',
          aiMode,
          prompt: aiPrompt,
          productId: selectedProductId,
          outline: currentOutline,
          sectionIndex: index,
          styleFingerprint: fingerprint,
          lastParagraphs: lastParas,
          previousChunks: currentChunks,
          brandPersonalization,
          linkRelatedProducts,
          fields: selectedFields
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در تولید بخش محتوای هوش مصنوعی.');
      }

      if (data.success && data.sectionContent) {
        const newChunks = [...currentChunks, data.sectionContent];
        setGeneratedChunks(newChunks);
        
        const newFingerprint = data.styleFingerprint || fingerprint;
        const newLastParagraphs = data.lastParagraphs || '';
        
        setStyleFingerprint(newFingerprint);
        setLastParagraphs(newLastParagraphs);

        // Update outline sections status to completed
        setOutline(prev => {
          if (!prev) return prev;
          const updatedSections = prev.sections.map((sec, sIdx) => {
            if (sIdx === index) return { ...sec, status: 'completed' as const };
            return sec;
          });
          return { ...prev, sections: updatedSections };
        });

        // Set compiled content
        const rawContent = newChunks.join('\n\n');
        const htmlContent = markdownToHtml(rawContent);
        
        setFormData(prev => {
          const updated = {
            ...prev,
            content: htmlContent
          };

          // If there is metadata generated (like title, summary, seo, tags, faqs)
          if (data.metadata) {
            if (data.metadata.title && selectedFields.includes('title')) updated.title = data.metadata.title;
            if (data.metadata.summary && selectedFields.includes('summary')) updated.summary = data.metadata.summary;
            if (data.metadata.seoTitle && selectedFields.includes('seoTitle')) updated.seoTitle = data.metadata.seoTitle;
            if (data.metadata.seoDescription && selectedFields.includes('seoDescription')) updated.seoDescription = data.metadata.seoDescription;
            if (data.metadata.tags && selectedFields.includes('tags')) updated.tags = data.metadata.tags;
            if (data.metadata.faqs && selectedFields.includes('faqs')) updated.faqs = data.metadata.faqs;
            if (data.metadata.categoryId && !prev.categoryId) updated.categoryId = data.metadata.categoryId;
            if (data.metadata.slug) {
              updated.slug = data.metadata.slug;
              updated.seoSlug = data.metadata.slug;
            }
          }
          return updated;
        });

        const nextIndex = index + 1;
        const pct = Math.min(95, Math.round(15 + (nextIndex) * (85 / currentOutline.sections.length)));
        setProgressPercentage(pct);

        setGeneratingSection(false);

        if (nextIndex < currentOutline.sections.length) {
          setCurrentSectionIndex(nextIndex);
          if (autoContinue) {
            await generateSection(nextIndex, currentOutline, newChunks, newFingerprint, newLastParagraphs);
          }
        } else {
          // Finished completely!
          setGenerationActive(false);
          setProgressPercentage(100);
        }
      } else {
        throw new Error(data.error || 'پاسخ هوش مصنوعی معتبر نبود.');
      }
    } catch (err: any) {
      console.error(`Attempt ${attempt} failed for section ${index + 1}:`, err);
      
      if (attempt < 3) {
        // Wait 1.5 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 1500));
        await generateSection(index, currentOutline, currentChunks, fingerprint, lastParas, attempt + 1);
        return;
      }

      setAiError(err.message || 'خطا در حین تولید بخش محتوا.');
      setGeneratingSection(false);
      
      // Revert status of current section to pending
      setOutline(prev => {
        if (!prev) return prev;
        const updatedSections = prev.sections.map((sec, sIdx) => {
          if (sIdx === index) return { ...sec, status: 'pending' as const };
          return sec;
        });
        return { ...prev, sections: updatedSections };
      });
    }
  };

  const handleContinueWriting = async () => {
    if (!outline) return;
    await generateSection(currentSectionIndex, outline, generatedChunks, styleFingerprint, lastParagraphs);
  };

  const generateSingleField = async (field: string) => {
    setGeneratingField(prev => ({ ...prev, [field]: true }));
    setAiError('');
    try {
      const res = await fetch('/api/admin/blog/generate-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_single_field',
          field,
          aiMode,
          prompt: aiPrompt || formData.title || 'مقاله',
          productId: selectedProductId,
          currentData: {
            title: formData.title,
            summary: formData.summary,
            content: formData.content,
            seoTitle: formData.seoTitle,
            seoDescription: formData.seoDescription,
            tags: formData.tags
          },
          brandPersonalization
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در تولید مقدار فیلد.');

      if (data.success && data.value !== undefined) {
        setFormData(prev => {
          const updated = { ...prev };
          if (field === 'title') {
            updated.title = data.value;
            if (!prev.slug) {
              updated.slug = data.value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\u0600-\u06FF-]/g, '');
              updated.seoSlug = updated.slug;
            }
          }
          else if (field === 'summary') updated.summary = data.value;
          else if (field === 'content') updated.content = markdownToHtml(data.value);
          else if (field === 'seoTitle') updated.seoTitle = data.value;
          else if (field === 'seoDescription') updated.seoDescription = data.value;
          else if (field === 'tags') updated.tags = data.value;
          else if (field === 'faqs') updated.faqs = data.value;
          return updated;
        });
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || `خطا در تولید فیلد ${field}`);
    } finally {
      setGeneratingField(prev => ({ ...prev, [field]: false }));
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/blog/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleBlur = () => {
    if (!formData.slug && formData.title) {
      const generatedSlug = formData.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u0600-\u06FF-]/g, ''); // alphanumeric, hyphens, and Persian chars
      setFormData(prev => ({
        ...prev,
        slug: generatedSlug,
        seoTitle: prev.seoTitle || formData.title,
        seoSlug: prev.seoSlug || generatedSlug
      }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content to innerHTML when editorView shifts, loading finishes, or content updates from outside
  useEffect(() => {
    if (editorRef.current && editorView === 'visual') {
      if (editorRef.current.innerHTML !== formData.content) {
        editorRef.current.innerHTML = formData.content;
      }
    }
  }, [editorView, loading, formData.content]);

  const handleVisualInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setFormData(prev => ({ ...prev, content: html }));
    }
  };

  // Custom rich text formatting helper
  const insertFormatting = (tagOpen: string, tagClose: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = tagOpen + selectedText + tagClose;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setFormData(prev => ({ ...prev, content: newContent }));

    // Refocus textarea and select inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selectedText.length);
    }, 0);
  };

  const handleFormat = (command: string, value: string = '') => {
    if (editorView === 'visual') {
      if (editorRef.current) {
        editorRef.current.focus();
        
        if (command === 'heading2') {
          document.execCommand('formatBlock', false, 'H2');
          // Add custom Tailwind classes to newly created H2
          const selection = window.getSelection();
          if (selection && selection.anchorNode) {
            let parent = selection.anchorNode.parentElement;
            if (parent && parent.tagName === 'H2') {
              parent.className = 'text-lg font-black text-slate-800 dark:text-white mt-6 mb-3';
            }
          }
        } else if (command === 'heading3') {
          document.execCommand('formatBlock', false, 'H3');
          const selection = window.getSelection();
          if (selection && selection.anchorNode) {
            let parent = selection.anchorNode.parentElement;
            if (parent && parent.tagName === 'H3') {
              parent.className = 'text-base font-black text-slate-800 dark:text-white mt-4 mb-2';
            }
          }
        } else if (command === 'relatedLink') {
          const url = prompt('لینک آدرس اینترنتی را وارد کنید:');
          if (url) {
            const title = prompt('عنوان متن لینک مرتبط را وارد کنید:');
            if (title) {
              const cardHtml = `<div class="my-6 p-5 bg-blue-50 dark:bg-blue-950/20 border-r-4 border-blue-500 rounded-2xl flex items-center justify-between gap-4 not-prose" contenteditable="false">
  <div class="space-y-1">
    <span class="text-[10px] text-blue-500 font-bold block">پیشنهاد مطالعه</span>
    <a href="${url}" target="_blank" class="text-xs font-black text-slate-800 dark:text-white hover:text-blue-600 transition-colors">${title}</a>
  </div>
  <a href="${url}" target="_blank" class="flex-shrink-0 bg-blue-600 hover:bg-blue-750 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all">مشاهده</a>
</div><p><br></p>`;
              document.execCommand('insertHTML', false, cardHtml);
            }
          }
        } else if (command === 'createLink') {
          const url = prompt('لینک آدرس اینترنتی را وارد کنید:');
          if (url) {
            document.execCommand('createLink', false, url);
            // Apply standard classes to link
            const selection = window.getSelection();
            if (selection && selection.anchorNode) {
              let parent = selection.anchorNode.parentElement;
              if (parent && parent.tagName === 'A') {
                parent.className = 'text-blue-500 hover:underline';
                parent.setAttribute('target', '_blank');
              }
            }
          }
        } else {
          document.execCommand(command, false, value);
        }
        
        handleVisualInput();
      }
    } else {
      // Code view fallback
      if (command === 'bold') insertFormatting('<strong>', '</strong>');
      else if (command === 'italic') insertFormatting('<em>', '</em>');
      else if (command === 'heading2') insertFormatting('<h2 class="text-lg font-black text-slate-800 dark:text-white mt-6 mb-3">', '</h2>');
      else if (command === 'heading3') insertFormatting('<h3 class="text-base font-black text-slate-800 dark:text-white mt-4 mb-2">', '</h3>');
      else if (command === 'justifyFull') insertFormatting('<div style="text-align: justify;">', '</div>');
      else if (command === 'justifyRight') insertFormatting('<div style="text-align: right;">', '</div>');
      else if (command === 'justifyCenter') insertFormatting('<div style="text-align: center;">', '</div>');
      else if (command === 'justifyLeft') insertFormatting('<div style="text-align: left;">', '</div>');
      else if (command === 'foreColor') insertFormatting(`<span style="color: ${value};">`, '</span>');
      else if (command === 'createLink') {
        const url = prompt('لینک آدرس اینترنتی را وارد کنید:');
        if (url) insertFormatting(`<a href="${url}" target="_blank" class="text-blue-500 hover:underline">`, '</a>');
      }
      else if (command === 'relatedLink') {
        const url = prompt('لینک آدرس اینترنتی را وارد کنید:');
        if (url) {
          const title = prompt('عنوان متن لینک مرتبط را وارد کنید:');
          if (title) {
            const cardHtml = `<div class="my-6 p-5 bg-blue-50 dark:bg-blue-950/20 border-r-4 border-blue-500 rounded-2xl flex items-center justify-between gap-4 not-prose" contenteditable="false">
  <div class="space-y-1">
    <span class="text-[10px] text-blue-500 font-bold block">پیشنهاد مطالعه</span>
    <a href="${url}" target="_blank" class="text-xs font-black text-slate-800 dark:text-white hover:text-blue-600 transition-colors">${title}</a>
  </div>
  <a href="${url}" target="_blank" class="flex-shrink-0 bg-blue-600 hover:bg-blue-750 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all">مشاهده</a>
</div>`;
            insertFormatting(cardHtml, '');
          }
        }
      }
      else if (command === 'blockquote') insertFormatting('<blockquote class="border-r-4 border-blue-500 pr-4 pl-2 py-1 text-slate-500 my-6 font-medium italic">« ', ' »</blockquote>');
      else if (command === 'code') insertFormatting('<pre class="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-left my-6" dir="ltr"><code>', '</code></pre>');
      else if (command === 'table') insertFormatting('<div class="overflow-x-auto my-6"><table class="w-full text-right border-collapse border border-slate-200"><thead><tr class="bg-slate-50"><th class="border border-slate-200 px-4 py-2">ستون ۱</th><th class="border border-slate-200 px-4 py-2">ستون ۲</th></tr></thead><tbody><tr><td class="border border-slate-200 px-4 py-2">داده ۱</td><td class="border border-slate-200 px-4 py-2">داده ۲</td></tr></tbody></table></div>', '');
    }
  };

  // Media selection callback
  const handleMediaSelect = (url: string) => {
    if (showMediaPickerFor === 'featuredImage') {
      setFormData(prev => ({ ...prev, featuredImage: url }));
    } else if (showMediaPickerFor === 'ogImage') {
      setFormData(prev => ({ ...prev, ogImage: url }));
    } else if (showMediaPickerFor === 'editor') {
      const imgTag = `<img src="${url}" alt="تصویر مطلب" class="rounded-2xl max-w-full my-6 shadow-md mx-auto" />`;
      if (editorView === 'visual') {
        if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand('insertHTML', false, imgTag);
          handleVisualInput();
        }
      } else {
        insertFormatting(imgTag, '');
      }
    }
    setShowMediaPickerFor(null);
  };

  // Tags handling
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/,/g, '');
      if (cleanTag && !formData.tags.includes(cleanTag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, cleanTag] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove),
    }));
  };

  // FAQ Q&A list handling
  const handleAddFaq = () => {
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      alert('لطفاً هم پرسش و هم پاسخ را وارد کنید.');
      return;
    }

    const currentFaqs = formData.faqs || [];
    if (editingFaqIndex !== null) {
      const updatedFaqs = [...currentFaqs];
      updatedFaqs[editingFaqIndex] = { question: faqQuestion.trim(), answer: faqAnswer.trim() };
      setFormData(prev => ({ ...prev, faqs: updatedFaqs }));
      setEditingFaqIndex(null);
    } else {
      setFormData(prev => ({
        ...prev,
        faqs: [...(prev.faqs || []), { question: faqQuestion.trim(), answer: faqAnswer.trim() }]
      }));
    }

    setFaqQuestion('');
    setFaqAnswer('');
  };

  const handleEditFaq = (index: number) => {
    const currentFaqs = formData.faqs || [];
    const faq = currentFaqs[index];
    if (faq) {
      setFaqQuestion(faq.question);
      setFaqAnswer(faq.answer);
      setEditingFaqIndex(index);
    }
  };

  const handleRemoveFaq = (index: number) => {
    const currentFaqs = formData.faqs || [];
    setFormData(prev => ({
      ...prev,
      faqs: currentFaqs.filter((_, i) => i !== index)
    }));
    if (editingFaqIndex === index) {
      setEditingFaqIndex(null);
      setFaqQuestion('');
      setFaqAnswer('');
    }
  };

  const handleCancelEditFaq = () => {
    setEditingFaqIndex(null);
    setFaqQuestion('');
    setFaqAnswer('');
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.slug || !formData.content) {
      alert('لطفاً عنوان، آدرس مطلب (Slug) و محتوا را وارد کنید.');
      return;
    }

    setSaving(true);
    try {
      const url = isEdit 
        ? `/api/admin/blog/posts/${initialData?.id}`
        : '/api/admin/blog/posts';
      const method = isEdit ? 'PUT' : 'POST';

      // Inject hidden _prod_ tag if product is selected
      const filteredTags = formData.tags.filter(tag => !tag.startsWith('_prod_'));
      const finalTags = [...filteredTags];
      if (selectedProductId) {
        finalTags.push(`_prod_${selectedProductId}`);
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: finalTags,
          // If status is scheduled, and publish date is past, make it published!
          status: formData.status === 'scheduled' && new Date(formData.publishedAt) <= new Date() 
            ? 'published' 
            : formData.status,
        })
      });

      if (res.ok) {
        alert(isEdit ? 'مطلب با موفقیت بروزرسانی شد.' : 'مطلب با موفقیت منتشر/ذخیره شد.');
        router.push('/admin/blog');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در ثبت مطلب.');
      }
    } catch (err) {
      console.error('Error submitting post:', err);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs font-bold text-slate-400">در حال بارگذاری فرم...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 select-none text-right" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600/[0.07] via-indigo-600/[0.03] to-transparent dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-transparent rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/admin/blog" className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-sm">
            <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              {isEdit ? 'ویرایش مطلب وبلاگ' : 'ایجاد مطلب جدید وبلاگ'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">محتوای مطلب را بنویسید، تگ‌ها و دسته‌بندی را مشخص کنید و تنظیمات سئو را تکمیل کنید</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
        >
          <Save className="w-4 h-4" />
          {saving ? 'در حال ذخیره...' : 'ذخیره و ثبت نهایی'}
        </button>
      </div>

      {/* SEO Link Recommendation Banner */}
      {selectedProductId && productDetails && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200/50 dark:border-emerald-800/20 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-md shadow-emerald-500/10 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400">پیشنهاد بهبود سئو (SEO Link Building)</h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-450 leading-relaxed font-bold">
                این مقاله برای محصول <strong className="text-slate-800 dark:text-white font-black">«{productDetails.title}»</strong> نوشته شده است. برای بهبود سئوی داخلی و کسب رتبه بهتر در موتورهای جستجو، پیشنهاد می‌کنیم لینک این مقاله را به بخش توضیحات محصول اضافه کنید.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {isLinkAdded ? (
              <span className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl text-[10px] font-black">
                <Check className="w-3.5 h-3.5" />
                لینک مقاله در توضیحات محصول قرار دارد
              </span>
            ) : (
              <button
                type="button"
                disabled={updatingProduct || !formData.slug}
                onClick={handleAddLinkToProductDescription}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              >
                {updatingProduct ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    در حال افزودن...
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    افزودن لینک به توضیحات محصول
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form Editor (Span 2) */}
        <div className="lg:col-span-2 space-y-6">

          {/* --- ADVANCED AI BLOG ASSISTANT PANEL --- */}
          <div className="bg-gradient-to-tr from-indigo-50/50 via-purple-50/30 to-white dark:from-indigo-950/10 dark:via-purple-950/5 dark:to-slate-900 border border-indigo-100/80 dark:border-indigo-900/30 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">دستیار هوشمند تولید مقاله (کنترل با پرامپت و محصول)</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold">تولید مرحله‌به‌مرحله مقالات فوق‌العاده باکیفیت، سئو شده و هماهنگ با برند شما</p>
                </div>
              </div>
              
              {/* Mode Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAiMode('prompt')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    aiMode === 'prompt'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  تولید با پرامپت / موضوع
                </button>
                <button
                  type="button"
                  onClick={() => setAiMode('product')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    aiMode === 'product'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  تولید مقاله از محصول
                </button>
              </div>
            </div>

            {/* Main Input Section */}
            <div className="space-y-4">
              {aiMode === 'prompt' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300">موضوع یا دستورالعمل مقاله</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="مثال: یک مقاله جامع درباره «راهنمای خرید لباس زمستانه برای کودکان» بنویس که بر روی جنس پارچه و راحتی تمرکز داشته باشد..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/25 transition-all"
                    disabled={generationActive}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300">انتخاب محصول هدف</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/25 transition-all"
                    disabled={generationActive}
                  >
                    <option value="">-- یک محصول را انتخاب کنید --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.brand ? `(${p.brand})` : ''} - {p.price.toLocaleString('fa-IR')} تومان
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-slate-400 font-bold">هوش مصنوعی مشخصات، ویژگی‌ها و توضیحات محصول را تحلیل کرده و یک مقاله سئو شده کامل برای آن تولید می‌کند.</p>
                </div>
              )}

              {/* Advanced Options */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={brandPersonalization}
                      onChange={(e) => setBrandPersonalization(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-200 rounded-sm focus:ring-indigo-500"
                      disabled={generationActive}
                    />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">حفظ هویت و لحن برند فروشگاه</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkRelatedProducts}
                      onChange={(e) => setLinkRelatedProducts(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-200 rounded-sm focus:ring-indigo-500"
                      disabled={generationActive}
                    />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">لینک‌دهی خودکار به محصولات مرتبط</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoContinue}
                      onChange={(e) => setAutoContinue(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-200 rounded-sm focus:ring-indigo-500"
                      disabled={generationActive}
                    />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">تولید خودکار و پیوسته بخش‌ها (Auto-Continue)</span>
                  </label>
                </div>

                {/* Article Length Selection */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block">طول مقاله تولیدی:</span>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {[
                      { key: 'short', label: 'کوتاه (حدود ۵۰۰ تا ۸۰۰ کلمه) - پیش‌فرض' },
                      { key: 'medium', label: 'متوسط (حدود ۱۰۰۰ تا ۱۵۰۰ کلمه)' },
                      { key: 'long', label: 'بلند (حدود ۲۰۰۰ تا ۳۰۰۰ کلمه)' }
                    ].map(l => (
                      <label key={l.key} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="preferredLength"
                          value={l.key}
                          checked={preferredLength === l.key}
                          onChange={() => setPreferredLength(l.key as 'short' | 'medium' | 'long')}
                          className="w-4 h-4 text-indigo-600 border-slate-200 focus:ring-indigo-500"
                          disabled={generationActive}
                        />
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{l.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fields to Generate */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block">بخش‌هایی که مایلید هوش مصنوعی تولید کند:</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {[
                      { key: 'title', label: 'عنوان مقاله' },
                      { key: 'content', label: 'محتوای کامل (بدنه)' },
                      { key: 'summary', label: 'خلاصه کوتاه' },
                      { key: 'seoTitle', label: 'عنوان سئو' },
                      { key: 'seoDescription', label: 'توضیحات سئو' },
                      { key: 'tags', label: 'برچسب‌ها' },
                      { key: 'faqs', label: 'سوالات متداول (FAQ)' }
                    ].map(f => (
                      <label key={f.key} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(f.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFields(prev => [...prev, f.key]);
                            } else {
                              setSelectedFields(prev => prev.filter(x => x !== f.key));
                            }
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 border-slate-200 rounded-xs focus:ring-indigo-500"
                          disabled={generationActive}
                        />
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              {!generationActive && !outline && (
                <button
                  type="button"
                  onClick={startChunkedGeneration}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-2xl transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  شروع تولید هوشمند مقاله (Outline + Chunked Generation)
                </button>
              )}
            </div>

            {/* Active Generation Progress & Outline Visualization */}
            {(generationActive || outline) && (
              <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {generatingOutline || generatingSection ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {generatingOutline ? 'در حال طراحی ساختار مقاله (Outline)...' : ''}
                      {generatingSection ? `در حال نگارش بخش ${currentSectionIndex + 1} از ${outline?.sections.length || 0}...` : ''}
                      {!generatingOutline && !generatingSection ? 'تولید مقاله با موفقیت متوقف یا تکمیل شد.' : ''}
                    </span>
                  </div>
                  <span className="text-xs font-black text-indigo-600">{progressPercentage}٪</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>

                {/* Outline Sections List */}
                {outline && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block">ساختار مقاله طراحی شده (Outline):</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {outline.sections.map((sec, idx) => (
                        <div
                          key={sec.id}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 transition-all ${
                            sec.status === 'completed'
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : sec.status === 'writing'
                              ? 'bg-indigo-500/5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 animate-pulse'
                              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="block font-black text-[10px]">بخش {idx + 1}: {sec.title}</span>
                            <span className="block text-[8px] opacity-70">حدود {sec.words} کلمه</span>
                          </div>
                          <div className="shrink-0">
                            {sec.status === 'completed' && <Check className="w-4 h-4 text-emerald-500" />}
                            {sec.status === 'writing' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
                            {sec.status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-300 block"></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Control Actions during pause or completed */}
                {!generatingOutline && !generatingSection && outline && (
                  <div className="flex gap-2 pt-2 justify-end">
                    {currentSectionIndex < outline.sections.length ? (
                      <button
                        type="button"
                        onClick={handleContinueWriting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        ادامه نوشتن بخش بعدی ({outline.sections[currentSectionIndex].title})
                      </button>
                    ) : (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg">
                        تولید مقاله به طور کامل پایان یافت! فیلدهای فرم با مقادیر جدید پر شدند.
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setOutline(null);
                        setGenerationActive(false);
                      }}
                      className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black cursor-pointer transition-all"
                    >
                      توقف و ویرایش دستی
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error & Warnings Display */}
            {aiError && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block font-black">خطا در تولید محتوا:</span>
                  <p className="text-[10px] leading-relaxed font-bold">{aiError}</p>
                </div>
              </div>
            )}

            {aiWarnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 p-4 rounded-2xl text-xs font-bold border border-amber-100 dark:border-amber-900/30 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-black">هشدارهای هوش مصنوعی:</span>
                </div>
                <ul className="list-disc pr-5 text-[10px] space-y-1 font-bold">
                  {aiWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Post Content Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400">عنوان مطلب <span className="text-rose-500">*</span></label>
              <input 
                type="text"
                required
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                onBlur={handleTitleBlur}
                placeholder="عنوان جذاب مقاله خود را وارد کنید..."
                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 text-sm font-black text-slate-800 dark:text-white border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
              />
            </div>

            {/* Custom URL Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400">آدرس مطلب (Slug) <span className="text-rose-500">*</span></label>
              <input 
                type="text"
                required
                name="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().trim().replace(/\s+/g, '-') }))}
                placeholder="slug-of-the-post"
                className="w-full text-left px-5 py-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                dir="ltr"
              />
              <span className="text-[10px] text-slate-400 font-medium block">آدرس نهایی مطلب: yourshop.com/blog/{"{"}slug{"}"}</span>
            </div>

            {/* Tabs for Editor/Preview */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 gap-4">
              <button
                type="button"
                onClick={() => setEditorView('visual')}
                className={`pb-2.5 text-xs font-black transition-all border-b-2 px-2 flex items-center gap-1.5 ${
                  editorView === 'visual' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Eye className="w-4 h-4" />
                ویرایشگر بصری (پیش‌فرض)
              </button>
              <button
                type="button"
                onClick={() => setEditorView('code')}
                className={`pb-2.5 text-xs font-black transition-all border-b-2 px-2 flex items-center gap-1.5 ${
                  editorView === 'code' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Code className="w-4 h-4" />
                نمایش کد HTML
              </button>
            </div>

            {/* Editor Content */}
            <div className="space-y-3">
              {/* Custom Rich Text Toolbar */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-750">
                <button
                  type="button"
                  onClick={() => handleFormat('bold')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="بولد"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('italic')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="ایتالیک"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('createLink')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="افزودن لینک"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('relatedLink')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all font-black text-[10px] flex items-center gap-1 border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400"
                  title="درج باکس لینک مرتبط زیبا"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  لینک مرتبط
                </button>
                <button
                  type="button"
                  onClick={() => setShowMediaPickerFor('editor')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="درج تصویر از گالری"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
                
                <span className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center mx-1" />
                
                <button
                  type="button"
                  onClick={() => handleFormat('heading2')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="تیتر اصلی"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('heading3')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="تیتر فرعی"
                >
                  <Heading3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('blockquote')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="نقل قول"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('code')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="بلوک کد"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('table')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="جدول"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                
                <span className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center mx-1" />
                
                {/* Text Alignments */}
                <button
                  type="button"
                  onClick={() => handleFormat('justifyRight')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="راست‌چین"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('justifyCenter')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="وسط‌چین"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('justifyLeft')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                  title="چپ‌چین"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat('justifyFull')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all bg-indigo-500/5 text-indigo-500 border border-indigo-500/10"
                  title="یکدست کردن متن (تراز دوطرفه)"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center mx-1" />

                {/* Text Color Selector */}
                <div className="relative flex items-center gap-1.5 px-2 bg-slate-100/50 dark:bg-slate-750 rounded-xl py-0.5">
                  <Palette className="w-3.5 h-3.5 text-slate-500" />
                  <div className="flex gap-1">
                    {[
                      { hex: '#1E293B', title: 'پیش‌فرض' },
                      { hex: '#EF4444', title: 'قرمز' },
                      { hex: '#3B82F6', title: 'آبی' },
                      { hex: '#10B981', title: 'سبز' },
                      { hex: '#F59E0B', title: 'نارنجی' },
                      { hex: '#8B5CF6', title: 'بنفش' }
                    ].map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => handleFormat('foreColor', col.hex)}
                        className="w-4 h-4 rounded-full border border-white dark:border-slate-800 shadow-sm transition-transform hover:scale-125"
                        style={{ backgroundColor: col.hex }}
                        title={col.title}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Display visual editor vs code editor */}
              {editorView === 'visual' ? (
                <div className="space-y-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 min-h-[400px]">
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleVisualInput}
                    {...{ placeholder: "محتوای بصری مطلب خود را اینجا بنویسید (با استفاده از ابزارهای بالا به راحتی متن خود را استایل‌دهی کنید، عکس‌ها مستقیماً نمایش داده می‌شوند)..." }}
                    className="prose dark:prose-invert max-w-none text-xs sm:text-sm font-normal leading-[2.1] text-slate-700 dark:text-slate-300 min-h-[380px] outline-none space-y-4"
                    style={{ direction: 'rtl', textAlign: 'right' }}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <textarea
                    ref={textareaRef}
                    required
                    name="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="محتوای متنی مطلب خود را با استفاده از کدهای HTML و ابزارهای بالا به زیبایی نگارش کنید..."
                    rows={18}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all resize-none font-mono text-xs leading-relaxed"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Post Summary Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-slate-800 dark:text-white">خلاصه مطلب (توضیح کوتاه)</h2>
            <textarea 
              name="summary"
              value={formData.summary}
              onChange={handleInputChange}
              placeholder="یک خلاصه کوتاه ۲ الی ۳ جمله‌ای بنویسید (در صفحات لیست وبلاگ به عنوان چکیده مطلب نمایش داده می‌شود)..."
              rows={3}
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all resize-none font-bold text-xs"
            />
          </div>

          {/* FAQ Q&A Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block" />
              پرسش و پاسخ‌های متداول (FAQ)
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">پرسش‌ها و پاسخ‌های مرتبط با این مقاله را اضافه کنید تا در انتهای مطلب به صورت آکاردئونی و با نشانه‌گذاری استاندارد (FAQ Schema) نمایش داده شوند.</p>
            
            <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1.5 text-xs font-bold">
                <label className="text-slate-500 dark:text-slate-400">پرسش (Question)</label>
                <input 
                  type="text"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="مثال: قفل آویز فولادی برای چه مکان‌هایی مناسب است؟"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                />
              </div>

              <div className="space-y-1.5 text-xs font-bold">
                <label className="text-slate-500 dark:text-slate-400">پاسخ (Answer)</label>
                <textarea 
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="پاسخ کوتاه و جامع به پرسش بالا..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                >
                  {editingFaqIndex !== null ? 'بروزرسانی پرسش و پاسخ' : 'افزودن به لیست'}
                </button>
                {editingFaqIndex !== null && (
                  <button
                    type="button"
                    onClick={handleCancelEditFaq}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  >
                    انصراف
                  </button>
                )}
              </div>
            </div>

            {/* List of current FAQs */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[11px] font-black text-slate-700 dark:text-slate-300">پرسش و پاسخ‌های ثبت شده ({(formData.faqs || []).length})</h3>
              
              {(!formData.faqs || formData.faqs.length === 0) ? (
                <div className="p-4 text-center text-[11px] font-bold text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800">
                  هنوز هیچ پرسش و پاسخی برای این مقاله ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(formData.faqs || []).map((faq, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100/50 dark:border-slate-800 flex flex-col justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="font-black text-slate-800 dark:text-slate-200 flex gap-1.5 items-start">
                          <span className="text-blue-500 font-bold">س:</span>
                          <span>{faq.question}</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 font-bold flex gap-1.5 items-start leading-relaxed text-[11px]">
                          <span className="text-emerald-500 font-bold">ج:</span>
                          <span>{faq.answer}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleEditFaq(idx)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(idx)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SEO Optimization Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              تنظیمات سئو (SEO Settings)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              {/* Meta Title */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">عنوان متا (Meta Title)</label>
                <input 
                  type="text"
                  name="seoTitle"
                  value={formData.seoTitle}
                  onChange={handleInputChange}
                  placeholder="عنوان مخصوص موتورهای جستجو..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                />
              </div>

              {/* Meta Slug */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">اسلاگ سئو (SEO Slug)</label>
                <input 
                  type="text"
                  name="seoSlug"
                  value={formData.seoSlug}
                  onChange={handleInputChange}
                  placeholder="آدرس ترجیحی سئو..."
                  className="w-full text-left px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                  dir="ltr"
                />
              </div>

              {/* Meta Description */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">توضیحات متا (Meta Description)</label>
                <textarea 
                  name="seoDescription"
                  value={formData.seoDescription}
                  onChange={handleInputChange}
                  placeholder="توضیحات جذاب و خلاصه برای موتورهای جستجو (زیر ۱۶۰ کاراکتر)..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all resize-none"
                />
              </div>

              {/* OG Social Image */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">تصویر شبکه‌های اجتماعی (OG Image)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    name="ogImage"
                    value={formData.ogImage}
                    onChange={handleInputChange}
                    placeholder="https://example.com/social-image.jpg"
                    className="flex-1 text-left px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMediaPickerFor('ogImage')}
                    className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 hover:bg-indigo-100 rounded-2xl hover:scale-105 duration-200"
                  >
                    گالری
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Settings & Meta Sidebar (Span 1) */}
        <div className="space-y-6 text-xs font-bold">
          
          {/* Publish Action & Status Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h2 className="text-xs font-black text-slate-800 dark:text-white">تنظیمات انتشار و وضعیت</h2>
            
            {/* Publication Status */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400">وضعیت انتشار</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
              >
                <option value="draft">پیش‌نویس</option>
                <option value="published">انتشار فوری (عمومی)</option>
                <option value="scheduled">زمان‌بندی شده</option>
                <option value="archived">بایگانی</option>
              </select>
            </div>

            {/* Publication Date/Time */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                تاریخ و زمان انتشار (شمسی)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {/* روز */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block">روز</span>
                  <select 
                    value={shamsiDay}
                    onChange={(e) => handleShamsiDateChange(shamsiYear, shamsiMonth, parseInt(e.target.value), shamsiHour, shamsiMinute)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-xl outline-none font-bold text-xs"
                  >
                    {Array.from({ length: shamsiMonth <= 6 ? 31 : shamsiMonth <= 11 ? 30 : 29 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {/* ماه */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block">ماه</span>
                  <select 
                    value={shamsiMonth}
                    onChange={(e) => handleShamsiDateChange(shamsiYear, parseInt(e.target.value), shamsiDay, shamsiHour, shamsiMinute)}
                    className="w-full px-1 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-xl outline-none font-bold text-[10px]"
                  >
                    {[
                      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
                    ].map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                {/* سال */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block">سال</span>
                  <select 
                    value={shamsiYear}
                    onChange={(e) => handleShamsiDateChange(parseInt(e.target.value), shamsiMonth, shamsiDay, shamsiHour, shamsiMinute)}
                    className="w-full px-1.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-xl outline-none font-bold text-[11px]"
                  >
                    {[1405, 1406, 1407, 1408, 1409, 1410].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                {/* ساعت */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block">ساعت</span>
                  <select 
                    value={shamsiHour}
                    onChange={(e) => handleShamsiDateChange(shamsiYear, shamsiMonth, shamsiDay, parseInt(e.target.value), shamsiMinute)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-xl outline-none font-bold text-xs"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map(h => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                {/* دقیقه */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block">دقیقه</span>
                  <select 
                    value={shamsiMinute}
                    onChange={(e) => handleShamsiDateChange(shamsiYear, shamsiMonth, shamsiDay, shamsiHour, parseInt(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-xl outline-none font-bold text-xs"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map(m => (
                      <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
              {formData.status === 'scheduled' && (
                <span className="text-[10px] text-blue-500 font-bold block mt-1">مطلب به صورت خودکار در این زمان منتشر خواهد شد.</span>
              )}
            </div>

            {/* Author */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5" />
                نویسنده مطلب
              </label>
              <input 
                type="text"
                name="authorName"
                value={formData.authorName}
                onChange={handleInputChange}
                placeholder="نام نویسنده (مثل: تیم مدیریت)"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
              />
            </div>

            {/* Allow Comments Toggle */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
              <span className="text-slate-600 dark:text-slate-300 font-bold">امکان ثبت دیدگاه فعال باشد</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="allowComments"
                  checked={formData.allowComments}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Featured Image Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1">
              <ImageIcon className="w-4 h-4 text-blue-500" />
              تصویر شاخص مطلب (Featured)
            </h2>

            {formData.featuredImage ? (
              <div className="space-y-3">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={formData.featuredImage} 
                    alt="تصویر شاخص"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, featuredImage: '' }))}
                    className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMediaPickerFor('featuredImage')}
                className="w-full aspect-video border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500 transition-all duration-300 bg-slate-50/[0.3] dark:bg-slate-850/[0.1]"
              >
                <ImageIcon className="w-8 h-8" />
                <span>انتخاب تصویر شاخص مطلب</span>
              </button>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-medium">یا آدرس مستقیم تصویر را وارد کنید:</label>
              <input 
                type="text"
                name="featuredImage"
                value={formData.featuredImage}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                className="w-full text-left px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-xl outline-none font-bold text-xs"
                dir="ltr"
              />
            </div>
          </div>

          {/* Related Product (SEO) Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-500" />
              محصول هدف (بهبود سئو)
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              اگر این مقاله را برای معرفی یا راهنمای خرید یک محصول خاص نوشته‌اید، آن را انتخاب کنید تا پیشنهاد سئو برای لینک‌سازی دوطرفه فعال شود.
            </p>
            <div className="space-y-1.5">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all text-xs font-bold"
              >
                <option value="">-- انتخاب محصول هدف --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Tags Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1">
              <TagsIcon className="w-4 h-4 text-blue-500" />
              دسته‌بندی و تگ‌ها
            </h2>

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400">دسته‌بندی مطلب</label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
              >
                <option value="">انتخاب دسته‌بندی...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Tags Inputs */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400">برچسب‌ها (تگ‌ها)</label>
              <input 
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="تایپ کنید و Enter بزنید..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
              />
              
              {/* Render Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.tags.map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded-lg"
                    >
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Media Picker Modal */}
      {showMediaPickerFor && (
        <MediaPicker 
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPickerFor(null)}
          accepts="image/*"
        />
      )}

    </form>
  );
}
