
'use client';

import React, { useState, useMemo, useLayoutEffect, useEffect } from 'react';
import { GroupCard } from '@/components/groups/group-card';
import { GroupListControls } from '@/components/groups/group-list-controls';
import type { Category, Country, GroupLink, ModerationSettings } from '@/lib/data';
import type { AdSettings } from '@/lib/ad-types';
import { AdSlot } from '@/components/ads/ad-slot';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

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
  isLoading: isInitiallyLoading = false, // Default to false
  adSettings,
}: GroupClientPageProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'group' | 'channel'>('all');
  
  const [visibleCount, setVisibleCount] = useState(initialSettings.groupsPerPage);

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [countries, setCountries] = useState<Country[]>(initialCountries);
  
  // Use a separate state for loading to avoid re-triggering skeletons on filter change
  const [isLoading, setIsLoading] = useState(isInitiallyLoading);

  // Restore scroll position on mount
  useLayoutEffect(() => {
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

  const filteredGroups = useMemo(() => {
    return groupsList.filter(group => {
      const searchLower = searchQuery.toLowerCase();
      const searchMatch = !searchQuery || 
        group.title.toLowerCase().includes(searchLower) || 
        group.description.toLowerCase().includes(searchLower) ||
        group.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      const countryMatch = selectedCountry === 'all' || group.country === selectedCountry;
      const categoryMatch = selectedCategory === 'all' || group.category.toLowerCase() === selectedCategory.toLowerCase();
      const typeMatch = selectedType === 'all' || group.type === selectedType;
      return searchMatch && countryMatch && categoryMatch && typeMatch;
    });
  }, [groupsList, searchQuery, selectedCountry, selectedCategory, selectedType]);

  const visibleGroups = useMemo(() => {
    return filteredGroups.slice(0, visibleCount);
  }, [filteredGroups, visibleCount]);

  const gridClass = view === 'grid' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4' : 'flex flex-col gap-6';

  return (
    <section className="container py-8 md:py-12">
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
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            categories={categories}
            countries={countries}
            isLoadingFilters={false} // Data is now pre-loaded
        />

        {/* Ad Placement Above Groups List */}
        <AdSlot placement="home_above_list" adSettings={adSettings} className="my-6" />
        
        {isLoading ? (
            <div className={gridClass}>
                {Array.from({ length: initialSettings.groupsPerPage }).map((_, i) => (
                    <Skeleton key={i} className={view === 'grid' ? 'h-40' : 'h-48'} />
                ))}
            </div>
        ) : allGroups.length === 0 ? ( // Check initial `allGroups` first
             <div className="mt-16 text-center text-muted-foreground">
                <h3 className="text-xl font-semibold">No groups found</h3>
                <p>Try adjusting your filters or submit a new group!</p>
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
        ) : (
            <div className="mt-16 text-center text-muted-foreground">
                <h3 className="text-xl font-semibold">No groups found</h3>
                <p>Try adjusting your filters or submit a new group!</p>
            </div>
        )}

        {filteredGroups.length > visibleCount && (
            <div className="mt-12 text-center">
                <Button onClick={handleLoadMore} size="lg">
                    Load More Groups
                </Button>
            </div>
        )}
        </div>
    </section>
  );
}
