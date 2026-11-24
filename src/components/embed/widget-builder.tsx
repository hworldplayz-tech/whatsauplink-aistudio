'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Code2, Copy, ExternalLink, Globe, LayoutGrid, List, Sparkles } from 'lucide-react';
import type { Category, Country } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface WidgetBuilderProps {
  categories: Category[];
  countries: Country[];
}

interface PreviewGroup {
  id: string;
  title: string;
  category: string;
  country: string;
  imageUrl: string;
  groupsorUrl: string;
  joinUrl: string;
}

export function WidgetBuilder({ categories, countries }: WidgetBuilderProps) {
  const [category, setCategory] = useState('all');
  const [country, setCountry] = useState('all');
  const [groupType, setGroupType] = useState('all');
  const [limit, setLimit] = useState('6');
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [title, setTitle] = useState('Latest WhatsApp Groups');
  const [keyword, setKeyword] = useState('');
  const [directJoin, setDirectJoin] = useState(false);

  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);
  const [previewGroups, setPreviewGroups] = useState<PreviewGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const apiQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (country !== 'all') params.set('country', country);
    if (groupType !== 'all') params.set('type', groupType);
    if (keyword.trim()) params.set('q', keyword.trim());
    params.set('limit', limit);
    return `https://www.groupsor.co.uk/api/public/groups?${params.toString()}`;
  }, [category, country, groupType, keyword, limit]);

  const relativeApiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (country !== 'all') params.set('country', country);
    if (groupType !== 'all') params.set('type', groupType);
    if (keyword.trim()) params.set('q', keyword.trim());
    params.set('limit', limit);
    return `/api/public/groups?${params.toString()}`;
  }, [category, country, groupType, keyword, limit]);

  const embedCode = useMemo(() => {
    const attrs: string[] = [
      `id="groupsor-widget"`,
      `data-category="${category}"`,
      `data-country="${country}"`,
    ];
    if (groupType !== 'all') attrs.push(`data-type="${groupType}"`);
    if (keyword.trim()) attrs.push(`data-q="${keyword.trim().replace(/"/g, '')}"`);
    attrs.push(`data-limit="${limit}"`);
    attrs.push(`data-theme="${theme}"`);
    if (layout !== 'list') attrs.push(`data-layout="${layout}"`);
    if (title.trim() && title.trim() !== 'Active WhatsApp Groups') {
      attrs.push(`data-title="${title.trim().replace(/"/g, '')}"`);
    }
    if (directJoin) attrs.push(`data-direct-join="true"`);

    return `<div ${attrs.join(' ')}></div>\n<script src="https://www.groupsor.co.uk/widget.js" async></script>`;
  }, [category, country, groupType, keyword, limit, theme, layout, title, directJoin]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(relativeApiUrl)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPreviewGroups(Array.isArray(data?.groups) ? data.groups : []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewGroups([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [relativeApiUrl]);

  const handleCopy = async (text: string, which: 'embed' | 'api') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'embed') {
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
      } else {
        setCopiedApi(true);
        setTimeout(() => setCopiedApi(false), 2000);
      }
    } catch {
      // Clipboard fallback not needed in modern browsers
    }
  };

  const previewIsDark = theme === 'dark';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Configuration Controls */}
      <Card className="lg:col-span-5 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Code2 className="h-5 w-5 text-[#25D366]" />
            Customize Your Widget
          </CardTitle>
          <CardDescription>
            Choose filters and style, then paste the 2-line code into any blog, cricket site, or HTML sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="widget-title">Widget Heading</Label>
            <Input
              id="widget-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Latest WhatsApp Groups"
              maxLength={60}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={groupType} onValueChange={setGroupType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="group">Groups</SelectItem>
                  <SelectItem value="channel">Channels</SelectItem>
                  <SelectItem value="community">Communities</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Groups Count</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 Groups</SelectItem>
                  <SelectItem value="6">6 Groups</SelectItem>
                  <SelectItem value="8">8 Groups</SelectItem>
                  <SelectItem value="10">10 Groups</SelectItem>
                  <SelectItem value="12">12 Groups</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'auto')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (OS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Layout</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={layout === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLayout('list')}
                  className={layout === 'list' ? 'bg-[#25D366] hover:bg-[#1ebe5d] text-white' : ''}
                >
                  <List className="h-4 w-4 mr-1.5" />
                  Sidebar
                </Button>
                <Button
                  type="button"
                  variant={layout === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLayout('grid')}
                  className={layout === 'grid' ? 'bg-[#25D366] hover:bg-[#1ebe5d] text-white' : ''}
                >
                  <LayoutGrid className="h-4 w-4 mr-1.5" />
                  Grid
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="widget-keyword">Keyword Filter (optional)</Label>
              <Input
                id="widget-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. cricket, jobs, crypto"
                maxLength={40}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/40">
            <div className="space-y-0.5 pr-3">
              <Label htmlFor="direct-join" className="text-sm font-medium">
                Direct WhatsApp Join Button
              </Label>
              <p className="text-xs text-muted-foreground">
                Off (recommended): Join opens your Groupsor group page. On: Join opens WhatsApp directly.
              </p>
            </div>
            <Switch id="direct-join" checked={directJoin} onCheckedChange={setDirectJoin} />
          </div>
        </CardContent>
      </Card>

      {/* Right: Live Preview + Copy Code */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-[#25D366]" />
                Live Widget Preview
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Zero CSS conflicts (Shadow DOM)
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`rounded-xl border overflow-hidden transition-colors ${
                previewIsDark
                  ? 'bg-[#111827] border-[#374151] text-[#f9fafb]'
                  : 'bg-white border-[#e5e7eb] text-[#111827]'
              }`}
            >
              {/* Header */}
              <div
                className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${
                  previewIsDark ? 'bg-[#1f2937] border-[#374151]' : 'bg-[#f9fafb] border-[#e5e7eb]'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] shrink-0" />
                  <span>{title.trim() || 'Active WhatsApp Groups'}</span>
                </div>
                <a
                  href={category !== 'all' ? `/category/${category}` : '/'}
                  target="_blank"
                  rel="noopener"
                  className="text-xs font-semibold text-[#128C7E] hover:underline"
                >
                  View All →
                </a>
              </div>

              {/* Body */}
              <div
                className={`p-3 ${
                  layout === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
                    : 'flex flex-col gap-2'
                }`}
              >
                {isLoading ? (
                  <div className="py-8 text-center text-sm opacity-70 col-span-full">
                    Loading live groups...
                  </div>
                ) : previewGroups.length === 0 ? (
                  <div className="py-8 text-center text-sm opacity-70 col-span-full">
                    No groups matched this filter yet.
                  </div>
                ) : (
                  previewGroups.map((g) => (
                    <div
                      key={g.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${
                        previewIsDark
                          ? 'bg-[#1f2937] border-[#374151]'
                          : 'bg-[#f9fafb] border-[#e5e7eb]'
                      }`}
                    >
                      <img
                        src={g.imageUrl || '/groupsor_logo.png'}
                        alt={g.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/groupsor_logo.png';
                        }}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-black/10"
                      />
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/group/invite/${g.id}`}
                          target="_blank"
                          rel="noopener"
                          className="block text-[13px] font-semibold truncate hover:underline"
                        >
                          {g.title}
                        </a>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] opacity-75">
                          <span
                            className={`px-1.5 py-0.5 rounded font-medium capitalize ${
                              previewIsDark ? 'bg-[#111827]' : 'bg-[#eef2f7]'
                            }`}
                          >
                            {g.category.replace(/-/g, ' ')}
                          </span>
                          {g.country && g.country !== 'other' && (
                            <span className="uppercase">{g.country}</span>
                          )}
                        </div>
                      </div>
                      <a
                        href={directJoin ? g.joinUrl : `/group/invite/${g.id}`}
                        target="_blank"
                        rel="noopener nofollow"
                        className="shrink-0 px-3 py-1.5 rounded-md bg-[#25D366] hover:opacity-90 text-white text-xs font-bold"
                      >
                        Join
                      </a>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Backlink */}
              <div
                className={`flex items-center justify-between gap-2 px-4 py-2.5 border-t text-[11px] ${
                  previewIsDark
                    ? 'bg-[#1f2937] border-[#374151] text-[#9ca3af]'
                    : 'bg-[#f9fafb] border-[#e5e7eb] text-[#6b7280]'
                }`}
              >
                <span>
                  Powered by{' '}
                  <a href="/" className="text-[#128C7E] font-semibold hover:underline">
                    Groupsor
                  </a>
                </span>
                <a href="/submit" className="text-[#128C7E] font-semibold hover:underline">
                  + Submit Group
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Embed Code Box */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">1. Embed Code (Any Website / WordPress / Blogger)</CardTitle>
            <CardDescription>
              Paste this HTML snippet wherever you want the widget to show (sidebar, footer, or post).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="p-3.5 rounded-lg bg-muted text-xs overflow-x-auto border font-mono leading-relaxed">
              {embedCode}
            </pre>
            <Button
              type="button"
              onClick={() => handleCopy(embedCode, 'embed')}
              className="bg-[#25D366] hover:bg-[#1ebe5d] text-white"
            >
              {copiedEmbed ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied Embed Code
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Embed Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Direct JSON API Box */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-4 w-4 text-[#128C7E]" />
              2. Direct JSON API Endpoint (For Custom Apps & React/Next.js)
            </CardTitle>
            <CardDescription>
              Public CORS-enabled, edge-cached JSON feed matching your filters above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input readOnly value={apiQueryUrl} className="font-mono text-xs" />
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopy(apiQueryUrl, 'api')}
                >
                  {copiedApi ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                  {copiedApi ? 'Copied' : 'Copy URL'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <a href={relativeApiUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Test
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
