'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LayoutGrid, 
  List, 
  Search, 
  X, 
  MessagesSquare, 
  RadioTower, 
  Users, 
  Globe, 
  Folder, 
  ArrowUpDown, 
  Tag, 
  Sparkles,
  RotateCcw,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GROUP_TYPES, DEFAULT_LANGUAGES, SORT_OPTIONS } from '@/lib/constants';
import type { Category, Country, GroupLink } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type GroupListControlsProps = {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  selectedType: 'all' | 'group' | 'channel' | 'community';
  onTypeChange: (type: 'all' | 'group' | 'channel' | 'community') => void;
  sortBy: 'newest' | 'popular' | 'trending' | 'rating' | 'trust';
  onSortChange: (sort: 'newest' | 'popular' | 'trending' | 'rating' | 'trust') => void;
  categories: Category[];
  countries: Country[];
  groupsList?: GroupLink[];
  typeCounts?: {
    all: number;
    group: number;
    channel: number;
    community: number;
  };
  totalFilteredCount?: number;
  onResetFilters?: () => void;
  isLoadingFilters?: boolean;
};

export function GroupListControls({
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedCountry,
  onCountryChange,
  selectedLanguage,
  onLanguageChange,
  selectedType,
  onTypeChange,
  sortBy,
  onSortChange,
  categories,
  countries,
  groupsList = [],
  typeCounts,
  totalFilteredCount,
  onResetFilters,
  isLoadingFilters = false,
}: GroupListControlsProps) {
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);

  // Close autosuggest when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Compute live autosuggest results
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      return { groups: [], categories: [], countries: [], tags: [] };
    }

    // Matching groups (up to 4)
    const matchingGroups = groupsList
      .filter(g => 
        g.title.toLowerCase().includes(q) || 
        g.description.toLowerCase().includes(q)
      )
      .slice(0, 4);

    // Matching categories (up to 3)
    const matchingCategories = categories
      .filter(c => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q))
      .slice(0, 3);

    // Matching countries (up to 3)
    const matchingCountries = countries
      .filter(c => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q))
      .slice(0, 3);

    // Matching tags (extract unique tags from groupsList)
    const tagSet = new Set<string>();
    groupsList.forEach(g => {
      g.tags?.forEach(t => {
        if (t.toLowerCase().includes(q)) {
          tagSet.add(t);
        }
      });
    });
    const matchingTags = Array.from(tagSet).slice(0, 5);

    return {
      groups: matchingGroups,
      categories: matchingCategories,
      countries: matchingCountries,
      tags: matchingTags,
    };
  }, [searchQuery, groupsList, categories, countries]);

  const hasSuggestions = 
    suggestions.groups.length > 0 || 
    suggestions.categories.length > 0 || 
    suggestions.countries.length > 0 || 
    suggestions.tags.length > 0;

  const hasActiveFilters = 
    searchQuery.trim() !== '' ||
    selectedCountry !== 'all' ||
    selectedCategory !== 'all' ||
    selectedLanguage !== 'all' ||
    selectedType !== 'all' ||
    sortBy !== 'newest';

  const selectedCountryLabel = countries.find(c => c.value === selectedCountry)?.label || selectedCountry;
  const selectedCategoryLabel = categories.find(c => c.value === selectedCategory)?.label || selectedCategory;
  const selectedLanguageLabel = DEFAULT_LANGUAGES.find(l => l.value === selectedLanguage)?.label || selectedLanguage;
  const selectedSortLabel = SORT_OPTIONS.find(s => s.value === sortBy)?.label || sortBy;

  return (
    <div className="mb-8 flex flex-col gap-5">
      {/* 1. Quick Toggle Tabs at Top */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 p-1 bg-muted/80 dark:bg-muted/40 rounded-xl border border-border/60">
          {[
            { id: 'all', label: 'All', icon: null, count: typeCounts?.all },
            { id: 'group', label: 'Groups', icon: MessagesSquare, count: typeCounts?.group },
            { id: 'channel', label: 'Channels', icon: RadioTower, count: typeCounts?.channel },
            { id: 'community', label: 'Communities', icon: Users, count: typeCounts?.community },
          ].map(tab => {
            const isActive = selectedType === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTypeChange(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#25D366] text-white shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/25 text-white' : 'bg-background text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View mode toggle (desktop) */}
        <div className="hidden sm:flex items-center">
          <ToggleGroup 
            type="single" 
            value={view} 
            onValueChange={(value: 'grid' | 'list') => value && onViewChange(value)}
            aria-label="View mode"
            className="border rounded-lg bg-card p-0.5"
          >
            <ToggleGroupItem value="grid" aria-label="Grid View" className="h-9 w-9 p-0 data-[state=on]:bg-primary/10">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List View" className="h-9 w-9 p-0 data-[state=on]:bg-primary/10">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* 2. Instant Live Search Bar with Autosuggest */}
      <div ref={searchContainerRef} className="relative w-full">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, topic, country, tag or keywords (e.g. crypto, gaming, UK)..."
            className="w-full rounded-full bg-card py-6 pl-12 pr-12 shadow-sm text-sm md:text-base border-border/80 focus-visible:ring-2 focus-visible:ring-[#25D366]"
            value={searchQuery}
            onFocus={() => setIsSuggestOpen(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsSuggestOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsSuggestOpen(false);
              }
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                setIsSuggestOpen(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>

        {/* Autosuggest Dropdown Popover */}
        {isSuggestOpen && searchQuery.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden p-3 transition-all animate-in fade-in-50 zoom-in-95">
            {hasSuggestions ? (
              <div className="flex flex-col gap-3">
                {/* Matching Groups */}
                {suggestions.groups.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                      <span>Matching Groups</span>
                      <span className="text-[10px] text-muted-foreground/80">Press to view</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {suggestions.groups.map(group => (
                        <div
                          key={group.id}
                          onClick={() => {
                            setIsSuggestOpen(false);
                            router.push(`/group/invite/${group.id}`);
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/60 cursor-pointer transition-colors"
                        >
                          <Avatar className="h-9 w-9 flex-shrink-0 border">
                            <AvatarImage src={group.imageUrl} alt={group.title} />
                            <AvatarFallback>
                              <MessagesSquare className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground">{group.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{group.category} • {group.country.toUpperCase()}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                            {group.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching Categories & Countries */}
                {(suggestions.categories.length > 0 || suggestions.countries.length > 0) && (
                  <div className="border-t pt-2.5">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                      Filter Suggestions
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {suggestions.categories.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            onCategoryChange(cat.value);
                            setIsSuggestOpen(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Folder className="h-3 w-3" />
                          <span>Category: <strong>{cat.label}</strong></span>
                        </button>
                      ))}
                      {suggestions.countries.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            onCountryChange(c.value);
                            setIsSuggestOpen(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Globe className="h-3 w-3" />
                          <span>Country: <strong>{c.label}</strong></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching Tags */}
                {suggestions.tags.length > 0 && (
                  <div className="border-t pt-2.5">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                      Popular Matching Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {suggestions.tags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            onSearchChange(tag);
                            setIsSuggestOpen(false);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Tag className="h-3 w-3" />
                          <span>#{tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No instant suggestions for &quot;{searchQuery}&quot;. Press enter to filter full list.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Filter Controls Grid: Country, Category, Language, Sort */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Country Filter */}
        <Select value={selectedCountry} onValueChange={onCountryChange} disabled={isLoadingFilters}>
          <SelectTrigger className="w-full rounded-xl bg-card shadow-sm h-11 text-xs sm:text-sm">
            <div className="flex items-center gap-2 truncate">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Country" />
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(country => (
              <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={onCategoryChange} disabled={isLoadingFilters}>
          <SelectTrigger className="w-full rounded-xl bg-card shadow-sm h-11 text-xs sm:text-sm">
            <div className="flex items-center gap-2 truncate">
              <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Category" />
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language Filter */}
        <Select value={selectedLanguage} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-full rounded-xl bg-card shadow-sm h-11 text-xs sm:text-sm">
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm">🌐</span>
              <SelectValue placeholder="Language" />
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {DEFAULT_LANGUAGES.map(lang => (
              <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sorting Dropdown */}
        <Select value={sortBy} onValueChange={(val: any) => onSortChange(val)}>
          <SelectTrigger className="w-full rounded-xl bg-card shadow-sm h-11 text-xs sm:text-sm">
            <div className="flex items-center gap-2 truncate">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Sort By" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4. Active Filters Bar & Reset Action */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-xs text-muted-foreground border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">Active Filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 rounded-full px-2.5 py-0.5">
                Search: &quot;{searchQuery}&quot;
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => onSearchChange('')} />
              </Badge>
            )}
            {selectedType !== 'all' && (
              <Badge variant="secondary" className="gap-1 rounded-full px-2.5 py-0.5 capitalize">
                Type: {selectedType}
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => onTypeChange('all')} />
              </Badge>
            )}
            {selectedCountry !== 'all' && (
              <Badge variant="secondary" className="gap-1 rounded-full px-2.5 py-0.5">
                Country: {selectedCountryLabel}
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => onCountryChange('all')} />
              </Badge>
            )}
            {selectedCategory !== 'all' && (
              <Badge variant="secondary" className="gap-1 rounded-full px-2.5 py-0.5">
                Category: {selectedCategoryLabel}
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => onCategoryChange('all')} />
              </Badge>
            )}
            {selectedLanguage !== 'all' && (
              <Badge variant="secondary" className="gap-1 rounded-full px-2.5 py-0.5">
                Language: {selectedLanguageLabel}
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => onLanguageChange('all')} />
              </Badge>
            )}
            {sortBy !== 'newest' && (
              <Badge variant="secondary" className="gap-1 rounded-full px-2.5 py-0.5">
                Sort: {selectedSortLabel}
                <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => onSortChange('newest')} />
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {typeof totalFilteredCount === 'number' && (
              <span className="text-muted-foreground font-medium">
                {totalFilteredCount} {totalFilteredCount === 1 ? 'result' : 'results'}
              </span>
            )}
            {onResetFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2"
              >
                <RotateCcw className="h-3 w-3" />
                Reset all
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
