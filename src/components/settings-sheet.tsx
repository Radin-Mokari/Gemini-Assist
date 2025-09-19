"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Settings, Mic, Video } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "./ui/separator";

type SettingsSheetProps = {
  devices: {
    audio: MediaDeviceInfo[];
    video: MediaDeviceInfo[];
  };
  selectedAudioDevice: string;
  setSelectedAudioDevice: (deviceId: string) => void;
};

export function SettingsSheet({ devices, selectedAudioDevice, setSelectedAudioDevice }: SettingsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Customize your capture settings. Changes will apply on the next capture start.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          <div className="grid gap-3">
            <Label htmlFor="audio-source" className="flex items-center">
              <Mic className="inline-block mr-2 h-4 w-4" />
              Audio Input
            </Label>
            <Select
              value={selectedAudioDevice}
              onValueChange={setSelectedAudioDevice}
            >
              <SelectTrigger id="audio-source">
                <SelectValue placeholder="Select an audio source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Microphone</SelectItem>
                <Separator />
                {devices.audio.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${devices.audio.indexOf(device) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="resolution" className="flex items-center">
              <Video className="inline-block mr-2 h-4 w-4" />
              Screen Resolution
            </Label>
            <Select defaultValue="auto" disabled>
                <SelectTrigger id="resolution">
                    <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="auto">Auto (Recommended)</SelectItem>
                    <SelectItem value="1080p" disabled>1080p (Full HD)</SelectItem>
                    <SelectItem value="720p" disabled>720p (HD)</SelectItem>
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Resolution is automatically determined by your browser and screen for best performance.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
