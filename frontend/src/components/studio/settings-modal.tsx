"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Zap, CheckCircle2, XCircle } from "lucide-react";

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [runpodUrl, setRunpodUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("RUNPOD_URL");
    if (saved) setRunpodUrl(saved);
  }, []);

  const handleSave = () => {
    // Basic formatting: remove trailing slash
    const formatted = runpodUrl.replace(/\/$/, "");
    localStorage.setItem("RUNPOD_URL", formatted);
    setRunpodUrl(formatted);
    setIsOpen(false);
    // Ideally, trigger a context update or window reload if needed
    window.location.reload();
  };

  const testConnection = async () => {
    setIsTesting(true);
    setStatus("idle");
    try {
      // Simple ping to ComfyUI (usually /system_stats or /object_info exists)
      // Note: You might need a Next.js API proxy to avoid CORS if hitting RunPod directly
      const res = await fetch("/api/proxy-test", {
        method: "POST",
        body: JSON.stringify({ url: runpodUrl }),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch (e) {
      setStatus("error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      {/* Trigger Button (Put this in your Sidebar) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="text-zinc-500 hover:text-white"
        title="GPU Settings"
      >
        <Settings size={20} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="text-[#D2FF44]" size={20} /> GPU Connection
            </DialogTitle>
            <DialogDescription>
              Connect to your ComfyUI instance running on RunPod or Localhost.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ComfyUI API URL</Label>
              <div className="flex gap-2">
                <Input
                  value={runpodUrl}
                  onChange={(e) => setRunpodUrl(e.target.value)}
                  placeholder="https://your-pod-id-8188.proxy.runpod.net"
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                />
                <Button
                  onClick={testConnection}
                  disabled={!runpodUrl || isTesting}
                  variant="outline"
                  className="border-zinc-700"
                >
                  {isTesting ? "..." : "Test"}
                </Button>
              </div>
              {status === "success" && (
                <p className="text-xs text-[#D2FF44] flex items-center gap-1">
                  <CheckCircle2 size={12} /> Connected Successfully
                </p>
              )}
              {status === "error" && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <XCircle size={12} /> Connection Failed
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSave}
              className="bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b]"
            >
              Save Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
