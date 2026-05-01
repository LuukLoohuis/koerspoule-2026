import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useSubpoules, useSubpouleMembers } from "@/hooks/useSubpoules";
import PelotonChat from "@/components/PelotonChat";
import SubpouleStandings from "@/components/SubpouleStandings";
import { Copy, LogOut, Trash2, Users, Crown, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SubpouleManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { subpoules, isLoading, create, join, leave, remove, removeMember } = useSubpoules(game?.id);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const active = useMemo(
    () => subpoules.find((s) => s.id === activeId) ?? subpoules[0] ?? null,
    [subpoules, activeId]
  );
  const { data: members = [] } = useSubpouleMembers(active?.id);

  const handleCreate = async () => {
    if (!game?.id) return;
    try {
      const id = await create.mutateAsync({ name: createName, code: createCode });
      toast({ title: "Subpoule aangemaakt", description: createName });
      setCreateName(""); setCreateCode("");
      setActiveId(id);
    } catch (e) {
      toast({ title: "Aanmaken mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    try {
      const id = await join.mutateAsync({ code: joinCode });
      toast({ title: "Welkom in de subpoule!" });
      setJoinCode("");
      setActiveId(id);
    } catch (e) {
      toast({ title: "Joinen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleLeave = async (id: string) => {
    if (!confirm("Subpoule verlaten?")) return;
    try {
      await leave.mutateAsync({ subpouleId: id });
      toast({ title: "Subpoule verlaten" });
      if (activeId === id) setActiveId(null);
    } catch (e) {
      toast({ title: "Verlaten mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Subpoule definitief verwijderen? Dit kan niet ongedaan worden.")) return;
    try {
      await remove.mutateAsync({ subpouleId: id });
      toast({ title: "Subpoule verwijderd" });
      if (activeId === id) setActiveId(null);
    } catch (e) {
      toast({ title: "Verwijderen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (subpouleId: string, userId: string, name: string) => {
    if (!confirm(`${name} verwijderen uit de subpoule?`)) return;
    try {
      await removeMember.mutateAsync({ subpouleId, userId });
      toast({ title: "Lid verwijderd" });
    } catch (e) {
      toast({ title: "Verwijderen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code gekopieerd", description: code });
  };

  if (!user) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Log in om subpoules te beheren.</div>;
  }
  if (!game) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Geen actieve koers gevonden.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Subpoule lijst */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Mijn subpoules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Laden…</div>
          ) : subpoules.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Je zit nog in geen enkele subpoule. Maak er een aan of join met een code.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {subpoules.map((sp) => {
                const isActive = active?.id === sp.id;
                return (
                  <div
                    key={sp.id}
                    className={cn(
                      "p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-secondary/30 transition-colors",
                      isActive && "bg-primary/5"
                    )}
                    onClick={() => setActiveId(sp.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold">{sp.name}</span>
                        {sp.is_owner && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Crown className="h-3 w-3" /> Eigenaar
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{sp.member_count} leden</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
                        Code: {sp.code}
                        <button
                          onClick={(e) => { e.stopPropagation(); copyCode(sp.code); }}
                          className="hover:text-foreground"
                          title="Kopieer code"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {sp.is_owner ? (
                        <Button
                          variant="ghost" size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDelete(sp.id); }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost" size="sm"
                          onClick={(e) => { e.stopPropagation(); handleLeave(sp.id); }}
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aanmaken / Joinen */}
      <Card className="retro-border">
        <CardContent className="p-4">
          <Tabs defaultValue="create">
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1">Nieuwe subpoule</TabsTrigger>
              <TabsTrigger value="join" className="flex-1">Joinen via code</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="space-y-3 pt-4">
              <div>
                <Label htmlFor="sp-name">Naam</Label>
                <Input id="sp-name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Bijv. Vrienden van Jan" />
              </div>
              <div>
                <Label htmlFor="sp-code">Toegangscode</Label>
                <Input id="sp-code" value={createCode} onChange={(e) => setCreateCode(e.target.value)} placeholder="Min. 4 tekens" />
              </div>
              <Button onClick={handleCreate} disabled={create.isPending || !createName.trim() || !createCode.trim()} className="w-full">
                Subpoule aanmaken
              </Button>
            </TabsContent>
            <TabsContent value="join" className="space-y-3 pt-4">
              <div>
                <Label htmlFor="join-code">Toegangscode</Label>
                <Input id="join-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Vraag de eigenaar om de code" />
              </div>
              <Button onClick={handleJoin} disabled={join.isPending || !joinCode.trim()} className="w-full">
                Joinen
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Active subpoule details */}
      {active && (
        <>
          <Card className="retro-border">
            <CardHeader className="border-b-2 border-foreground bg-secondary/30">
              <CardTitle className="font-display flex items-center justify-between">
                <span>Leden — {active.name}</span>
                <Badge variant="outline">{members.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {members.map((m) => (
                  <div key={m.user_id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{m.display_name}</span>
                      {m.user_id === active.owner_user_id && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Crown className="h-3 w-3" /> Eigenaar
                        </Badge>
                      )}
                      {m.user_id === user.id && (
                        <Badge variant="outline" className="text-xs">jij</Badge>
                      )}
                    </div>
                    {active.is_owner && m.user_id !== active.owner_user_id && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleRemoveMember(active.id, m.user_id, m.display_name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <SubpouleStandings subpouleId={active.id} subpouleName={active.name} />

          <PelotonChat subpoolName={active.name} subpoolId={active.id} />
        </>
      )}
    </div>
  );
}
