/**
 * SEO & GEO (Generative Engine Optimization) Utility Functions
 * Designed for Multi-Tenant architecture, RTL layout, and modern AI-friendly content structures.
 */

interface KeywordLink {
  text: string;
  url: string;
  title: string;
}

/**
 * Safely injects contextual links into HTML content.
 * Tokenizes the HTML to protect HTML tags/attributes (like <img src="..." alt="..." />)
 * and only replaces keywords inside raw text nodes.
 *
 * It prevents circular linking (to the current page) and enforces strict limits to avoid spammy links.
 */
export function injectContextualLinks(
  htmlContent: string,
  keywords: KeywordLink[],
  currentUrl: string,
  maxTotalLinks: number = 4
): string {
  if (!htmlContent || !keywords || keywords.length === 0) return htmlContent;

  // Clean current URL to avoid self-linking
  const normalizedCurrentUrl = currentUrl.trim().toLowerCase();

  // Filter out any keywords that link to the current URL or have empty text
  const validKeywords = keywords.filter(
    (k) =>
      k.text &&
      k.text.trim().length > 1 &&
      k.url.trim().toLowerCase() !== normalizedCurrentUrl
  );

  if (validKeywords.length === 0) return htmlContent;

  // Sort keywords by length descending to match longer phrases first (e.g. "iPhone 15 Pro" before "iPhone")
  const sortedKeywords = [...validKeywords].sort((a, b) => b.text.length - a.text.length);

  // Split content by HTML tags so we can isolate raw text nodes
  // Grouping parenthesis retains the split delimiter (the HTML tag itself) in the resulting tokens
  const tokens = htmlContent.split(/(<[^>]+>)/g);
  let totalLinksInjected = 0;
  
  // Track already linked keywords to prevent duplicate links to the exact same word
  const linkedWords = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // If it's an HTML tag, leave it completely untouched
    if (token.startsWith('<') && token.endsWith('>')) {
      continue;
    }

    // Check if the text is inside an active link tag (i.e. between <a ...> and </a>)
    // We can check if previous tokens have an unclosed <a and no closing </a>
    let insideAnchor = false;
    let anchorDepth = 0;
    for (let j = 0; j < i; j++) {
      if (tokens[j].toLowerCase().startsWith('<a')) {
        anchorDepth++;
      } else if (tokens[j].toLowerCase().startsWith('</a')) {
        anchorDepth--;
      }
    }
    insideAnchor = anchorDepth > 0;

    if (insideAnchor) {
      continue; // Skip this text token since it is already inside a link
    }

    // It's a clean raw text node. We can replace keywords here.
    let textNode = token;

    for (const keyword of sortedKeywords) {
      if (totalLinksInjected >= maxTotalLinks) break;
      if (linkedWords.has(keyword.text.toLowerCase())) continue;

      // Escape special regex chars
      const escapedKeyword = keyword.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      // We look for the keyword surrounded by typical RTL word boundaries (spaces, punctuation, start/end of string)
      // Since Javascript's \b doesn't support Persian/Arabic characters well, we use logical RTL boundary lookahead/behind
      const pattern = new RegExp(`(?<=^|\\s|[.,!?;:؛،\\(\\)\\[\\]{}"'\\-\\n])${escapedKeyword}(?=$|\\s|[.,!?;:؛،\\(\\)\\[\\]{}"'\\-\\n])`, 'gi');

      if (pattern.test(textNode)) {
        // Replace ONLY the first match in this text node to prevent excessive linking
        textNode = textNode.replace(pattern, (match) => {
          if (totalLinksInjected < maxTotalLinks && !linkedWords.has(keyword.text.toLowerCase())) {
            totalLinksInjected++;
            linkedWords.add(keyword.text.toLowerCase());
            
            // Generate standard SEO-friendly semantic HTML anchor
            return `<a href="${keyword.url}" title="${keyword.title}" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5" target="_blank">${match}</a>`;
          }
          return match;
        });
      }
    }

    tokens[i] = textNode;
  }

  return tokens.join('');
}

/**
 * Generates Schema.org BreadcrumbList JSON-LD structure.
 * Standard Breadcrumb is highly favored by both Google search crawlers and AI search bots (GEO).
 */
export function generateBreadcrumbSchema(
  host: string,
  items: { name: string; url: string }[]
) {
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const itemListElement = items.map((item, index) => {
    const fullUrl = item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`;
    return {
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': fullUrl,
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': itemListElement,
  };
}

/**
 * Generates Schema.org DiscussionForumPosting structure for article comments.
 * Helps Generative Search Engines understand discussion threads, dynamic user engagement, and contextual answers.
 */
export function generateDiscussionSchema(
  articleUrl: string,
  articleTitle: string,
  comments: { name: string; content: string; createdAt: string }[]
) {
  if (!comments || comments.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': `${articleUrl}#discussion`,
    'headline': `گفتگوها در مورد ${articleTitle}`,
    'url': articleUrl,
    'commentCount': comments.length,
    'comment': comments.map((c) => ({
      '@type': 'Comment',
      'text': c.content.replace(/<[^>]*>/g, ''), // Strip HTML
      'dateCreated': c.createdAt,
      'author': {
        '@type': 'Person',
        'name': c.name,
      },
    })),
  };
}
