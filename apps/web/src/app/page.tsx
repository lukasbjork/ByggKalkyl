import Link from "next/link";
import { FileText, Layers, FolderOpen } from "lucide-react";

import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { projectStatusLabel } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewProjectDialog } from "@/components/new-project-dialog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { dokument: true, takeoffItems: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projekt</h1>
          <p className="text-sm text-muted-foreground">
            Skapa projekt, ladda upp underlag och bygg kalkyl.
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Inga projekt ännu</p>
              <p className="text-sm text-muted-foreground">
                Skapa ditt första projekt för att komma igång.
              </p>
            </div>
            <NewProjectDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.namn}</CardTitle>
                    <Badge variant="secondary">{projectStatusLabel[p.status]}</Badge>
                  </div>
                  {p.kund && (
                    <p className="text-sm text-muted-foreground">{p.kund}</p>
                  )}
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {p._count.dokument} filer
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    {p._count.takeoffItems} poster
                  </span>
                  <span className="ml-auto text-xs">
                    {formatDateTime(p.createdAt)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
