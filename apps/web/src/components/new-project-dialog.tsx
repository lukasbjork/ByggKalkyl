"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NewProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [namn, setNamn] = useState("");
  const [kund, setKund] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namn, kund }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kunde inte skapa projektet");
      }
      const project = await res.json();
      setOpen(false);
      setNamn("");
      setKund("");
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nytt projekt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nytt projekt</DialogTitle>
            <DialogDescription>
              Skapa ett projekt och ladda sedan upp förfrågningsunderlag.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="namn">Projektnamn *</Label>
              <Input
                id="namn"
                value={namn}
                onChange={(e) => setNamn(e.target.value)}
                placeholder="t.ex. Ombyggnad kontor plan 2"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kund">Kund</Label>
              <Input
                id="kund"
                value={kund}
                onChange={(e) => setKund(e.target.value)}
                placeholder="t.ex. Fastighets AB Exempel"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading || namn.trim().length === 0}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Skapa projekt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
