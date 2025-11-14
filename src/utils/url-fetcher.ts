import axios from 'axios';
import * as cheerio from 'cheerio';
import ssrfFilter from 'ssrf-req-filter';

interface FetchedPageContent {
  title: string;
  headings: string[];
  paragraphs: string[];
  lists: string[];
  fullText: string;
}

/**
 * Safely fetch and extract text content from a landing page URL
 * Uses ssrf-req-filter to prevent SSRF attacks
 * @param url The URL to fetch
 * @returns Structured content from the page
 */
export async function fetchLandingPageContent(url: string): Promise<FetchedPageContent> {
  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS for security
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed for security');
    }

    console.log(`[URL FETCHER] Fetching content from: ${url}`);

    // Fetch the page with SSRF protection
    // ssrf-req-filter blocks requests to private IPs, localhost, metadata endpoints, etc.
    const response = await axios.get(url, {
      timeout: 15000, // 15 second timeout
      maxRedirects: 0, // Prevent redirect-based SSRF
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IgniteBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      maxContentLength: 5 * 1024 * 1024, // 5MB max
      // CRITICAL: Set both agents to prevent cross-protocol redirect attacks
      httpAgent: ssrfFilter(url),
      httpsAgent: ssrfFilter(url),
    });

    if (!response.data) {
      throw new Error('No content received from URL');
    }

    // Parse HTML with cheerio
    const $ = cheerio.load(response.data);

    // Remove script, style, and other non-content elements
    $('script, style, nav, footer, iframe, noscript').remove();

    // Extract page title
    const title = $('title').text().trim() || $('h1').first().text().trim();

    // Extract headings
    const headings: string[] = [];
    $('h1, h2, h3, h4').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 0) {
        headings.push(text);
      }
    });

    // Extract paragraphs
    const paragraphs: string[] = [];
    $('p').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 20) { // Filter out very short paragraphs
        paragraphs.push(text);
      }
    });

    // Extract list items
    const lists: string[] = [];
    $('ul li, ol li').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 5) {
        lists.push(text);
      }
    });

    // Extract all visible text from body
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Compile full content
    const fullText = [
      title ? `Title: ${title}` : '',
      headings.length > 0 ? `\n\nHeadings:\n${headings.join('\n')}` : '',
      paragraphs.length > 0 ? `\n\nContent:\n${paragraphs.join('\n\n')}` : '',
      lists.length > 0 ? `\n\nKey Points:\n${lists.map(item => `• ${item}`).join('\n')}` : ''
    ].filter(section => section.length > 0).join('');

    console.log(`[URL FETCHER] Successfully extracted content (${fullText.length} characters)`);

    // Ensure we have meaningful content
    if (fullText.length < 100) {
      throw new Error('Unable to extract content from this page. It appears to be JavaScript-rendered (React/Vue/etc). Please use the "Manual Content" option and copy-paste your page content instead.');
    }

    return {
      title,
      headings,
      paragraphs,
      lists,
      fullText
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      // SSRF filter throws specific errors that axios catches
      if (error.message.includes('Blocked') || error.message.includes('denied') || error.message.includes('not allowed')) {
        throw new Error('The URL appears to point to a private or internal resource and cannot be accessed for security reasons');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: The landing page took too long to respond');
      }
      if (error.response?.status === 404) {
        throw new Error('Page not found: Please check the URL and try again');
      }
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Access denied: The landing page may be password-protected or blocked');
      }
      throw new Error(`Failed to fetch landing page: ${error.message}`);
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('An unexpected error occurred while fetching the landing page');
  }
}

