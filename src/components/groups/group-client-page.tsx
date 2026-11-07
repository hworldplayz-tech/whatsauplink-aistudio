'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { GroupCard } from '@/components/groups/group-card';
import { GroupListControls } from '@/components/groups/group-list-controls';
import type { Category, Country, GroupLink, ModerationSettings } from '@/lib/data';
import type { AdSettings } from '@/lib/ad-types';
import { AdSlot } from '@/components/ads/ad-slot';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { RotateCcw } from 'lucide-react';

type GroupClientPageProps = {
    allGroups: GroupLink[];
    initialSettings: ModerationSettings;
    initialCategories: Category[];
    initialCountries: Country[];
    initialSearchQuery?: string;
    isLoading?: boolean; // Prop to indicate if data is loading server-side
    adSettings?: AdSettings;
};

export function GroupClientPage({
  allGroups,
  initialSettings,
  initialCategories,
  initialCountries,
  initialSearchQuery = '',
  isLoading: isInitiallyLoading = false,
  adSettings,
}: GroupClientPageProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'group' | 'channel' | 'community'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'trending' | 'rating' | 'trust'>('newest');
  
  const [visibleCount, setVisibleCount] = useState(initialSettings.groupsPerPage);

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [countries, setCountries] = useState<Country[]>(initialCountries);
  
  const [isLoading, setIsLoading] = useState(isInitiallyLoading);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('scrollPosition');
    if (savedScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition, 10));
        sessionStorage.removeItem('scrollPosition');
      }, 0);
    }
  }, []);

  const [groupsList, setGroupsList] = useState<GroupLink[]>(allGroups);

  // When allGroups prop updates, update state and turn off loading
  useEffect(() => {
    if (allGroups && allGroups.length > 0) {
      setGroupsList(allGroups);
      setIsLoading(false);
    }
  }, [allGroups]);

  // Client-side fallback: fetch active groups if initial allGroups was empty
  useEffect(() => {
    if (groupsList.length === 0) {
      let isMounted = true;
      setIsLoading(true);
      import('@/firebase/config').then(({ firebaseConfig }) => {
        import('firebase/app').then(({ initializeApp, getApps, getApp }) => {
          import('firebase/firestore').then(({ getFirestore, collection, getDocs, query, orderBy }) => {
            const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
            const db = getFirestore(app);
            const q = query(collection(db, 'groups'), orderBy('lastSubmittedAt', 'desc'));
            getDocs(q).then((snapshot) => {
              if (isMounted) {
                import('@/lib/data').then(({ mapDocToGroupLink }) => {
                  const fetched = snapshot.docs.map(doc => {
                    const group = mapDocToGroupLink(doc);
                    group.showClicks = initialSettings.showClicks;
                    return group;
                  });
                  setGroupsList(fetched);
                  setIsLoading(false);
                });
              }
            }).catch(err => {
              console.warn('Notice: Client-side group fetch fallback error:', err);
              if (isMounted) setIsLoading(false);
            });
          });
        });
      });
      return () => {
        isMounted = false;
      };
    }
  }, [groupsList.length, initialSettings.showClicks]);

  // Update categories and countries if they change
  useEffect(() => {
    setCategories(initialCategories);
    setCountries(initialCountries);
  }, [initialCategories, initialCountries]);

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
  };
  
  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + initialSettings.groupsPerPage);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCountry('all');
    setSelectedCategory('all');
    setSelectedLanguage('all');
    setSelectedType('all');
    setSortBy('newest');
  };

  // Live count for Quick Toggle Tabs
  const typeCounts = useMemo(() => {
    return {
      all: groupsList.length,
      group: groupsList.filter(g => (g.type || 'group') === 'group').length,
      channel: groupsList.filter(g => g.type === 'channel').length,
      community: groupsList.filter(g => g.type === 'community').length,
    };
  }, [groupsList]);

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    // 1. Filtering
    const searchLower = searchQuery.toLowerCase().trim();
    const filtered = groupsList.filter(group => {
      const searchMatch = !searchLower || 
        group.title.toLowerCase().includes(searchLower) || 
        group.description.toLowerCase().includes(searchLower) ||
        group.category.toLowerCase().includes(searchLower) ||
        group.country.toLowerCase().includes(searchLower) ||
        group.tags?.some(tag => tag.toLowerCase().includes(searchLower));

      const countryMatch = selectedCountry === 'all' || group.country === selectedCountry;
      const categoryMatch = selectedCategory === 'all' || group.category.toLowerCase() === selectedCategory.toLowerCase();
      const typeMatch = selectedType === 'all' || (group.type || 'group') === selectedType;
      const languageMatch = selectedLanguage === 'all' || (group.language || 'en') === selectedLanguage;

      return searchMatch && countryMatch && categoryMatch && typeMatch && languageMatch;
    });

    // 2. Sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.clicks ?? 0) - (a.clicks ?? 0);
      }

      if (sortBy === 'trending') {
        const now = Date.now();
        const aDate = a.lastSubmittedAt || a.createdAt;
        const bDate = b.lastSubmittedAt || b.createdAt;
        const aHours = aDate ? Math.max(1, (now - new Date(aDate).getTime()) / 3600000) : 1000;
        const bHours = bDate ? Math.max(1, (now - new Date(bDate).getTime()) / 3600000) : 1000;
        
        // Decay score: clicks + verified weight / age
        const aScore = ((a.clicks ?? 0) + (a.workingVotes ?? 0) * 4 + (a.isVerified ? 30 : 0)) / Math.pow(aHours + 2, 1.2);
        const bScore = ((b.clicks ?? 0) + (b.workingVotes ?? 0) * 4 + (b.isVerified ? 30 : 0)) / Math.pow(bHours + 2, 1.2);
        return bScore - aScore;
      }

      if (sortBy === 'rating') {
        const aAvg = (a.ratingCount ?? 0) > 0 ? (a.totalRating ?? 0) / (a.ratingCount ?? 0) : 0;
        const bAvg = (b.ratingCount ?? 0) > 0 ? (b.totalRating ?? 0) / (b.ratingCount ?? 0) : 0;
        if (bAvg !== aAvg) return bAvg - aAvg;
        return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
      }

      if (sortBy === 'trust') {
        const aTrust = (a.workingVotes ?? 0) - (a.brokenVotes ?? 0) + (a.isVerified ? 20 : 0);
        const bTrust = (b.workingVotes ?? 0) - (b.brokenVotes ?? 0) + (b.isVerified ? 20 : 0);
        return bTrust - aTrust;
      }

      // Default: 'newest'
      const aTime = a.lastSubmittedAt || a.createdAt;
      const bTime = b.lastSubmittedAt || b.createdAt;
      const aVal = aTime ? new Date(aTime).getTime() : 0;
      const bVal = bTime ? new Date(bTime).getTime() : 0;
      return bVal - aVal;
    });
  }, [groupsList, searchQuery, selectedCountry, selectedCategory, selectedType, selectedLanguage, sortBy]);

  const visibleGroups = useMemo(() => {
    return filteredAndSortedGroups.slice(0, visibleCount);
  }, [filteredAndSortedGroups, visibleCount]);

  const gridClass = view === 'grid' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4' : 'flex flex-col gap-6';

  return (
    <section className="container mx-auto py-8 md:py-12">
        <div className="mx-auto max-w-5xl">
        <GroupListControls 
            view={view}
            onViewChange={setView}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCountry={selectedCountry}
            onCountryChange={setSelectedCountry}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            sortBy={sortBy}
            onSortChange={setSortBy}
            categories={categories}
            countries={countries}
            groupsList={groupsList}
            typeCounts={typeCounts}
            totalFilteredCount={filteredAndSortedGroups.length}
            onResetFilters={handleResetFilters}
            isLoadingFilters={false}
        />

        {/* Ad Placement Above Groups List */}
        <AdSlot placement="home_above_list" adSettings={adSettings} className="my-6" />
        
        {isLoading ? (
            <div className={gridClass}>
                {Array.from({ length: initialSettings.groupsPerPage }).map((_, i) => (
                    <Skeleton key={i} className={view === 'grid' ? 'h-40' : 'h-48'} />
                ))}
            </div>
        ) : filteredAndSortedGroups.length === 0 ? (
             <div className="mt-12 text-center p-8 border border-dashed rounded-2xl bg-card/50">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <RotateCcw className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No groups match your search or filters</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Try clearing your search query or switching your category, country, or language filters.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters} 
                  className="mt-4 gap-2 rounded-full"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear all filters
                </Button>
            </div>
        ) : visibleGroups.length > 0 ? (
            <div className={gridClass}>
                {visibleGroups.map((group, index) => {
                  const inFeedInterval = adSettings?.slots.home_in_feed?.inFeedInterval || 6;
                  const showInFeedAd =
                    adSettings?.globalEnabled &&
                    adSettings?.slots.home_in_feed?.enabled &&
                    index > 0 &&
                    index % inFeedInterval === 0;

                  return (
                    <React.Fragment key={group.id}>
                      {showInFeedAd && (
                        <div className={view === 'grid' ? 'col-span-1 sm:col-span-2 lg:col-span-2 my-2' : 'w-full my-2'}>
                          <AdSlot placement="home_in_feed" adSettings={adSettings} />
                        </div>
                      )}
                      <GroupCard
                        group={group}
                        view={view}
                        onTagClick={handleTagClick}
                        showClicks={initialSettings.showClicks}
                        showRatings={initialSettings.showRatings}
                      />
                    </React.Fragment>
                  );
                })}
            </div>
        ) : null}

        {filteredAndSortedGroups.length > visibleCount && (
            <div className="mt-12 text-center">
                <Button onClick={handleLoadMore} size="lg" className="rounded-full px-8">
                    Load More Groups
                </Button>
            </div>
        )}
        </div>
    </section>
  );
}
