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
import { Settings, Zap, Server, Check, X, Loader2, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // You might not have this, so I'll use a styled span or standard div if needed, but standard divs are safer if I don't check for Badge component availability. I'll use standard Tailwind.

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("COMFY_API_URL");
      setUrl(saved || "http://127.0.0.1:8188");
    }
  }, []);

  const handleTest = async () => {
    setStatus("testing");
    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
  };

  const handleSave = () => {
    const cleanUrl = url.replace(/\/$/, "");
    localStorage.setItem("COMFY_API_URL", cleanUrl);
    setIsOpen(false);
    window.location.reload();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
        title="Settings"
      >
        <Settings size={14} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white sm:max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <DialogHeader className="pb-4 border-b border-zinc-900">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Settings className="text-zinc-500" size={20} />
              <span>Studio Settings</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Configure global engine preferences and connections.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {/* SECTION: AI ENGINE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cpu size={14} className="text-[#D2FF44]" /> Video Generation Engine
                </Label>

                {/* STATUS BADGE */}
                {status !== "idle" && (
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${status === 'success' ? 'bg-[#D2FF44]/10 text-[#D2FF44] border border-[#D2FF44]/20' :
                      status === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        'bg-zinc-800 text-zinc-400'
                    }`}>
                    {status === 'testing' && <Loader2 size={10} className="animate-spin" />}
                    {status === 'success' && <Check size={10} />}
                    {status === 'error' && <X size={10} />}
                    <span className="uppercase">
                      {status === 'testing' ? 'Testing...' : status === 'success' ? 'Connected' : 'Connection Failed'}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">ComfyUI Endpoint</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                      <Input
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          setStatus("idle");
                        }}
                        className="bg-black border-zinc-800 pl-9 font-mono text-xs focus-visible:ring-[#D2FF44]"
                        placeholder="http://127.0.0.1:8188"
                      />
                    </div>
                    <Button
                      onClick={handleTest}
                      disabled={status === "testing" || !url}
                      variant="secondary"
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                    >
                      Test
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    The Wan Video generation model requires a running ComfyUI instance.
                    Ensure your backend is reachable from this client.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-900 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
