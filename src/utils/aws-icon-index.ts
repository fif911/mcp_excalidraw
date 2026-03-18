import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

// ── Types ──────────────────────────────────────────────────────────────

export type IconType = 'architecture' | 'resource' | 'group' | 'category' | 'custom';

export interface IconEntry {
  path: string;             // relative from icons/
  filename: string;
  icon_type: IconType;
  category: string;         // "Compute", "Analytics", etc.
  service_name: string;     // "AWS Lambda" (human-readable)
  search_tokens: string[];  // lowercase tokens for matching
  size: number;
  variant?: string;         // "Light" | "Dark" for general resource icons
  color?: string;           // recolored variant color name, e.g. "Orange"
}

export interface IconSearchParams {
  query?: string;
  category?: string;
  iconType?: IconType;
  size?: number;
  variant?: string;
  color?: string;
  limit?: number;
  resolve?: boolean;
}

export interface IconSearchResult {
  path: string;
  service_name: string;
  icon_type: IconType;
  category: string;
  size: number;
  filename: string;
  suggested_file_id: string;
  variant?: string;           // "Light" | "Dark" — present on group icons and general resource icons
  for_dark_background: boolean; // true = designed for dark backgrounds (light strokes), false = for light/white backgrounds
  color?: string;             // recolored variant color name, e.g. "Orange"
  color_hex?: string;         // hex value of the color, e.g. "#ED7100"
  absolute_path?: string;     // full filesystem path — present only when resolve=true
}

export interface IconSearchResponse {
  total_matches: number;
  returned: number;
  categories_available?: string[];
  results: IconSearchResult[];
}

// ── AWS Category Colors ────────────────────────────────────────────────
// Official AWS icon category color scheme
const AWS_CATEGORY_COLORS: Record<string, string> = {
  'Compute':                    '#ED7100',  // orange
  'Storage':                    '#7AA116',  // green
  'Databases':                  '#C925D1',  // purple
  'Networking-Content-Delivery':'#8C4FFF',  // purple
  'Analytics':                  '#8C4FFF',  // purple
  'Application-Integration':   '#E7157B',  // pink
  'Management-Governance':     '#E7157B',  // pink
  'Management-Tools':          '#E7157B',  // pink
  'Security-Identity':         '#DD344C',  // red
  'Containers':                '#ED7100',  // orange
  'Artificial-Intelligence':   '#01A88D',  // teal
  'Developer-Tools':           '#C925D1',  // purple
  'Front-End-Web-Mobile':      '#DD344C',  // red
  'Business-Applications':     '#DD344C',  // red
  'Cloud-Financial-Management':'#7AA116',  // green
  'Customer-Enablement':       '#7AA116',  // green
  'End-User-Computing':        '#ED7100',  // orange
  'Internet-of-Things':        '#7AA116',  // green
  'IoT':                       '#7AA116',  // green
  'Media-Services':            '#ED7100',  // orange
  'Migration-Modernization':   '#7AA116',  // green
  'Quantum-Technologies':      '#ED7100',  // orange
  'Satellite':                 '#8C4FFF',  // purple
  'Serverless':                '#ED7100',  // orange
  'Games':                     '#8C4FFF',  // purple
};

// Named colors recognized in custom icon filenames (e.g., _Orange.svg)
export const NAMED_COLORS: Record<string, string> = {
  'orange':  '#ED7100',
  'green':   '#7AA116',
  'purple':  '#8C4FFF',
  'pink':    '#E7157B',
  'red':     '#DD344C',
  'teal':    '#01A88D',
  'blue':    '#1971C2',
  'gray':    '#879196',
  'grey':    '#879196',
  'white':   '#FFFFFF',
  'black':   '#1A1A1A',
};

// ── AWS Abbreviation Aliases ───────────────────────────────────────────

const AWS_ALIASES: Record<string, string[]> = {
  's3':   ['simple', 'storage', 'service', 's3'],
  'ec2':  ['elastic', 'compute', 'cloud', 'ec2'],
  'rds':  ['relational', 'database', 'service', 'rds'],
  'vpc':  ['virtual', 'private', 'cloud', 'vpc'],
  'sns':  ['simple', 'notification', 'service', 'sns'],
  'sqs':  ['simple', 'queue', 'service', 'sqs'],
  'ecr':  ['elastic', 'container', 'registry', 'ecr'],
  'ecs':  ['elastic', 'container', 'service', 'ecs'],
  'eks':  ['elastic', 'kubernetes', 'service', 'eks'],
  'iam':  ['identity', 'access', 'management', 'iam'],
  'elb':  ['elastic', 'load', 'balancing', 'elb'],
  'alb':  ['application', 'load', 'balancer', 'alb'],
  'nlb':  ['network', 'load', 'balancer', 'nlb'],
  'ebs':  ['elastic', 'block', 'store', 'ebs'],
  'efs':  ['elastic', 'file', 'system', 'efs'],
  'emr':  ['emr'],
  'msk':  ['managed', 'streaming', 'kafka', 'msk'],
  'ddb':  ['dynamodb', 'ddb'],
  'cf':   ['cloudfront', 'cf'],
  'cfn':  ['cloudformation', 'cfn'],
  'cw':   ['cloudwatch', 'cw'],
  'api':  ['api', 'gateway'],
  'ssm':  ['systems', 'manager', 'ssm'],
  'kms':  ['key', 'management', 'service', 'kms'],
  'waf':  ['waf', 'web', 'application', 'firewall'],
};

// Reverse map: if an icon's tokens contain all the "key words" for an abbreviation,
// inject that abbreviation as a search token. E.g., tokens containing
// ["simple","storage","service"] get "s3" added.
const REVERSE_ALIASES: Array<{ abbrev: string; requiredTokens: string[] }> = [
  { abbrev: 's3',  requiredTokens: ['simple', 'storage', 'service'] },
  { abbrev: 'ec2', requiredTokens: ['elastic', 'compute', 'cloud'] },
  { abbrev: 'rds', requiredTokens: ['relational', 'database'] },
  { abbrev: 'vpc', requiredTokens: ['virtual', 'private', 'cloud'] },
  { abbrev: 'sns', requiredTokens: ['simple', 'notification'] },
  { abbrev: 'sqs', requiredTokens: ['simple', 'queue'] },
  { abbrev: 'ecr', requiredTokens: ['elastic', 'container', 'registry'] },
  { abbrev: 'ecs', requiredTokens: ['elastic', 'container', 'service'] },
  { abbrev: 'eks', requiredTokens: ['elastic', 'kubernetes'] },
  { abbrev: 'elb', requiredTokens: ['elastic', 'load', 'balancing'] },
  { abbrev: 'ebs', requiredTokens: ['elastic', 'block', 'store'] },
  { abbrev: 'efs', requiredTokens: ['elastic', 'file', 'system'] },
  { abbrev: 'kms', requiredTokens: ['key', 'management', 'service'] },
];

function injectReverseAliases(entry: IconEntry): void {
  for (const { abbrev, requiredTokens } of REVERSE_ALIASES) {
    if (requiredTokens.every(t => entry.search_tokens.includes(t))) {
      if (!entry.search_tokens.includes(abbrev)) {
        entry.search_tokens.push(abbrev);
      }
    }
  }
}

// ── Lazy Index ─────────────────────────────────────────────────────────

let iconIndex: IconEntry[] | null = null;
let iconsBaseDir: string | null = null;  // the "icons/" directory

function resolveIconsBase(): string {
  // Locate the "icons/" directory that contains aws-icons-official/ and custom/

  // 1. Env var
  if (process.env.ICONS_DIR) {
    const envPath = path.resolve(process.env.ICONS_DIR);
    if (fs.existsSync(envPath)) return envPath;
  }

  // 2. process.cwd() / icons
  const cwdPath = path.join(process.cwd(), 'icons');
  if (fs.existsSync(cwdPath)) return cwdPath;

  // 3. Resolve from this file's location (dist/utils/ → project root)
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const projectRoot = path.resolve(path.dirname(thisFile), '..', '..');
    const filePath = path.join(projectRoot, 'icons');
    if (fs.existsSync(filePath)) return filePath;
  } catch {
    // import.meta.url may not be available in all contexts
  }

  throw new Error(
    'Could not find icons directory. ' +
    'Set ICONS_DIR env var or run from the project root.'
  );
}

// ── Filename Parsing ───────────────────────────────────────────────────

function humanize(name: string): string {
  // "AWS-Lambda" → "AWS Lambda", "AWS-Glue_Crawler" → "AWS Glue Crawler"
  return name.replace(/[-_]/g, ' ');
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s\-_]+/).filter(t => t.length > 0);
}

function parseGroupIcon(filename: string, relPath: string): IconEntry {
  // e.g. "AWS-Cloud_32.svg", "Virtual-private-cloud-VPC_32.svg", "Region_32_Dark.svg"
  const base = filename.replace('.svg', '');
  const parts = base.split('_');
  // Last part might be "Dark", second-to-last is size
  let variant: string | undefined;
  let sizePart: string;
  let nameParts: string[];

  if (parts.length >= 3 && (parts[parts.length - 1] === 'Dark' || parts[parts.length - 1] === 'Light')) {
    variant = parts[parts.length - 1];
    sizePart = parts[parts.length - 2] ?? '32';
    nameParts = parts.slice(0, -2);
  } else {
    sizePart = parts[parts.length - 1] ?? '32';
    nameParts = parts.slice(0, -1);
  }

  const serviceName = humanize(nameParts.join('-'));
  const tokens = tokenize(nameParts.join('-'));
  tokens.push('group');
  if (variant) tokens.push(variant.toLowerCase());

  return {
    path: relPath,
    filename,
    icon_type: 'group',
    category: 'Group',
    service_name: serviceName,
    search_tokens: tokens,
    size: parseInt(sizePart) || 32,
    variant,
  };
}

function parseArchitectureIcon(filename: string, relPath: string, categoryDir: string): IconEntry {
  // filename: "Arch_AWS-Lambda_48.svg"
  // categoryDir: "Arch_Compute"
  const category = categoryDir.replace('Arch_', '');
  const base = filename.replace('.svg', '');
  // Strip "Arch_" prefix and "_size" suffix
  const match = base.match(/^Arch_(.+)_(\d+)$/);
  let serviceName: string;
  let size: number;
  if (match) {
    serviceName = humanize(match[1] ?? '');
    size = parseInt(match[2] ?? '48');
  } else {
    serviceName = humanize(base.replace('Arch_', ''));
    size = 48;
  }

  const tokens = tokenize(serviceName);
  tokens.push(...tokenize(category));

  return {
    path: relPath,
    filename,
    icon_type: 'architecture',
    category,
    service_name: serviceName,
    search_tokens: [...new Set(tokens)],
    size,
  };
}

function parseResourceIcon(filename: string, relPath: string, categoryDir: string, subDir?: string): IconEntry {
  // filename: "Res_AWS-Glue_Data-Catalog_48.svg" or "Res_Users_48_Light.svg"
  const category = categoryDir.replace('Res_', '');
  const base = filename.replace('.svg', '');

  let serviceName: string;
  let size = 48;
  let variant: string | undefined;

  if (category === 'General-Icons' && subDir) {
    // subDir is like "Res_48_Light" or "Res_48_Dark"
    const subMatch = subDir.match(/Res_(\d+)_(Light|Dark)/);
    if (subMatch) {
      size = parseInt(subMatch[1] ?? '48');
      variant = subMatch[2];
    }
    // filename: "Res_Users_48_Light.svg"
    const nameMatch = base.match(/^Res_(.+?)_\d+_(Light|Dark)$/);
    if (nameMatch) {
      serviceName = humanize(nameMatch[1] ?? '');
    } else {
      serviceName = humanize(base.replace(/^Res_/, ''));
    }
  } else {
    // filename: "Res_Amazon-Redshift_Dense-Compute-Node_48.svg"
    const match = base.match(/^Res_(.+)_(\d+)$/);
    if (match) {
      serviceName = humanize(match[1] ?? '');
      size = parseInt(match[2] ?? '48');
    } else {
      serviceName = humanize(base.replace(/^Res_/, ''));
    }
  }

  const tokens = tokenize(serviceName);
  tokens.push(...tokenize(category));
  if (variant) tokens.push(variant.toLowerCase());

  return {
    path: relPath,
    filename,
    icon_type: 'resource',
    category,
    service_name: serviceName,
    search_tokens: [...new Set(tokens)],
    size,
    variant,
  };
}

function parseCategoryIcon(filename: string, relPath: string): IconEntry {
  // filename: "Arch-Category_Compute_16.svg"
  const base = filename.replace('.svg', '');
  const match = base.match(/^Arch-Category_(.+)_(\d+)$/);
  let category: string;
  let size: number;
  if (match) {
    category = match[1] ?? '';
    size = parseInt(match[2] ?? '48');
  } else {
    category = base.replace('Arch-Category_', '');
    size = 48;
  }

  const serviceName = humanize(category);
  const tokens = tokenize(category);
  tokens.push('category');

  return {
    path: relPath,
    filename,
    icon_type: 'category',
    category,
    service_name: serviceName,
    search_tokens: [...new Set(tokens)],
    size,
  };
}

// ── Index Builder ──────────────────────────────────────────────────────

function buildAwsIndex(awsRoot: string, pathPrefix: string): IconEntry[] {
  const entries: IconEntry[] = [];
  const topDirs = fs.readdirSync(awsRoot);

  for (const dir of topDirs) {
    const dirPath = path.join(awsRoot, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    if (dir.startsWith('Architecture-Group-Icons')) {
      // Flat directory of group icons
      for (const file of fs.readdirSync(dirPath)) {
        if (!file.endsWith('.svg')) continue;
        const relPath = `${pathPrefix}${dir}/${file}`;
        entries.push(parseGroupIcon(file, relPath));
      }
    } else if (dir.startsWith('Architecture-Service-Icons')) {
      // Nested: dir/Arch_Category/size/file.svg
      for (const catDir of fs.readdirSync(dirPath)) {
        const catPath = path.join(dirPath, catDir);
        if (!fs.statSync(catPath).isDirectory()) continue;
        for (const sizeDir of fs.readdirSync(catPath)) {
          const sizePath = path.join(catPath, sizeDir);
          if (!fs.statSync(sizePath).isDirectory()) continue;
          for (const file of fs.readdirSync(sizePath)) {
            if (!file.endsWith('.svg')) continue;
            const relPath = `${pathPrefix}${dir}/${catDir}/${sizeDir}/${file}`;
            entries.push(parseArchitectureIcon(file, relPath, catDir));
          }
        }
      }
    } else if (dir.startsWith('Resource-Icons')) {
      // Nested: dir/Res_Category/file.svg  OR  dir/Res_General-Icons/Res_48_Light/file.svg
      for (const catDir of fs.readdirSync(dirPath)) {
        const catPath = path.join(dirPath, catDir);
        if (!fs.statSync(catPath).isDirectory()) continue;

        if (catDir === 'Res_General-Icons') {
          // Has Light/Dark subdirs
          for (const subDir of fs.readdirSync(catPath)) {
            const subPath = path.join(catPath, subDir);
            if (!fs.statSync(subPath).isDirectory()) continue;
            for (const file of fs.readdirSync(subPath)) {
              if (!file.endsWith('.svg')) continue;
              const relPath = `${pathPrefix}${dir}/${catDir}/${subDir}/${file}`;
              entries.push(parseResourceIcon(file, relPath, catDir, subDir));
            }
          }
        } else {
          // Flat files under category
          for (const file of fs.readdirSync(catPath)) {
            if (!file.endsWith('.svg')) continue;
            const relPath = `${pathPrefix}${dir}/${catDir}/${file}`;
            entries.push(parseResourceIcon(file, relPath, catDir));
          }
        }
      }
    } else if (dir.startsWith('Category-Icons')) {
      // Nested: dir/Arch-Category_size/file.svg
      for (const sizeDir of fs.readdirSync(dirPath)) {
        const sizePath = path.join(dirPath, sizeDir);
        if (!fs.statSync(sizePath).isDirectory()) continue;
        for (const file of fs.readdirSync(sizePath)) {
          if (!file.endsWith('.svg')) continue;
          const relPath = `${pathPrefix}${dir}/${sizeDir}/${file}`;
          entries.push(parseCategoryIcon(file, relPath));
        }
      }
    }
    // Skip Icon-package_* and any other dirs
  }

  return entries;
}

function parseCustomColor(filename: string): { color?: string; colorHex?: string } {
  // Detect color suffix: "Res_AWS-CloudFormation_Template_48_Orange.svg" → "Orange"
  const base = filename.replace('.svg', '');
  const namedColors = Object.keys(NAMED_COLORS);
  // Check last segment after underscore
  const parts = base.split('_');
  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    const lower = lastPart.toLowerCase();
    if (namedColors.includes(lower)) {
      return { color: lastPart, colorHex: NAMED_COLORS[lower] };
    }
  }
  return {};
}

function buildCustomIndex(customDir: string, pathPrefix: string): IconEntry[] {
  const entries: IconEntry[] = [];
  if (!fs.existsSync(customDir)) return entries;

  for (const file of fs.readdirSync(customDir)) {
    if (!file.endsWith('.svg')) continue;
    const relPath = `${pathPrefix}${file}`;
    const base = file.replace('.svg', '');
    const { color, colorHex } = parseCustomColor(file);

    // Strip color suffix and known prefixes/size from service name for cleaner display
    let nameBase = base;
    if (color) {
      nameBase = nameBase.replace(new RegExp(`_${color}$`, 'i'), '');
    }
    // Strip Arch_/Res_ prefixes and _size suffixes for cleaner names
    nameBase = nameBase.replace(/^(Arch_|Res_|Arch-Category_)/, '');
    nameBase = nameBase.replace(/_\d+$/, '');

    const serviceName = humanize(nameBase);
    const tokens = tokenize(base); // keep color in search tokens
    if (color) tokens.push(color.toLowerCase());

    // Try to detect size from filename (e.g., _48_ pattern)
    const sizeMatch = base.match(/_(\d+)(?:_|$)/);
    const size = sizeMatch ? parseInt(sizeMatch[1] ?? '48') : 48;

    entries.push({
      path: relPath,
      filename: file,
      icon_type: 'custom' as IconType,
      category: 'Custom',
      service_name: serviceName,
      search_tokens: [...new Set(tokens)],
      size,
      color,
    });
  }

  return entries;
}

function buildIndex(iconsBase: string): IconEntry[] {
  const entries: IconEntry[] = [];

  // Index aws-icons-official/
  const awsDir = path.join(iconsBase, 'aws-icons-official');
  if (fs.existsSync(awsDir)) {
    entries.push(...buildAwsIndex(awsDir, 'aws-icons-official/'));
  }

  // Index custom/
  const customDir = path.join(iconsBase, 'custom');
  entries.push(...buildCustomIndex(customDir, 'custom/'));

  // Inject abbreviation tokens (e.g., "s3" for "Simple Storage Service")
  for (const entry of entries) {
    injectReverseAliases(entry);
  }

  logger.info(`Icon index built: ${entries.length} icons indexed`);
  return entries;
}

function getIndex(): IconEntry[] {
  if (!iconIndex) {
    iconsBaseDir = resolveIconsBase();
    iconIndex = buildIndex(iconsBaseDir);
  }
  return iconIndex;
}

/** Force re-scan of icon directories on next searchIcons() call. */
export function invalidateIndex(): void {
  iconIndex = null;
  iconsBaseDir = null;
}

/** Get the resolved icons base directory path. */
export function getIconsBaseDir(): string {
  if (!iconsBaseDir) {
    iconsBaseDir = resolveIconsBase();
  }
  return iconsBaseDir;
}

// ── Suggested file_id ──────────────────────────────────────────────────

function suggestFileId(entry: IconEntry): string {
  let name = entry.service_name.toLowerCase();
  // Strip common prefixes
  name = name.replace(/^(aws |amazon )/, '');
  // Replace underscores and spaces with hyphens
  name = name.replace(/[_\s]+/g, '-');
  // Keep only alphanumerics and hyphens
  name = name.replace(/[^a-z0-9-]/g, '');
  // Collapse multiple hyphens
  name = name.replace(/-+/g, '-').replace(/^-|-$/g, '');
  // Append -dark suffix for dark-background variants
  if (entry.variant === 'Dark') name += '-dark';
  return `file-${name}`;
}

// ── Search Logic ───────────────────────────────────────────────────────

function getAliasTokens(tokens: string[]): string[] {
  // Return only the NEW tokens added by alias expansion (not the originals)
  const extras: string[] = [];
  for (const token of tokens) {
    const aliases = AWS_ALIASES[token];
    if (aliases) {
      for (const alias of aliases) {
        if (!tokens.includes(alias) && !extras.includes(alias)) {
          extras.push(alias);
        }
      }
    }
  }
  return extras;
}

function matchToken(searchTokens: string[], qt: string): number {
  for (const st of searchTokens) {
    if (st === qt) return 10;
    if (st.startsWith(qt)) return 5;
    if (st.includes(qt)) return 3;
  }
  return 0;
}

function scoreEntry(entry: IconEntry, originalTokens: string[], aliasTokens: string[]): number {
  let score = 0;
  let originalMatched = 0;
  let aliasMatched = 0;

  // Score original query tokens (high weight)
  for (const qt of originalTokens) {
    const s = matchToken(entry.search_tokens, qt);
    if (s > 0) {
      score += s;
      originalMatched++;
    }
  }

  // Score alias tokens (lower weight — these are bonus signals)
  for (const qt of aliasTokens) {
    const s = matchToken(entry.search_tokens, qt);
    if (s > 0) {
      score += Math.ceil(s / 2);
      aliasMatched++;
    }
  }

  // Must match at least one original token OR at least one alias token
  if (originalMatched === 0 && aliasMatched === 0) return 0;

  // Bonus if ALL original tokens matched
  if (originalMatched === originalTokens.length && originalTokens.length > 0) score += 20;

  // If only alias matched (not original), lower the total score
  if (originalMatched === 0) score = Math.ceil(score / 2);

  // Prefer architecture icons over resource icons for same score
  if (entry.icon_type === 'architecture') score += 2;

  return score;
}

export function searchIcons(params: IconSearchParams): IconSearchResponse {
  const index = getIndex();
  const limit = Math.min(params.limit ?? 20, 50);

  // If no query and no category, return available categories
  // If no query, no category, and no other filters — return categories list
  if (!params.query && !params.category && !params.iconType && !params.color) {
    const categories = [...new Set(index.map(e => e.category))].sort();
    return {
      total_matches: 0,
      returned: 0,
      categories_available: categories,
      results: [],
    };
  }

  // Filter phase
  let filtered = index;

  if (params.iconType) {
    filtered = filtered.filter(e => e.icon_type === params.iconType);
  }
  if (params.category) {
    const cat = params.category.toLowerCase();
    filtered = filtered.filter(e => {
      const eCat = e.category.toLowerCase();
      // Exact match or starts-with (e.g., "Compute" matches "Compute" but "Custom" doesn't match "Customer-Enablement")
      return eCat === cat || eCat.startsWith(cat + '-');
    });
  }
  if (params.size) {
    filtered = filtered.filter(e => e.size === params.size);
  }
  if (params.variant) {
    filtered = filtered.filter(e => e.variant === params.variant);
  }
  if (params.color) {
    const col = params.color.toLowerCase();
    filtered = filtered.filter(e => e.color?.toLowerCase() === col);
  }

  // Score phase (if query provided)
  let results: Array<{ entry: IconEntry; score: number }>;

  if (params.query) {
    const originalTokens = tokenize(params.query);
    const aliasTokens = getAliasTokens(originalTokens);

    results = [];
    for (const entry of filtered) {
      const score = scoreEntry(entry, originalTokens, aliasTokens);
      if (score > 0) {
        results.push({ entry, score });
      }
    }
    // Sort by score desc, then service_name asc
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.service_name.localeCompare(b.entry.service_name);
    });
  } else {
    // No query — return all filtered, sorted alphabetically
    results = filtered.map(entry => ({ entry, score: 0 }));
    results.sort((a, b) => a.entry.service_name.localeCompare(b.entry.service_name));
  }

  const totalMatches = results.length;
  const sliced = results.slice(0, limit);

  return {
    total_matches: totalMatches,
    returned: sliced.length,
    results: sliced.map(({ entry }) => ({
      path: entry.path,
      service_name: entry.service_name,
      icon_type: entry.icon_type,
      category: entry.category,
      size: entry.size,
      filename: entry.filename,
      suggested_file_id: suggestFileId(entry),
      ...(entry.variant ? { variant: entry.variant } : {}),
      for_dark_background: entry.variant === 'Dark',
      ...(entry.color ? { color: entry.color } : {}),
      color_hex: entry.color
        ? NAMED_COLORS[entry.color.toLowerCase()]
        : AWS_CATEGORY_COLORS[entry.category],
      ...(params.resolve && iconsBaseDir ? { absolute_path: path.join(iconsBaseDir, entry.path) } : {}),
    })),
  };
}
