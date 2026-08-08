'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Code, Image as ImageIcon, Save, Eye, Sparkles, Loader2, Info, Clock, Layers } from 'lucide-react';
import type { AdSettings, AdSlotConfig, AdType } from '@/lib/ad-types';
import { saveAdSettings } from '@/lib/ad-actions';
import { AdSlot } from '../ads/ad-slot';

type AdminAdsSettingsProps = {
  initialSettings: AdSettings;
  onSettingsChange?: (newSettings: AdSettings) => void;
};

export function AdminAdsSettings({ initialSettings, onSettingsChange }: AdminAdsSettingsProps) {
  const { toast } = useToast();
  const [isSaving, startTransition] = useTransition();
  const [adSettings, setAdSettings] = useState<AdSettings>(initialSettings);
  const [selectedCategory, setSelectedCategory] = useState<string>('header');

  const handleGlobalToggle = (enabled: boolean) => {
    setAdSettings((prev) => ({
      ...prev,
      globalEnabled: enabled,
    }));
  };

  const handleSlotChange = (slotId: string, updates: Partial<AdSlotConfig>) => {
    setAdSettings((prev) => ({
      ...prev,
      slots: {
        ...prev.slots,
        [slotId]: {
          ...prev.slots[slotId],
          ...updates,
        },
      },
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveAdSettings(adSettings);
      toast({
        title: res.success ? 'Settings Saved' : 'Save Error',
        description: res.message,
        variant: res.success ? 'default' : 'destructive',
      });
      if (res.success && onSettingsChange) {
        onSettingsChange(adSettings);
      }
    });
  };

  const slotGroups: Record<string, { label: string; slotIds: string[] }> = {
    header: {
      label: 'Header & Home',
      slotIds: ['header_top', 'home_above_list', 'home_in_feed'],
    },
    detail: {
      label: 'Group Detail Views',
      slotIds: ['group_detail_top', 'group_detail_bottom'],
    },
    sidebar_footer: {
      label: 'Sidebar & Footer',
      slotIds: ['sidebar', 'footer_top'],
    },
    popups: {
      label: 'Popups & Floating',
      slotIds: ['sticky_bottom', 'popup_modal'],
    },
  };

  return (
    <div className="space-y-6">
      {/* Master Control Card */}
      <Card className="border-emerald-500/30 bg-card shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-xl font-bold">Ads Management System</CardTitle>
            </div>
            <CardDescription>
              Manage ad networks (AdSense, PropellerAds, PopAds, Ezoic) and custom image banners site-wide.
            </CardDescription>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border">
              <Label htmlFor="global-ads-switch" className="text-xs font-semibold cursor-pointer">
                {adSettings.globalEnabled ? 'ALL ADS ACTIVE' : 'ALL ADS OFF'}
              </Label>
              <Switch
                id="global-ads-switch"
                checked={adSettings.globalEnabled}
                onCheckedChange={handleGlobalToggle}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Ads Config
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for Ad Placement Groups */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted/80">
          {Object.entries(slotGroups).map(([key, group]) => (
            <TabsTrigger key={key} value={key} className="text-xs sm:text-sm py-2">
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(slotGroups).map(([groupKey, group]) => (
          <TabsContent key={groupKey} value={groupKey} className="space-y-6 mt-6">
            {group.slotIds.map((slotId) => {
              const slot = adSettings.slots[slotId];
              if (!slot) return null;

              return (
                <Card key={slotId} className={`transition-all ${slot.enabled ? 'border-border' : 'border-dashed opacity-75'}`}>
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold">{slot.name}</CardTitle>
                          <Badge variant={slot.enabled ? 'default' : 'outline'} className={slot.enabled ? 'bg-emerald-600' : ''}>
                            {slot.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {slot.id}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">{slot.description}</CardDescription>
                      </div>

                      <div className="flex items-center gap-3 pt-2 sm:pt-0">
                        <Label htmlFor={`switch-${slotId}`} className="text-xs font-medium cursor-pointer">
                          Enable Placement
                        </Label>
                        <Switch
                          id={`switch-${slotId}`}
                          checked={slot.enabled}
                          onCheckedChange={(enabled) => handleSlotChange(slotId, { enabled })}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-5">
                    {/* Controls Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Ad Type Selector */}
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block">Ad Type</Label>
                        <Select
                          value={slot.type}
                          onValueChange={(val: AdType) => handleSlotChange(slotId, { type: val })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="code">
                              <div className="flex items-center gap-2">
                                <Code className="h-3.5 w-3.5 text-blue-500" />
                                <span>Ad Network Script / HTML (AdSense, etc.)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="banner">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-3.5 w-3.5 text-purple-500" />
                                <span>Custom Banner Image & Link</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Show Label Badge */}
                      <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/10">
                        <div>
                          <Label className="text-xs font-semibold block">"ADVERTISEMENT" Badge</Label>
                          <span className="text-[10px] text-muted-foreground">Show subtle text above ad</span>
                        </div>
                        <Switch
                          checked={slot.showLabel}
                          onCheckedChange={(showLabel) => handleSlotChange(slotId, { showLabel })}
                        />
                      </div>

                      {/* Special Field for Specific Placements */}
                      {slotId === 'popup_modal' && (
                        <div>
                          <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            Popup Delay (Seconds)
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            max="60"
                            value={slot.popupDelaySeconds || 5}
                            onChange={(e) =>
                              handleSlotChange(slotId, { popupDelaySeconds: parseInt(e.target.value) || 5 })
                            }
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                      )}

                      {slotId === 'home_in_feed' && (
                        <div>
                          <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-emerald-500" />
                            In-Feed Card Frequency
                          </Label>
                          <Input
                            type="number"
                            min="2"
                            max="20"
                            value={slot.inFeedInterval || 6}
                            onChange={(e) =>
                              handleSlotChange(slotId, { inFeedInterval: parseInt(e.target.value) || 6 })
                            }
                            className="h-9 text-xs font-mono"
                            placeholder="Insert ad every N items"
                          />
                        </div>
                      )}
                    </div>

                    {/* Content Fields */}
                    {slot.type === 'code' ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <Code className="h-4 w-4 text-emerald-500" />
                          Ad Network HTML / JavaScript Code Snippet
                        </Label>
                        <Textarea
                          value={slot.code}
                          onChange={(e) => handleSlotChange(slotId, { code: e.target.value })}
                          placeholder="Paste Google AdSense <ins> tag, PropellerAds script, Popunder code, iFrame, or custom HTML here..."
                          rows={4}
                          className="font-mono text-xs bg-slate-950 text-emerald-400 border-slate-800 focus:border-emerald-500"
                        />
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Supports Google AdSense, Media.net, PropellerAds, Ezoic, PopAds, or direct HTML/JS.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs font-semibold mb-1 block">Banner Image URL</Label>
                          <Input
                            type="url"
                            value={slot.bannerUrl}
                            onChange={(e) => handleSlotChange(slotId, { bannerUrl: e.target.value })}
                            placeholder="https://example.com/banner.png"
                            className="text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold mb-1 block">Target Destination Link</Label>
                          <Input
                            type="url"
                            value={slot.bannerLink}
                            onChange={(e) => handleSlotChange(slotId, { bannerLink: e.target.value })}
                            placeholder="https://example.com/landing-page"
                            className="text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold mb-1 block">Banner Alt Text</Label>
                          <Input
                            type="text"
                            value={slot.bannerAlt}
                            onChange={(e) => handleSlotChange(slotId, { bannerAlt: e.target.value })}
                            placeholder="Promote your WhatsApp group link"
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Live Preview Container */}
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Live Slot Preview
                        </span>
                      </div>

                      <div className="p-4 border rounded-lg bg-muted/30 flex items-center justify-center min-h-[100px]">
                        {slot.enabled ? (
                          <div className="w-full">
                            <AdSlot placement={slotId} adSettings={adSettings} />
                          </div>
                        ) : (
                          <div className="text-center py-4 text-xs text-muted-foreground italic">
                            This ad slot is currently disabled. Toggle "Enable Placement" to activate it.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
